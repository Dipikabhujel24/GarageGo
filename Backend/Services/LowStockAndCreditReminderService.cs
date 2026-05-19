using Backend.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using System.Threading;
using System.Threading.Tasks;
using System;
using System.Linq;

namespace Backend.Services;

public class LowStockAndCreditReminderService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<LowStockAndCreditReminderService> _logger;
    private readonly IConfiguration _configuration;

    public LowStockAndCreditReminderService(
        IServiceScopeFactory scopeFactory,
        ILogger<LowStockAndCreditReminderService> logger,
        IConfiguration configuration)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _configuration = configuration;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var intervalMinutes = 1440; // default once per day
        if (int.TryParse(_configuration["Notifications:IntervalMinutes"], out var configured))
        {
            intervalMinutes = configured;
        }

        var delay = TimeSpan.FromMinutes(Math.Max(1, intervalMinutes));

        _logger.LogInformation("LowStockAndCreditReminderService started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var email = scope.ServiceProvider.GetRequiredService<EmailService>();

                await RunChecksAsync(db, email, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // graceful shutdown
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while running notifications worker.");
            }

            await Task.Delay(delay, stoppingToken);
        }
    }

    private async Task RunChecksAsync(AppDbContext db, EmailService email, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var threshold = 10;
        if (int.TryParse(_configuration["Notifications:LowStockThreshold"], out var cfgThreshold))
        {
            threshold = cfgThreshold;
        }

        var adminEmail = _configuration["Notifications:AdminEmail"] ?? _configuration["InitialAdmin:Email"];
        if (string.IsNullOrWhiteSpace(adminEmail))
        {
            _logger.LogWarning("No admin email configured for low-stock notifications.");
        }

        // Low stock notifications
        if (!string.IsNullOrWhiteSpace(adminEmail))
        {
            var lowParts = await db.Parts
                .Where(p => p.Quantity < threshold && p.LastLowStockNotifiedAt == null)
                .ToListAsync(ct);

            foreach (var part in lowParts)
            {
                try
                {
                    var subject = $"Low stock alert: {part.PartName}";
                    var body = $"Part <strong>{part.PartName}</strong> (ID {part.Id}) is low on stock ({part.Quantity} remaining).";
                    await email.SendEmailAsync(adminEmail, subject, body);
                    part.LastLowStockNotifiedAt = now;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Email send failed");
                }
            }

            if (lowParts.Count > 0)
            {
                await db.SaveChangesAsync(ct);
            }
        }

        // Overdue credit reminders (customers with payment status 'Credit' older than 1 month)
        var cutoff = now.AddMonths(-1);
        var overdue = await db.ServiceHistories
            .Include(h => h.Customer)
            .Where(h => h.PaymentStatus != null && h.PaymentStatus.ToLower() == "credit" && h.ReminderSentAt == null && h.ServiceDate <= cutoff)
            .ToListAsync(ct);

        foreach (var history in overdue)
        {
            try
            {
                var to = history.Customer?.LegacyEmail;
                if (string.IsNullOrWhiteSpace(to))
                {
                    continue;
                }

                var customer = history.Customer;
                var customerName = customer?.Name ?? "Customer";

                var subject = "Payment reminder: overdue balance";
                var body = $"Dear {customerName},<br/><br/>Our records show an outstanding balance of <strong>{history.Amount:C}</strong> from {history.ServiceDate:d} for '{history.Title}'. Please settle this at your earliest convenience.<br/><br/>Thank you.";
                await email.SendEmailAsync(to, subject, body);
                history.ReminderSentAt = now;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Email send failed");
            }
        }

        if (overdue.Count > 0)
        {
            await db.SaveChangesAsync(ct);
        }
    }
}
