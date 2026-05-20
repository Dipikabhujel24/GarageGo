using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace Backend.Services;

public class CustomerReportsService
{
    private readonly AppDbContext _context;

    public CustomerReportsService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<RegularCustomerReportDto>> GetRegularCustomersAsync(CancellationToken ct = default)
    {
        var customers = await _context.CustomerProfiles
            .Include(customer => customer.User)
            .AsNoTracking()
            .ToListAsync(ct);

        var sales = await _context.Sales.AsNoTracking().ToListAsync(ct);
        var appointments = await _context.Appointments.AsNoTracking().ToListAsync(ct);
        var histories = await _context.ServiceHistories.AsNoTracking().ToListAsync(ct);

        var report = customers
            .Select(customer =>
            {
                var customerSales = sales.Where(sale => sale.CustomerId == customer.Id).ToList();
                var totalOrders = customerSales.Count;
                var serviceVisits = appointments.Count(a => a.CustomerId == customer.Id)
                    + histories.Count(h => h.CustomerId == customer.Id && h.HistoryType == HistoryTypes.Service);

                return new RegularCustomerReportDto
                {
                    CustomerId = customer.Id,
                    Name = customer.Name,
                    Phone = customer.Phone,
                    Email = customer.User?.Email ?? customer.LegacyEmail,
                    TotalOrders = totalOrders,
                    TotalVisits = totalOrders + serviceVisits,
                    LastPurchaseDate = customerSales.Count > 0
                        ? customerSales.Max(sale => sale.Date)
                        : null,
                    TotalSpent = customerSales.Sum(sale => sale.FinalAmount)
                };
            })
            .Where(row => row.TotalOrders > 0 || row.TotalVisits > 1)
            .OrderByDescending(row => row.TotalOrders)
            .ThenByDescending(row => row.TotalVisits)
            .ThenBy(row => row.Name)
            .ToList();

        return report;
    }

    public async Task<List<HighSpenderReportDto>> GetHighSpendersAsync(CancellationToken ct = default)
    {
        var sales = await _context.Sales.AsNoTracking().ToListAsync(ct);
        if (sales.Count == 0)
        {
            return new List<HighSpenderReportDto>();
        }

        var customers = await _context.CustomerProfiles
            .Include(customer => customer.User)
            .AsNoTracking()
            .ToListAsync(ct);

        return customers
            .Select(customer =>
            {
                var customerSales = sales.Where(sale => sale.CustomerId == customer.Id).ToList();
                return new HighSpenderReportDto
                {
                    CustomerId = customer.Id,
                    Name = customer.Name,
                    Phone = customer.Phone,
                    Email = customer.User?.Email ?? customer.LegacyEmail,
                    TotalSpent = customerSales.Sum(sale => sale.FinalAmount),
                    TotalPurchases = customerSales.Count,
                    LoyaltyPoints = customer.LoyaltyPoints
                };
            })
            .Where(row => row.TotalSpent > 0)
            .OrderByDescending(row => row.TotalSpent)
            .ThenBy(row => row.Name)
            .ToList();
    }

    public async Task<List<PendingCreditReportDto>> GetPendingCreditsAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var overdueCutoff = now.AddDays(-30);

        var openSales = await _context.Sales
            .AsNoTracking()
            .Where(sale => sale.RemainingAmount > 0)
            .OrderBy(sale => sale.DueDate)
            .ToListAsync(ct);

        if (openSales.Count == 0)
        {
            return new List<PendingCreditReportDto>();
        }

        var customerIds = openSales.Select(sale => sale.CustomerId).Distinct().ToList();
        var customers = await _context.CustomerProfiles
            .Include(customer => customer.User)
            .AsNoTracking()
            .Where(customer => customerIds.Contains(customer.Id))
            .ToDictionaryAsync(customer => customer.Id, ct);

        return openSales
            .Select(sale =>
            {
                customers.TryGetValue(sale.CustomerId, out var customer);
                var invoiceNumber = string.IsNullOrWhiteSpace(sale.InvoiceNumber)
                    ? SalesService.FormatSaleInvoiceNumber(sale.Id)
                    : sale.InvoiceNumber;
                var daysOverdue = sale.DueDate.HasValue
                    ? Math.Max(0, (int)(now - sale.DueDate.Value).TotalDays)
                    : 0;

                return new PendingCreditReportDto
                {
                    SaleId = sale.Id,
                    CustomerId = sale.CustomerId,
                    CustomerName = customer?.Name ?? $"Customer #{sale.CustomerId}",
                    Phone = customer?.Phone ?? string.Empty,
                    Email = customer?.User?.Email ?? customer?.LegacyEmail ?? string.Empty,
                    InvoiceNumber = invoiceNumber,
                    RemainingAmount = sale.RemainingAmount,
                    DueDate = sale.DueDate,
                    DaysOverdue = daysOverdue,
                    PaymentStatus = sale.PaymentStatus,
                    ReminderCount = sale.ReminderCount,
                    IsOverdue = sale.DueDate.HasValue && sale.DueDate < overdueCutoff
                };
            })
            .OrderByDescending(row => row.IsOverdue)
            .ThenByDescending(row => row.DaysOverdue)
            .ThenByDescending(row => row.RemainingAmount)
            .ToList();
    }

    public async Task<CustomerReportsSummaryDto> GetSummaryAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var overdueCutoff = now.AddDays(-30);

        var openSales = await _context.Sales
            .AsNoTracking()
            .Where(sale => sale.RemainingAmount > 0)
            .ToListAsync(ct);

        var topCustomer = await _context.Sales
            .AsNoTracking()
            .GroupBy(sale => sale.CustomerId)
            .Select(group => new { CustomerId = group.Key, Total = group.Sum(sale => sale.FinalAmount) })
            .OrderByDescending(entry => entry.Total)
            .FirstOrDefaultAsync(ct);

        string? topCustomerName = null;
        if (topCustomer != null)
        {
            topCustomerName = await _context.CustomerProfiles
                .AsNoTracking()
                .Where(customer => customer.Id == topCustomer.CustomerId)
                .Select(customer => customer.Name)
                .FirstOrDefaultAsync(ct);
        }

        return new CustomerReportsSummaryDto
        {
            TotalPendingCredit = openSales.Sum(sale => sale.RemainingAmount),
            TotalCreditInvoices = openSales.Count,
            TotalOverdueCustomers = openSales
                .Where(sale => sale.DueDate.HasValue && sale.DueDate < overdueCutoff)
                .Select(sale => sale.CustomerId)
                .Distinct()
                .Count(),
            TopCustomerName = topCustomerName,
            MonthlyRevenue = await _context.Sales
                .AsNoTracking()
                .Where(sale => sale.Date >= monthStart && sale.Date < monthStart.AddMonths(1))
                .SumAsync(sale => sale.FinalAmount, ct)
        };
    }

    public static string BuildPendingCreditsCsv(IEnumerable<PendingCreditReportDto> rows)
    {
        var builder = new StringBuilder();
        builder.AppendLine("SaleId,CustomerId,CustomerName,Phone,Email,InvoiceNumber,RemainingAmount,DueDate,DaysOverdue,PaymentStatus,ReminderCount,IsOverdue");

        foreach (var row in rows)
        {
            builder.AppendLine(string.Join(',',
                row.SaleId,
                row.CustomerId,
                EscapeCsv(row.CustomerName),
                EscapeCsv(row.Phone),
                EscapeCsv(row.Email),
                EscapeCsv(row.InvoiceNumber),
                row.RemainingAmount.ToString("0.00"),
                row.DueDate?.ToString("yyyy-MM-dd") ?? "",
                row.DaysOverdue,
                EscapeCsv(row.PaymentStatus),
                row.ReminderCount,
                row.IsOverdue));
        }

        return builder.ToString();
    }

    private static string EscapeCsv(string value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return "";
        }

        return value.Contains(',') || value.Contains('"')
            ? $"\"{value.Replace("\"", "\"\"")}\""
            : value;
    }
}
