using Backend.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Backend.Services;

public class NotificationCheckRunner
{
    private readonly AppDbContext _db;
    private readonly EmailService _email;
    private readonly NotificationService _notifications;
    private readonly OverdueCreditService _overdueCredits;
    private readonly ILogger<NotificationCheckRunner> _logger;

    public NotificationCheckRunner(
        AppDbContext db,
        EmailService email,
        NotificationService notifications,
        OverdueCreditService overdueCredits,
        ILogger<NotificationCheckRunner> logger)
    {
        _db = db;
        _email = email;
        _notifications = notifications;
        _overdueCredits = overdueCredits;
        _logger = logger;
    }

    public async Task<NotificationRunResult> RunOnceAsync(CancellationToken ct = default)
    {
        var result = new NotificationRunResult();
        var now = DateTime.UtcNow;
        var threshold = _notifications.GetLowStockThreshold();

        var replenished = await _db.Parts
            .Where(p => p.Quantity >= threshold && p.LastLowStockNotifiedAt != null)
            .ToListAsync(ct);

        foreach (var part in replenished)
        {
            part.LastLowStockNotifiedAt = null;
        }

        if (replenished.Count > 0)
        {
            await _db.SaveChangesAsync(ct);
            result.ReplenishedParts = replenished.Count;
        }

        var lowParts = await _db.Parts
            .Where(p => p.Quantity < threshold)
            .ToListAsync(ct);

        foreach (var part in lowParts)
        {
            try
            {
                await _notifications.NotifyLowStockAsync(part, _email, ct);
                result.LowStockProcessed++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Low stock notification failed for part {PartId}", part.Id);
                result.Errors.Add($"Low stock part {part.Id}: {ex.Message}");
            }
        }

        var saleOverdue = await _overdueCredits.ProcessOverdueSalesAsync(ct);
        result.OverdueCreditsProcessed += saleOverdue.Processed;
        result.CreditEmailsSent += saleOverdue.EmailsSent;
        result.EmailsSentTo.AddRange(saleOverdue.EmailsSentTo);
        result.Errors.AddRange(saleOverdue.Errors);

        var cutoff = now.AddMonths(-1);
        var overdueCandidates = await _db.ServiceHistories
            .Include(h => h.Customer)
            .Where(h =>
                h.RelatedSaleId == null
                && h.PaymentStatus != null
                && h.ReminderSentAt == null
                && h.ServiceDate <= cutoff)
            .ToListAsync(ct);

        var overdue = overdueCandidates
            .Where(h =>
                NotificationService.IsOverdueCreditStatus(h.PaymentStatus)
                && !NotificationService.IsPaidCreditStatus(h.PaymentStatus))
            .ToList();

        foreach (var history in overdue)
        {
            try
            {
                var to = history.Customer?.LegacyEmail;
                if (string.IsNullOrWhiteSpace(to))
                {
                    result.Errors.Add($"Service history {history.Id}: customer has no email.");
                    continue;
                }

                var customer = history.Customer;
                var customerName = customer?.Name ?? "Customer";
                var customerUserId = customer?.UserId;

                if (!_email.IsConfigured())
                {
                    result.Errors.Add("SMTP is not configured; emails were skipped.");
                }
                else
                {
                    var subject = "Payment reminder: overdue balance";
                    var body = $"Dear {customerName},<br/><br/>Our records show an outstanding balance of <strong>{history.Amount:C}</strong> from {history.ServiceDate:d} for '{history.Title}'. Please settle this at your earliest convenience.<br/><br/>Thank you.";
                    await _email.SendEmailAsync(to, subject, body);
                    result.CreditEmailsSent++;
                    result.EmailsSentTo.Add(to);
                }

                await _notifications.NotifyCreditReminderAsync(
                    history,
                    customerUserId,
                    customerName,
                    _email,
                    ct);

                history.ReminderSentAt = now;
                result.OverdueCreditsProcessed++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Credit reminder failed for service history {HistoryId}", history.Id);
                result.Errors.Add($"Service history {history.Id}: {ex.Message}");
            }
        }

        if (overdue.Count > 0)
        {
            await _db.SaveChangesAsync(ct);
        }

        result.AdminUnreadCount = await _db.AppNotifications.CountAsync(
            n => n.Audience == "Admin" && !n.IsDismissed && !n.IsRead,
            ct);

        return result;
    }
}

public class NotificationRunResult
{
    public int ReplenishedParts { get; set; }
    public int LowStockProcessed { get; set; }
    public int OverdueCreditsProcessed { get; set; }
    public int CreditEmailsSent { get; set; }
    public int AdminUnreadCount { get; set; }
    public List<string> Errors { get; set; } = new();
    public List<string> EmailsSentTo { get; set; } = new();
}
