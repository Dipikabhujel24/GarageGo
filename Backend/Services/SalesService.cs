using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Backend.Services;

/// <summary>
/// Handles staff sales checkout. Each completed sale is mirrored into
/// <see cref="ServiceHistory"/> so the customer History page stays in sync with Sales.
/// </summary>
public class SalesService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SalesService> _logger;

    public SalesService(
        AppDbContext context,
        IConfiguration configuration,
        ILogger<SalesService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<SaleInvoiceDto> CreateSaleAsync(CreateSaleDto dto, CancellationToken cancellationToken = default)
    {
        if (dto.Items == null || dto.Items.Count == 0)
        {
            throw new InvalidOperationException("Add at least one part before saving the sale.");
        }

        var customerExists = await _context.CustomerProfiles.AnyAsync(
            customer => customer.Id == dto.CustomerId,
            cancellationToken);

        if (!customerExists)
        {
            throw new KeyNotFoundException($"Customer with ID {dto.CustomerId} was not found.");
        }

        if (dto.VehicleId.HasValue)
        {
            var vehicleValid = await _context.CustomerVehicles.AnyAsync(
                vehicle => vehicle.Id == dto.VehicleId.Value && vehicle.CustomerId == dto.CustomerId,
                cancellationToken);

            if (!vehicleValid)
            {
                throw new InvalidOperationException("Selected vehicle does not belong to this customer.");
            }
        }

        var requestedPartIds = dto.Items.Select(item => item.PartId).Distinct().ToList();
        var parts = await _context.Parts
            .Include(part => part.Vendor)
            .Where(part => requestedPartIds.Contains(part.Id))
            .ToListAsync(cancellationToken);

        var partsById = parts.ToDictionary(part => part.Id);
        var missingPartIds = requestedPartIds.Where(partId => !partsById.ContainsKey(partId)).ToList();
        if (missingPartIds.Count > 0)
        {
            throw new KeyNotFoundException($"Part(s) not found: {string.Join(", ", missingPartIds)}");
        }

        var normalizedItems = dto.Items
            .GroupBy(item => item.PartId)
            .Select(group =>
            {
                var first = group.First();
                var part = partsById[group.Key];
                var unitPrice = first.Price > 0 ? first.Price : part.Price;
                return new NormalizedSaleLine(
                    group.Key,
                    group.Sum(item => item.Quantity),
                    unitPrice,
                    part);
            })
            .ToList();

        foreach (var item in normalizedItems)
        {
            if (item.Quantity <= 0)
            {
                throw new InvalidOperationException("Each part quantity must be greater than zero.");
            }

            if (item.Part.Quantity < item.Quantity)
            {
                throw new InvalidOperationException(
                    $"Not enough stock for {item.Part.PartName} (ID {item.Part.Id}). Available: {item.Part.Quantity}.");
            }
        }

        var paymentStatus = PaymentStatuses.Normalize(dto.PaymentStatus);

        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            var sale = new Sale
            {
                CustomerId = dto.CustomerId,
                Date = DateTime.UtcNow
            };

            foreach (var item in normalizedItems)
            {
                item.Part.Quantity -= item.Quantity;
                sale.Items.Add(new SaleItem
                {
                    PartId = item.Part.Id,
                    Quantity = item.Quantity,
                    Price = item.Price
                });
            }

            sale.TotalAmount = sale.Items.Sum(item => item.Quantity * item.Price);
            ApplyLoyaltyPricing(sale);
            ApplyPaymentTerms(sale, dto, paymentStatus);

            _context.Sales.Add(sale);
            await _context.SaveChangesAsync(cancellationToken);

            sale.InvoiceNumber = FormatSaleInvoiceNumber(sale.Id);

            var purchaseHistory = BuildPurchaseServiceHistory(
                sale,
                normalizedItems,
                sale.InvoiceNumber,
                dto.VehicleId,
                sale.PaymentStatus);

            _context.ServiceHistories.Add(purchaseHistory);

            var customer = await _context.CustomerProfiles
                .FirstAsync(profile => profile.Id == dto.CustomerId, cancellationToken);

            AwardLoyaltyPoints(customer, sale.FinalAmount);

            await _context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            _logger.LogInformation(
                "Sale {SaleId} completed for customer {CustomerId}; purchase history {HistoryId} created.",
                sale.Id,
                sale.CustomerId,
                purchaseHistory.Id);

            return BuildInvoice(sale, partsById);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(cancellationToken);
            _logger.LogError(ex, "Sale checkout rolled back for customer {CustomerId}.", dto.CustomerId);
            throw;
        }
    }

    /// <summary>
    /// Sets PaidAmount, RemainingAmount, and DueDate from payment status.
    /// </summary>
    internal static void ApplyPaymentTerms(Sale sale, CreateSaleDto dto, string paymentStatus)
    {
        sale.PaymentStatus = paymentStatus;

        if (paymentStatus == PaymentStatuses.Paid)
        {
            sale.PaidAmount = sale.FinalAmount;
            sale.RemainingAmount = 0;
            sale.DueDate = dto.DueDate?.ToUniversalTime();
            return;
        }

        if (!dto.DueDate.HasValue)
        {
            throw new InvalidOperationException("Due date is required for credit or partial payment invoices.");
        }

        sale.DueDate = dto.DueDate.Value.ToUniversalTime();

        if (paymentStatus == PaymentStatuses.Credit)
        {
            sale.PaidAmount = 0;
            sale.RemainingAmount = sale.FinalAmount;
            return;
        }

        if (paymentStatus == PaymentStatuses.Partial)
        {
            var paid = dto.PaidAmount ?? 0;
            if (paid < 0)
            {
                throw new InvalidOperationException("Paid amount cannot be negative.");
            }

            if (paid > sale.FinalAmount)
            {
                throw new InvalidOperationException("Paid amount cannot exceed invoice total.");
            }

            sale.PaidAmount = paid;
            sale.RemainingAmount = sale.FinalAmount - paid;
        }
    }

    internal static ServiceHistory BuildPurchaseServiceHistory(
        Sale sale,
        IReadOnlyList<NormalizedSaleLine> lines,
        string invoiceNumber,
        int? vehicleId,
        string paymentStatus)
    {
        var description = BuildItemSummaryDescription(lines);
        var discountNote = sale.LoyaltyDiscountApplied
            ? $" Loyalty discount applied: Rs {sale.DiscountAmount:0.00}."
            : string.Empty;

        return new ServiceHistory
        {
            CustomerId = sale.CustomerId,
            VehicleId = vehicleId,
            HistoryType = HistoryTypes.Purchase,
            Title = $"Purchase Invoice #{invoiceNumber}",
            Description = $"{description}.{discountNote}".Trim(),
            Amount = sale.FinalAmount,
            PaymentStatus = paymentStatus,
            InvoiceNumber = invoiceNumber,
            RelatedSaleId = sale.Id,
            ServiceDate = sale.Date
        };
    }

    internal static string BuildItemSummaryDescription(IReadOnlyList<NormalizedSaleLine> lines)
    {
        var summary = string.Join(", ", lines.Select(line => $"{line.Part.PartName} x{line.Quantity}"));
        const int maxLength = 1000;
        return summary.Length <= maxLength ? summary : summary[..(maxLength - 3)] + "...";
    }

    public static string FormatSaleInvoiceNumber(int saleId) => $"INV-{saleId:D4}";

    internal static void ApplyLoyaltyPricing(Sale sale)
    {
        if (sale.TotalAmount > 5000)
        {
            sale.LoyaltyDiscountApplied = true;
            sale.DiscountAmount = sale.TotalAmount * 0.10m;
        }
        else
        {
            sale.LoyaltyDiscountApplied = false;
            sale.DiscountAmount = 0;
        }

        sale.FinalAmount = sale.TotalAmount - sale.DiscountAmount;
    }

    private void AwardLoyaltyPoints(CustomerProfile customer, decimal finalAmount)
    {
        var perAmount = 100m;
        if (decimal.TryParse(_configuration["Loyalty:PointsPerAmount"], out var cfgPerAmount))
        {
            perAmount = cfgPerAmount;
        }

        var pointsEarned = (int)Math.Floor(finalAmount / perAmount);
        if (pointsEarned > 0)
        {
            customer.LoyaltyPoints += pointsEarned;
        }
    }

    private static SaleInvoiceDto BuildInvoice(Sale sale, IReadOnlyDictionary<int, Part> partsById)
    {
        return new SaleInvoiceDto
        {
            SaleId = sale.Id,
            CustomerId = sale.CustomerId,
            Date = sale.Date,
            TotalAmount = sale.TotalAmount,
            DiscountAmount = sale.DiscountAmount,
            FinalAmount = sale.FinalAmount,
            LoyaltyDiscountApplied = sale.LoyaltyDiscountApplied,
            LoyaltyPointsEarned = (int)(sale.FinalAmount / 100m),
            InvoiceNumber = sale.InvoiceNumber,
            PaymentStatus = sale.PaymentStatus,
            PaidAmount = sale.PaidAmount,
            RemainingAmount = sale.RemainingAmount,
            DueDate = sale.DueDate,
            Items = sale.Items.Select(item =>
            {
                partsById.TryGetValue(item.PartId, out var part);
                return new SaleInvoiceItemDto
                {
                    PartId = item.PartId,
                    PartName = part?.PartName ?? $"Part {item.PartId}",
                    Quantity = item.Quantity,
                    Price = item.Price,
                    LineTotal = item.Quantity * item.Price
                };
            }).ToList()
        };
    }

    internal sealed record NormalizedSaleLine(int PartId, int Quantity, decimal Price, Part Part);
}
