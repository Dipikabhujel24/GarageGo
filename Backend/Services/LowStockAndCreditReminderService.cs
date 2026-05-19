using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;

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
        var intervalMinutes = 1440;
        if (int.TryParse(_configuration["Notifications:IntervalMinutes"], out var configured))
        {
            intervalMinutes = configured;
        }

        var delay = TimeSpan.FromMinutes(Math.Max(1, intervalMinutes));

        _logger.LogInformation("LowStockAndCreditReminderService started (interval {Minutes} min)", intervalMinutes);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var runner = scope.ServiceProvider.GetRequiredService<NotificationCheckRunner>();
                var result = await runner.RunOnceAsync(stoppingToken);
                _logger.LogInformation(
                    "Notification check complete: lowStock={LowStock}, overdueCredits={Overdue}, emails={Emails}",
                    result.LowStockProcessed,
                    result.OverdueCreditsProcessed,
                    result.CreditEmailsSent);
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
}
