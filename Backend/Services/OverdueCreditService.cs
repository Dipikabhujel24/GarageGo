using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Backend.Services;

/// <summary>
/// Finds open credit/partial sales past due and sends reminders.
/// Primary source of truth is <see cref="Sale"/> (not legacy service-history-only rows).
/// </summary>
public class OverdueCreditService
{
    private readonly AppDbContext _db;
    private readonly EmailService _email;
    private readonly NotificationService _notifications;
    private readonly ILogger<OverdueCreditService> _logger;

    public OverdueCreditService(
        AppDbContext db,
        EmailService email,
        NotificationService notifications,
        ILogger<OverdueCreditService> logger)
    {
        _db = db;
        _email = email;
        _notifications = notifications;
        _logger = logger;
    }

    public async Task<OverdueCreditRunResult> ProcessOverdueSalesAsync(CancellationToken ct = default)
    {
        var result = new OverdueCreditRunResult();
        var now = DateTime.UtcNow;
        var overdueCutoff = now.AddDays(-30);

        var overdueSales = await _db.Sales
            .Include(sale => sale.Items)
            .Where(sale =>
                sale.RemainingAmount > 0
                && sale.DueDate != null
                && sale.DueDate < overdueCutoff
                && (sale.PaymentStatus == PaymentStatuses.Credit || sale.PaymentStatus == PaymentStatuses.Partial))
            .ToListAsync(ct);

        foreach (var sale in overdueSales)
        {
            try
            {
                var customer = await _db.CustomerProfiles
                    .Include(profile => profile.User)
                    .AsNoTracking()
                    .FirstOrDefaultAsync(profile => profile.Id == sale.CustomerId, ct);

                if (customer is null)
                {
                    result.Errors.Add($"Sale {sale.Id}: customer not found.");
                    continue;
                }

                var email = customer.User?.Email ?? customer.LegacyEmail;
                var customerName = customer.Name;
                var invoiceNumber = string.IsNullOrWhiteSpace(sale.InvoiceNumber)
                    ? SalesService.FormatSaleInvoiceNumber(sale.Id)
                    : sale.InvoiceNumber;

                if (_email.IsConfigured() && !string.IsNullOrWhiteSpace(email))
                {
                    await _email.SendPaymentReminderAsync(
                        email.Trim(),
                        invoiceNumber,
                        sale.RemainingAmount,
                        sale.DueDate);
                    result.EmailsSent++;
                    result.EmailsSentTo.Add(email.Trim());
                }
                else if (string.IsNullOrWhiteSpace(email))
                {
                    result.Errors.Add($"Sale {sale.Id}: customer has no email.");
                }

                if (customer.UserId.HasValue)
                {
                    await _notifications.NotifySalePaymentReminderAsync(
                        sale,
                        customer.UserId.Value,
                        customerName,
                        ct);
                }

                sale.LastReminderSentAt = now;
                sale.ReminderCount += 1;

                var history = await _db.ServiceHistories
                    .FirstOrDefaultAsync(h => h.RelatedSaleId == sale.Id, ct);

                if (history != null)
                {
                    history.ReminderSentAt = now;
                }

                result.Processed++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Overdue reminder failed for sale {SaleId}", sale.Id);
                result.Errors.Add($"Sale {sale.Id}: {ex.Message}");
            }
        }

        if (overdueSales.Count > 0)
        {
            await _db.SaveChangesAsync(ct);
        }

        return result;
    }
}

public class OverdueCreditRunResult
{
    public int Processed { get; set; }
    public int EmailsSent { get; set; }
    public List<string> EmailsSentTo { get; set; } = new();
    public List<string> Errors { get; set; } = new();
}
