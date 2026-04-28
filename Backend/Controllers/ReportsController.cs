using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

public class ReportSummary
{
    public decimal TotalRevenue { get; set; }
    public int TotalOrders { get; set; }
}

[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ReportsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("daily")]
    public async Task<ActionResult<ReportSummary>> GetDailyReport()
    {
        try
        {
            // Determine boundaries for the current UTC day
            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);

            // Fetch report directly bounding the sale date between the start and end of the day
            var report = await _context.Sales
                .AsNoTracking()
                .Where(s => s.Date >= today && s.Date < tomorrow)
                .GroupBy(s => 1) // Grouping all results to aggregate entire date selection
                .Select(g => new ReportSummary
                {
                    TotalRevenue = g.Sum(s => s.TotalAmount),
                    TotalOrders = g.Count()
                })
                .FirstOrDefaultAsync();

            return Ok(report ?? new ReportSummary { TotalRevenue = 0, TotalOrders = 0 });
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
            // Determine boundaries for the current UTC week
            var today = DateTime.UtcNow.Date;
            var startOfWeek = today.AddDays(-(int)today.DayOfWeek); 
            var endOfWeek = startOfWeek.AddDays(7);

            // Fetch report strictly between start of week and the proceeding 7th day
            var report = await _context.Sales
                .AsNoTracking()
                .Where(s => s.Date >= startOfWeek && s.Date < endOfWeek)
                .GroupBy(s => 1) // Grouping all results to aggregate entire date selection
                .Select(g => new ReportSummary
                {
                    TotalRevenue = g.Sum(s => s.TotalAmount),
                    TotalOrders = g.Count()
                })
                .FirstOrDefaultAsync();

            return Ok(report ?? new ReportSummary { TotalRevenue = 0, TotalOrders = 0 });
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
            // Determine boundaries exactly mapping to the 1st of the current UTC month
            var today = DateTime.UtcNow.Date;
            var startOfMonth = new DateTime(today.Year, today.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var endOfMonth = startOfMonth.AddMonths(1);

            // Fetch report directly bounded within the start of current month and beginning of next month
            var report = await _context.Sales
                .AsNoTracking()
                .Where(s => s.Date >= startOfMonth && s.Date < endOfMonth)
                .GroupBy(s => 1) // Grouping all results to aggregate entire date selection
                .Select(g => new ReportSummary
                {
                    TotalRevenue = g.Sum(s => s.TotalAmount),
                    TotalOrders = g.Count()
                })
                .FirstOrDefaultAsync();

            return Ok(report ?? new ReportSummary { TotalRevenue = 0, TotalOrders = 0 });
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
            // Determine yearly boundary mapping directly to the first day of the current year (UTC)
            var today = DateTime.UtcNow.Date;
            var startOfYear = new DateTime(today.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            var endOfYear = startOfYear.AddYears(1);

            // Fetch report directly bounded between start of this year and the start of next year
            var report = await _context.Sales
                .AsNoTracking()
                .Where(s => s.Date >= startOfYear && s.Date < endOfYear)
                .GroupBy(s => 1) // Grouping all results to aggregate entire date selection
                .Select(g => new ReportSummary
                {
                    TotalRevenue = g.Sum(s => s.TotalAmount),
                    TotalOrders = g.Count()
                })
                .FirstOrDefaultAsync();

            return Ok(report ?? new ReportSummary { TotalRevenue = 0, TotalOrders = 0 });
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }
}
