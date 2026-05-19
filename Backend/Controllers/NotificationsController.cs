using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System.Security.Claims;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IConfiguration _config;
        private readonly NotificationCheckRunner _checkRunner;
        private readonly IWebHostEnvironment _environment;

        public NotificationsController(
            AppDbContext db,
            IConfiguration config,
            NotificationCheckRunner checkRunner,
            IWebHostEnvironment environment)
        {
            _db = db;
            _config = config;
            _checkRunner = checkRunner;
            _environment = environment;
        }

        [HttpGet("summary")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetSummary()
        {
            var threshold = GetThreshold();
            var now = DateTime.UtcNow;
            var creditCutoff = now.AddMonths(-1);

            var lowStockCount = await _db.Parts.CountAsync(p => p.Quantity < threshold);
            var overdueCandidates = await _db.ServiceHistories
                .Where(h => h.PaymentStatus != null && h.ServiceDate <= creditCutoff && h.ReminderSentAt == null)
                .Select(h => h.PaymentStatus)
                .ToListAsync();

            var overdueCredits = overdueCandidates.Count(status =>
                NotificationService.IsOverdueCreditStatus(status)
                && !NotificationService.IsPaidCreditStatus(status));

            var unreadCount = await _db.AppNotifications.CountAsync(n =>
                n.Audience == "Admin" && !n.IsDismissed && !n.IsRead);

            return Ok(new { lowStockCount, overdueCredits, unreadCount });
        }

        [HttpGet]
        public async Task<IActionResult> GetNotifications([FromQuery] int limit = 40)
        {
            if (!TryGetUserContext(out var userId, out var role))
            {
                return Unauthorized();
            }

            limit = Math.Clamp(limit, 1, 100);
            var query = BuildAudienceQuery(userId, role);
            var unreadCount = await query.CountAsync(n => !n.IsDismissed && !n.IsRead);

            var items = await query
                .OrderByDescending(n => n.CreatedAt)
                .Take(limit)
                .Select(n => MapDto(n))
                .ToListAsync();

            return Ok(new NotificationListResponse
            {
                UnreadCount = unreadCount,
                Items = items
            });
        }

        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            if (!TryGetUserContext(out var userId, out var role))
            {
                return Unauthorized();
            }

            var count = await BuildAudienceQuery(userId, role)
                .CountAsync(n => !n.IsDismissed && !n.IsRead);

            return Ok(new { unreadCount = count });
        }

        [HttpPost("{id:int}/read")]
        public async Task<IActionResult> MarkRead(int id)
        {
            var notification = await FindOwnedNotificationAsync(id);
            if (notification == null)
            {
                return NotFound();
            }

            notification.IsRead = true;
            await _db.SaveChangesAsync();
            return Ok(new { message = "Notification marked as read." });
        }

        [HttpPost("{id:int}/dismiss")]
        public async Task<IActionResult> Dismiss(int id)
        {
            var notification = await FindOwnedNotificationAsync(id);
            if (notification == null)
            {
                return NotFound();
            }

            notification.IsDismissed = true;
            notification.IsRead = true;
            await _db.SaveChangesAsync();
            return Ok(new { message = "Notification dismissed." });
        }

        /// <summary>Creates one overdue credit row for manual notification testing (Development only).</summary>
        [HttpPost("seed-overdue-test")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> SeedOverdueTest([FromQuery] int? customerId, [FromQuery] string? email)
        {
            if (!_environment.IsDevelopment())
            {
                return NotFound();
            }

            CustomerProfile? customer = null;
            if (!string.IsNullOrWhiteSpace(email))
            {
                var normalized = email.Trim().ToLowerInvariant();
                customer = await _db.CustomerProfiles
                    .FirstOrDefaultAsync(c => c.LegacyEmail.ToLower() == normalized);
            }
            else if (customerId.HasValue)
            {
                customer = await _db.CustomerProfiles.FindAsync(customerId.Value);
            }

            if (customer == null)
            {
                return NotFound(new { message = "Customer not found. Pass customerId or email." });
            }

            var history = new Models.ServiceHistory
            {
                CustomerId = customer.Id,
                HistoryType = "Service",
                Title = "Neon notification test — overdue credit",
                Description = "Created for coursework notification/email verification.",
                Amount = 499.99m,
                PaymentStatus = "Credit",
                ServiceDate = DateTime.UtcNow.AddDays(-45),
                ReminderSentAt = null
            };

            _db.ServiceHistories.Add(history);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                message = "Overdue test service history created. Call POST /api/notifications/run-checks next.",
                history.Id,
                customerId = customer.Id,
                customerUserId = customer.UserId,
                customerEmail = customer.LegacyEmail,
                note = "Reminder email is sent to customerEmail above when run-checks runs."
            });
        }

        /// <summary>Runs low-stock and overdue-credit checks immediately (for testing).</summary>
        [HttpPost("run-checks")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> RunChecks()
        {
            var result = await _checkRunner.RunOnceAsync();
            return Ok(new
            {
                message = "Notification checks completed.",
                result.LowStockProcessed,
                result.OverdueCreditsProcessed,
                result.CreditEmailsSent,
                result.ReplenishedParts,
                result.AdminUnreadCount,
                result.Errors,
                emailsSentTo = result.EmailsSentTo,
                smtpConfigured = HttpContext.RequestServices.GetRequiredService<EmailService>().IsConfigured()
            });
        }

        /// <summary>Lists customers/vehicles/parts to help build Neon test SQL.</summary>
        [HttpGet("test-context")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetTestContext()
        {
            if (!_environment.IsDevelopment())
            {
                return NotFound();
            }

            var customers = await _db.CustomerProfiles
                .AsNoTracking()
                .OrderBy(c => c.Id)
                .Take(10)
                .Select(c => new
                {
                    c.Id,
                    c.UserId,
                    c.Name,
                    Email = c.LegacyEmail
                })
                .ToListAsync();

            var lowParts = await _db.Parts
                .AsNoTracking()
                .Where(p => p.Quantity < GetThreshold())
                .Select(p => new { p.Id, p.PartName, p.Quantity, p.LastLowStockNotifiedAt })
                .Take(10)
                .ToListAsync();

            var overdue = await _db.ServiceHistories
                .AsNoTracking()
                .Where(h => h.ReminderSentAt == null && h.ServiceDate <= DateTime.UtcNow.AddMonths(-1))
                .Select(h => new { h.Id, h.CustomerId, h.PaymentStatus, h.ServiceDate, h.Amount, h.Title })
                .Take(10)
                .ToListAsync();

            var customerNotifications = await _db.AppNotifications
                .AsNoTracking()
                .Where(n => n.Audience == "Customer" && !n.IsDismissed)
                .OrderByDescending(n => n.CreatedAt)
                .Take(10)
                .Select(n => new { n.Id, n.UserId, n.Type, n.Title, n.IsRead, n.CreatedAt })
                .ToListAsync();

            return Ok(new { customers, lowParts, overdueCandidates = overdue, customerNotifications });
        }

        [HttpPost("read-all")]
        public async Task<IActionResult> MarkAllRead()
        {
            if (!TryGetUserContext(out var userId, out var role))
            {
                return Unauthorized();
            }

            var notifications = await BuildAudienceQuery(userId, role)
                .Where(n => !n.IsDismissed && !n.IsRead)
                .ToListAsync();

            foreach (var notification in notifications)
            {
                notification.IsRead = true;
            }

            await _db.SaveChangesAsync();
            return Ok(new { message = "All notifications marked as read.", updated = notifications.Count });
        }

        private async Task<Models.AppNotification?> FindOwnedNotificationAsync(int id)
        {
            if (!TryGetUserContext(out var userId, out var role))
            {
                return null;
            }

            return await BuildAudienceQuery(userId, role).FirstOrDefaultAsync(n => n.Id == id);
        }

        private IQueryable<Models.AppNotification> BuildAudienceQuery(int userId, string role)
        {
            if (string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
            {
                return _db.AppNotifications.Where(n => n.Audience == "Admin" && !n.IsDismissed);
            }

            return _db.AppNotifications.Where(n =>
                n.Audience == "Customer"
                && n.UserId == userId
                && !n.IsDismissed);
        }

        private bool TryGetUserContext(out int userId, out string role)
        {
            userId = 0;
            role = User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(userIdClaim, out userId);
        }

        private int GetThreshold()
        {
            if (int.TryParse(_config["Notifications:LowStockThreshold"], out var cfg))
            {
                return cfg;
            }

            return 10;
        }

        private static NotificationDto MapDto(Models.AppNotification notification) => new()
        {
            Id = notification.Id,
            Type = notification.Type,
            Title = notification.Title,
            Message = notification.Message,
            LinkUrl = notification.LinkUrl,
            IsRead = notification.IsRead,
            CreatedAt = notification.CreatedAt
        };
    }
}
