using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin,Staff,Sales Staff,Inventory Staff,Store Keeper,Cashier,Service Advisor,Mechanic / Technician,Purchase Officer,Accountant,Customer Support,Branch Manager,Receptionist")]
    public class SalesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly EmailService _emailService;
        private readonly InvoiceService _invoiceService;
        private readonly NotificationService _notificationService;
        private readonly IConfiguration _configuration;

        public SalesController(
            AppDbContext context,
            EmailService emailService,
            InvoiceService invoiceService,
            NotificationService notificationService,
            IConfiguration configuration)
        {
            _context = context;
            _emailService = emailService;
            _invoiceService = invoiceService;
            _notificationService = notificationService;
            _configuration = configuration;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetSales()
        {
            var sales = await _context.Sales
                .AsNoTracking()
                .OrderByDescending(sale => sale.Date)
                .Select(sale => new
                {
                    sale.Id,
                    sale.CustomerId,
                    sale.Date,
                    sale.TotalAmount,
                    sale.DiscountAmount,
                    sale.FinalAmount,
                    sale.LoyaltyDiscountApplied,
                    Items = sale.Items.Select(item => new
                    {
                        item.PartId,
                        item.Quantity,
                        item.Price
                    }).ToList()
                })
                .ToListAsync();

            return Ok(sales);
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<object>> GetSaleById(int id)
        {
            var sale = await LoadSaleResponseAsync(id);
            if (sale is null)
            {
                return NotFound(new { message = "Sale not found." });
            }

            return Ok(sale);
        }

        [HttpGet("customer/{customerId:int}")]
        public async Task<ActionResult<IEnumerable<object>>> GetCustomerSales(int customerId)
        {
            var sales = await _context.Sales
                .AsNoTracking()
                .Where(sale => sale.CustomerId == customerId)
                .OrderByDescending(sale => sale.Date)
                .Select(sale => new
                {
                    sale.Id,
                    sale.Date,
                    sale.TotalAmount,
                    sale.DiscountAmount,
                    sale.FinalAmount,
                    sale.LoyaltyDiscountApplied
                })
                .ToListAsync();

            return Ok(sales);
        }

        [HttpGet("catalog")]
        public async Task<ActionResult<SalesCatalogDto>> GetCatalog()
        {
            var catalog = new SalesCatalogDto
            {
                Parts = await _context.Parts
                    .AsNoTracking()
                    .Include(part => part.Vendor)
                    .OrderBy(part => part.PartName)
                    .Select(part => new SalesCatalogPartDto
                    {
                        Id = part.Id,
                        PartName = part.PartName,
                        Category = part.Category,
                        Price = part.Price,
                        Quantity = part.Quantity,
                        VendorName = part.Vendor == null ? string.Empty : part.Vendor.VendorName
                    })
                    .ToListAsync(),
                Customers = await _context.CustomerProfiles
                    .AsNoTracking()
                    .OrderBy(customer => customer.Name)
                    .Select(customer => new SalesCatalogCustomerDto
                    {
                        Id = customer.Id,
                        Name = customer.Name,
                        Email = customer.LegacyEmail,
                        Phone = customer.Phone
                    })
                    .ToListAsync()
            };

            return Ok(catalog);
        }

        [HttpPost]
        public async Task<ActionResult<SaleInvoiceDto>> CreateSale([FromBody] CreateSaleDto dto)
        {
            if (dto.Items == null || dto.Items.Count == 0)
            {
                return BadRequest(new { message = "Add at least one part before saving the sale." });
            }

            var customerExists = await _context.CustomerProfiles.AnyAsync(customer => customer.Id == dto.CustomerId);
            if (!customerExists)
            {
                return NotFound(new { message = $"Customer with ID {dto.CustomerId} was not found." });
            }

            var requestedPartIds = dto.Items.Select(item => item.PartId).Distinct().ToList();
            var parts = await _context.Parts
                .Include(part => part.Vendor)
                .Where(part => requestedPartIds.Contains(part.Id))
                .ToListAsync();

            var partsById = parts.ToDictionary(part => part.Id);
            var missingPartIds = requestedPartIds.Where(partId => !partsById.ContainsKey(partId)).ToList();
            if (missingPartIds.Count > 0)
            {
                return NotFound(new { message = $"Part(s) not found: {string.Join(", ", missingPartIds)}" });
            }

            var normalizedItems = dto.Items
                .GroupBy(item => item.PartId)
                .Select(group =>
                {
                    var first = group.First();
                    var part = partsById[group.Key];
                    var unitPrice = first.Price > 0 ? first.Price : part.Price;
                    return new
                    {
                        PartId = group.Key,
                        Quantity = group.Sum(item => item.Quantity),
                        Price = unitPrice
                    };
                })
                .ToList();

            foreach (var item in normalizedItems)
            {
                if (item.Quantity <= 0)
                {
                    return BadRequest(new { message = "Each part quantity must be greater than zero." });
                }

                var part = partsById[item.PartId];
                if (part.Quantity < item.Quantity)
                {
                    return BadRequest(new { message = $"Not enough stock for {part.PartName} (ID {part.Id}). Available: {part.Quantity}." });
                }
            }

            await using var transaction = await _context.Database.BeginTransactionAsync();

            var sale = new Sale
            {
                CustomerId = dto.CustomerId,
                Date = DateTime.UtcNow
            };

            foreach (var item in normalizedItems)
            {
                var part = partsById[item.PartId];
                part.Quantity -= item.Quantity;

                sale.Items.Add(new SaleItem
                {
                    PartId = part.Id,
                    Quantity = item.Quantity,
                    Price = item.Price
                });
            }

            sale.TotalAmount = sale.Items.Sum(item => item.Quantity * item.Price);
            ApplyLoyaltyPricing(sale);

            _context.Sales.Add(sale);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            foreach (var item in normalizedItems)
            {
                await _notificationService.HandlePartStockChangedAsync(item.PartId, _emailService);
            }

            await AwardLoyaltyPointsAsync(dto.CustomerId, sale.FinalAmount);

            return Ok(BuildInvoice(sale, partsById));
        }

        [HttpPost("send-email")]
        public async Task<IActionResult> SendInvoiceEmail([FromBody] SendInvoiceEmailDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Email))
            {
                return BadRequest(new { message = "Recipient email is required." });
            }

            Sale? saleEntity = null;
            if (dto.SaleId.HasValue && dto.SaleId.Value > 0)
            {
                saleEntity = await _context.Sales
                    .Include(sale => sale.Items)
                    .FirstOrDefaultAsync(sale => sale.Id == dto.SaleId.Value);
            }
            else if (dto.Invoice?.SaleId > 0)
            {
                saleEntity = await _context.Sales
                    .Include(sale => sale.Items)
                    .FirstOrDefaultAsync(sale => sale.Id == dto.Invoice.SaleId);
            }
            else
            {
                saleEntity = await _context.Sales
                    .Include(sale => sale.Items)
                    .OrderByDescending(sale => sale.Id)
                    .FirstOrDefaultAsync();
            }

            if (saleEntity is null)
            {
                return BadRequest(new { message = "No sale found to email." });
            }

            var partIds = saleEntity.Items.Select(item => item.PartId).Distinct().ToList();
            var partsById = await _context.Parts
                .AsNoTracking()
                .Where(part => partIds.Contains(part.Id))
                .ToDictionaryAsync(part => part.Id, part => part);

            var pdfModel = BuildPdfModel(saleEntity, partsById);
            var pdfBytes = _invoiceService.GenerateInvoicePdf(pdfModel);

            var body = $@"
<h2 style='color:#0F172A;'>GarageGo Invoice</h2>
<p>Dear Customer,</p>
<p>Thank you for choosing <strong>GarageGo</strong>.</p>
<p>Your invoice has been successfully generated and is attached with this email.</p>
<p><strong>Invoice Details:</strong></p>
<ul>
    <li>Invoice ID: {saleEntity.Id}</li>
    <li>Customer ID: {saleEntity.CustomerId}</li>
    <li>Date: {saleEntity.Date:yyyy-MM-dd}</li>
    <li>Subtotal: Rs {saleEntity.TotalAmount:0.00}</li>
    <li>Discount: Rs {saleEntity.DiscountAmount:0.00}</li>
    <li>Final Amount: Rs {saleEntity.FinalAmount:0.00}</li>
</ul>
<p>Best regards,<br/><strong>GarageGo Team</strong></p>";

            try
            {
                await _emailService.SendEmailWithAttachmentAsync(
                    dto.Email.Trim(),
                    "GarageGo Invoice",
                    body,
                    pdfBytes,
                    $"Invoice-{saleEntity.Id}.pdf");
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Email failed: {ex.Message}" });
            }

            return Ok(new { message = "Email with invoice sent successfully." });
        }

        private static void ApplyLoyaltyPricing(Sale sale)
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

        private async Task AwardLoyaltyPointsAsync(int customerId, decimal finalAmount)
        {
            try
            {
                var customer = await _context.CustomerProfiles.FindAsync(customerId);
                if (customer is null)
                {
                    return;
                }

                var perAmount = 100m;
                if (decimal.TryParse(_configuration["Loyalty:PointsPerAmount"], out var cfgPerAmount))
                {
                    perAmount = cfgPerAmount;
                }

                var pointsEarned = (int)Math.Floor(finalAmount / perAmount);
                if (pointsEarned <= 0)
                {
                    return;
                }

                var previous = customer.LoyaltyPoints;
                customer.LoyaltyPoints += pointsEarned;
                await _context.SaveChangesAsync();

                var threshold = 100;
                if (int.TryParse(_configuration["Loyalty:NotifyThreshold"], out var cfgThreshold))
                {
                    threshold = cfgThreshold;
                }

                if (previous < threshold
                    && customer.LoyaltyPoints >= threshold
                    && customer.LastLoyaltyNotifiedAt == null
                    && !string.IsNullOrWhiteSpace(customer.LegacyEmail)
                    && _emailService.IsConfigured())
                {
                    var subject = "Congratulations — Loyalty Reward Unlocked";
                    var body = $"Dear {customer.Name},<br/><br/>You've earned {customer.LoyaltyPoints} loyalty points and reached a reward milestone! Thank you for being a valued customer.<br/><br/>— GarageGo";
                    await _emailService.SendEmailAsync(customer.LegacyEmail.Trim(), subject, body);
                    customer.LastLoyaltyNotifiedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }
            }
            catch
            {
                // Do not fail the sale if loyalty email fails.
            }
        }

        private async Task<object?> LoadSaleResponseAsync(int id)
        {
            var sale = await _context.Sales
                .AsNoTracking()
                .Include(s => s.Items)
                .FirstOrDefaultAsync(s => s.Id == id);

            if (sale is null)
            {
                return null;
            }

            var partIds = sale.Items.Select(item => item.PartId).Distinct().ToList();
            var partsById = await _context.Parts
                .AsNoTracking()
                .Where(part => partIds.Contains(part.Id))
                .ToDictionaryAsync(part => part.Id, part => part);

            return new
            {
                sale.Id,
                sale.CustomerId,
                sale.Date,
                sale.TotalAmount,
                sale.DiscountAmount,
                sale.FinalAmount,
                sale.LoyaltyDiscountApplied,
                Items = sale.Items.Select(item =>
                {
                    partsById.TryGetValue(item.PartId, out var part);
                    return new
                    {
                        item.PartId,
                        PartName = part?.PartName ?? $"Part {item.PartId}",
                        item.Quantity,
                        item.Price,
                        LineTotal = item.Quantity * item.Price
                    };
                }).ToList()
            };
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

        private static InvoicePdfModel BuildPdfModel(Sale sale, IReadOnlyDictionary<int, Part> partsById)
        {
            return new InvoicePdfModel
            {
                SaleId = sale.Id,
                CustomerId = sale.CustomerId,
                Date = sale.Date,
                TotalAmount = sale.TotalAmount,
                DiscountAmount = sale.DiscountAmount,
                FinalAmount = sale.FinalAmount,
                LoyaltyDiscountApplied = sale.LoyaltyDiscountApplied,
                Items = sale.Items.Select(item =>
                {
                    partsById.TryGetValue(item.PartId, out var part);
                    return new InvoicePdfItem
                    {
                        PartId = item.PartId,
                        PartName = part?.PartName ?? $"Part {item.PartId}",
                        Quantity = item.Quantity,
                        Price = item.Price
                    };
                }).ToList()
            };
        }
    }
}
