using Backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class NotificationsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IConfiguration _config;

        public NotificationsController(AppDbContext db, IConfiguration config)
        {
            _db = db;
            _config = config;
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            var threshold = 10;
            if (int.TryParse(_config["Notifications:LowStockThreshold"], out var cfg))
            {
                threshold = cfg;
            }

            var now = DateTime.UtcNow;
            var creditCutoff = now.AddMonths(-1);

            var lowStockCount = await _db.Parts.CountAsync(p => p.Quantity < threshold);
            var overdueCredits = await _db.ServiceHistories.CountAsync(h => h.PaymentStatus != null && h.PaymentStatus.ToLower() == "credit" && h.ReminderSentAt == null && h.ServiceDate <= creditCutoff);

            return Ok(new { lowStockCount, overdueCredits });
        }
    }
}
