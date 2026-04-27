using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

public class ReportData
{
    public string Period { get; set; } = string.Empty;
    public int Orders { get; set; }
    public decimal Revenue { get; set; }
}

[ApiController]
[Route("api/reports")]
public class ReportsController : ControllerBase
{
    [HttpGet("daily")]
    public async Task<IActionResult> GetDailyReports()
    {
        var mockData = new List<ReportData>
        {
            new ReportData { Period = DateTime.Now.AddDays(-2).ToString("yyyy-MM-dd"), Orders = 5, Revenue = 150.00m },
            new ReportData { Period = DateTime.Now.AddDays(-1).ToString("yyyy-MM-dd"), Orders = 8, Revenue = 320.50m },
            new ReportData { Period = DateTime.Now.ToString("yyyy-MM-dd"), Orders = 3, Revenue = 90.00m }
        };

        return await Task.FromResult(Ok(mockData));
    }

    [HttpGet("monthly")]
    public async Task<IActionResult> GetMonthlyReports()
    {
        var mockData = new List<ReportData>
        {
            new ReportData { Period = DateTime.Now.AddMonths(-2).ToString("MMMM"), Orders = 150, Revenue = 5400.00m },
            new ReportData { Period = DateTime.Now.AddMonths(-1).ToString("MMMM"), Orders = 120, Revenue = 4200.50m },
            new ReportData { Period = DateTime.Now.ToString("MMMM"), Orders = 180, Revenue = 6100.00m }
        };

        return await Task.FromResult(Ok(mockData));
    }

    [HttpGet("yearly")]
    public async Task<IActionResult> GetYearlyReports()
    {
        var mockData = new List<ReportData>
        {
            new ReportData { Period = DateTime.Now.AddYears(-2).ToString("yyyy"), Orders = 1500, Revenue = 50400.00m },
            new ReportData { Period = DateTime.Now.AddYears(-1).ToString("yyyy"), Orders = 1800, Revenue = 62000.50m },
            new ReportData { Period = DateTime.Now.ToString("yyyy"), Orders = 2100, Revenue = 75100.00m }
        };

        return await Task.FromResult(Ok(mockData));
    }
}
