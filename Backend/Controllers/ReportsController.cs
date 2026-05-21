using Backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    public class ReportSummary
    {
        public string Period { get; set; } = string.Empty;
        public decimal TotalRevenue { get; set; }
        public int TotalOrders { get; set; }
        public decimal TotalPurchases { get; set; }
        public decimal ProfitLoss { get; set; }
        public List<TopSellingPartSummary> TopSellingParts { get; set; } = new();
    }

    public class TopSellingPartSummary
    {
        public int PartId { get; set; }
        public string PartName { get; set; } = string.Empty;
        public int QuantitySold { get; set; }
        public decimal Revenue { get; set; }
    }

    public class DashboardMetricsSummary
    {
        public decimal TotalSales { get; set; }
        public decimal MonthlyRevenue { get; set; }
        public int TotalCustomers { get; set; }
        public int TotalStaff { get; set; }
        public int TotalVendors { get; set; }
        public int TotalParts { get; set; }
        public int LowStockItems { get; set; }
        public decimal PendingCredits { get; set; }
        public decimal TotalPendingCredit { get; set; }
        public int TotalOverdueCustomers { get; set; }
        public int TotalCreditInvoices { get; set; }
        public string? TopCustomerName { get; set; }
    }

    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin,Staff,Sales Staff,Inventory Staff,Store Keeper,Cashier,Service Advisor,Mechanic / Technician,Purchase Officer,Accountant,Customer Support,Branch Manager,Receptionist")]
    public class ReportsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ReportsController(AppDbContext context)
        {
            _context = context;
        }

        private async Task<ReportSummary> BuildSummaryAsync(DateTime start, DateTime end, string period)
        {
            var salesInRange = await _context.Sales
                .AsNoTracking()
                .Include(sale => sale.Items)
                .Where(sale => sale.Date >= start && sale.Date < end)
                .ToListAsync();

            var purchaseTotal = await _context.PurchaseInvoices
                .AsNoTracking()
                .Where(invoice => invoice.PurchaseDate >= start && invoice.PurchaseDate < end)
                .SumAsync(invoice => invoice.TotalAmount);

            var saleItems = salesInRange.SelectMany(sale => sale.Items).ToList();
            var partIds = saleItems.Select(item => item.PartId).Distinct().ToList();
            var partNames = await _context.Parts
                .AsNoTracking()
                .Where(part => partIds.Contains(part.Id))
                .ToDictionaryAsync(part => part.Id, part => part.PartName);

            var revenue = salesInRange.Sum(sale => sale.TotalAmount);

            return new ReportSummary
            {
                Period = period,
                TotalRevenue = revenue,
                TotalOrders = salesInRange.Count,
                TotalPurchases = purchaseTotal,
                ProfitLoss = revenue - purchaseTotal,
                TopSellingParts = saleItems
                    .GroupBy(item => item.PartId)
                    .Select(group => new TopSellingPartSummary
                    {
                        PartId = group.Key,
                        PartName = partNames.GetValueOrDefault(group.Key, $"Part {group.Key}"),
                        QuantitySold = group.Sum(item => item.Quantity),
                        Revenue = group.Sum(item => item.Quantity * item.Price)
                    })
                    .OrderByDescending(item => item.QuantitySold)
                    .ThenByDescending(item => item.Revenue)
                    .Take(5)
                    .ToList()
            };
        }

        [HttpGet("daily")]
        public async Task<ActionResult<ReportSummary>> GetDailyReport()
        {
            try
            {
                var today = DateTime.UtcNow.Date;
                var tomorrow = today.AddDays(1);
                var report = await BuildSummaryAsync(today, tomorrow, "Daily");
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
                var report = await BuildSummaryAsync(startOfWeek, endOfWeek, "Weekly");
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
                var report = await BuildSummaryAsync(startOfMonth, endOfMonth, "Monthly");
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
                var report = await BuildSummaryAsync(startOfYear, endOfYear, "Yearly");
                return Ok(report);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("sales-trends")]
        public async Task<ActionResult<IEnumerable<object>>> GetSalesTrends()
        {
            var start = DateTime.UtcNow.Date.AddDays(-29);
            var end = DateTime.UtcNow.Date.AddDays(1);

            var sales = await _context.Sales
                .AsNoTracking()
                .Where(sale => sale.Date >= start && sale.Date < end)
                .ToListAsync();

            var trends = Enumerable.Range(0, 30)
                .Select(offset =>
                {
                    var date = start.AddDays(offset);
                    var daySales = sales.Where(sale => sale.Date.Date == date).ToList();

                    return new
                    {
                        period = date.ToString("MMM dd"),
                        orders = daySales.Count,
                        revenue = daySales.Sum(sale => sale.TotalAmount)
                    };
                })
                .ToList();

            return Ok(trends);
        }

        [HttpGet("top-selling-parts")]
        public async Task<ActionResult<IEnumerable<TopSellingPartSummary>>> GetTopSellingParts()
        {
            var saleItems = await _context.SaleItems.AsNoTracking().ToListAsync();
            var partIds = saleItems.Select(item => item.PartId).Distinct().ToList();
            var partNames = await _context.Parts
                .AsNoTracking()
                .Where(part => partIds.Contains(part.Id))
                .ToDictionaryAsync(part => part.Id, part => part.PartName);

            return Ok(saleItems
                .GroupBy(item => item.PartId)
                .Select(group => new TopSellingPartSummary
                {
                    PartId = group.Key,
                    PartName = partNames.GetValueOrDefault(group.Key, $"Part {group.Key}"),
                    QuantitySold = group.Sum(item => item.Quantity),
                    Revenue = group.Sum(item => item.Quantity * item.Price)
                })
                .OrderByDescending(item => item.QuantitySold)
                .ThenByDescending(item => item.Revenue)
                .Take(10)
                .ToList());
        }

        [HttpGet("dashboard-metrics")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<DashboardMetricsSummary>> GetDashboardMetrics()
        {
            var today = DateTime.UtcNow.Date;
            var startOfMonth = new DateTime(today.Year, today.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var endOfMonth = startOfMonth.AddMonths(1);

            var now = DateTime.UtcNow;
            var overdueCutoff = now.AddDays(-30);

            var allSales = await _context.Sales.AsNoTracking().ToListAsync();
            var openCreditSales = allSales.Where(sale => sale.RemainingAmount > 0).ToList();
            var monthlyRevenue = allSales
                .Where(sale => sale.Date >= startOfMonth && sale.Date < endOfMonth)
                .Sum(sale => sale.FinalAmount > 0 ? sale.FinalAmount : sale.TotalAmount);

            var topCustomer = allSales
                .GroupBy(sale => sale.CustomerId)
                .Select(group => new { CustomerId = group.Key, Total = group.Sum(sale => sale.FinalAmount) })
                .OrderByDescending(entry => entry.Total)
                .FirstOrDefault();

            string? topCustomerName = null;
            if (topCustomer != null)
            {
                topCustomerName = await _context.CustomerProfiles
                    .AsNoTracking()
                    .Where(customer => customer.Id == topCustomer.CustomerId)
                    .Select(customer => customer.Name)
                    .FirstOrDefaultAsync();
            }

            var totalPendingCredit = openCreditSales.Sum(sale => sale.RemainingAmount);

            return Ok(new DashboardMetricsSummary
            {
                TotalSales = allSales.Sum(sale => sale.TotalAmount),
                MonthlyRevenue = monthlyRevenue,
                TotalCustomers = await _context.CustomerProfiles.CountAsync(),
                TotalStaff = await _context.StaffProfiles
                    .Include(staff => staff.User)
                    .CountAsync(staff => staff.User != null && staff.User.Role != "Customer"),
                TotalVendors = await _context.Vendors.CountAsync(),
                TotalParts = await _context.Parts.CountAsync(),
                LowStockItems = await _context.Parts.CountAsync(part => part.Quantity < 10),
                PendingCredits = totalPendingCredit,
                TotalPendingCredit = totalPendingCredit,
                TotalCreditInvoices = openCreditSales.Count,
                TotalOverdueCustomers = openCreditSales
                    .Where(sale => sale.DueDate.HasValue && sale.DueDate < overdueCutoff)
                    .Select(sale => sale.CustomerId)
                    .Distinct()
                    .Count(),
                TopCustomerName = topCustomerName
            });
        }
    }
}
