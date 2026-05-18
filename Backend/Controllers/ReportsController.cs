using Backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    public class ReportSummary
    {
        public decimal TotalRevenue { get; set; }
        public int TotalOrders { get; set; }
    }

    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin,Staff")]
    public class ReportsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ReportsController(AppDbContext context)
        {
            _context = context;
        }

        private async Task<ReportSummary> BuildSummaryAsync(DateTime start, DateTime end)
        {
            var salesInRange = await _context.Sales
                .AsNoTracking()
                .Where(sale => sale.Date >= start && sale.Date < end)
                .ToListAsync();

            return new ReportSummary
            {
                TotalRevenue = salesInRange.Sum(sale => sale.TotalAmount),
                TotalOrders = salesInRange.Count
            };
        }

        [HttpGet("daily")]
        public async Task<ActionResult<ReportSummary>> GetDailyReport()
        {
            try
            {
                var today = DateTime.UtcNow.Date;
                var tomorrow = today.AddDays(1);
                var report = await BuildSummaryAsync(today, tomorrow);
                return Ok(report);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("weekly")]
        public async Task<ActionResult<ReportSummary>> GetWeeklyReport()
        {
            try
            {
                var today = DateTime.UtcNow.Date;
                var startOfWeek = today.AddDays(-(int)today.DayOfWeek);
                var endOfWeek = startOfWeek.AddDays(7);
                var report = await BuildSummaryAsync(startOfWeek, endOfWeek);
                return Ok(report);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("monthly")]
        public async Task<ActionResult<ReportSummary>> GetMonthlyReport()
        {
            try
            {
                var today = DateTime.UtcNow.Date;
                var startOfMonth = new DateTime(today.Year, today.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                var endOfMonth = startOfMonth.AddMonths(1);
                var report = await BuildSummaryAsync(startOfMonth, endOfMonth);
                return Ok(report);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("yearly")]
        public async Task<ActionResult<ReportSummary>> GetYearlyReport()
        {
            try
            {
                var today = DateTime.UtcNow.Date;
                var startOfYear = new DateTime(today.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
                var endOfYear = startOfYear.AddYears(1);
                var report = await BuildSummaryAsync(startOfYear, endOfYear);
                return Ok(report);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}
