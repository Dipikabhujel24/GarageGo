using Backend.DTOs;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text;

namespace Backend.Controllers;

public class SeedDemoCustomerReportsResponseDto
{
    public string Message { get; set; } = string.Empty;
    public int RegularCustomerId { get; set; }
    public int HighSpenderCustomerId { get; set; }
    public int PendingCreditCustomerId { get; set; }
}

[ApiController]
[Route("api/reports/customers")]
[Authorize(Roles = "Admin,Staff,Sales Staff,Inventory Staff,Store Keeper,Cashier,Service Advisor,Mechanic / Technician,Purchase Officer,Accountant,Customer Support,Branch Manager,Receptionist")]
public class CustomerReportsController : ControllerBase
{
    private readonly CustomerReportsService _reports;

    public CustomerReportsController(CustomerReportsService reports)
    {
        _reports = reports;
    }

    [HttpGet("regulars")]
    public async Task<ActionResult<IEnumerable<RegularCustomerReportDto>>> GetRegularCustomers(
        CancellationToken ct)
    {
        return Ok(await _reports.GetRegularCustomersAsync(ct));
    }

    [HttpGet("high-spenders")]
    public async Task<ActionResult<IEnumerable<HighSpenderReportDto>>> GetHighSpenders(
        CancellationToken ct)
    {
        return Ok(await _reports.GetHighSpendersAsync(ct));
    }

    [HttpGet("pending-credits")]
    public async Task<ActionResult<IEnumerable<PendingCreditReportDto>>> GetPendingCredits(
        CancellationToken ct)
    {
        return Ok(await _reports.GetPendingCreditsAsync(ct));
    }

    [HttpGet("summary")]
    public async Task<ActionResult<CustomerReportsSummaryDto>> GetSummary(CancellationToken ct)
    {
        return Ok(await _reports.GetSummaryAsync(ct));
    }

    [HttpGet("pending-credits/export/csv")]
    public async Task<IActionResult> ExportPendingCreditsCsv(CancellationToken ct)
    {
        var rows = await _reports.GetPendingCreditsAsync(ct);
        var csv = CustomerReportsService.BuildPendingCreditsCsv(rows);
        return File(Encoding.UTF8.GetBytes(csv), "text/csv", "pending-credits.csv");
    }

    [HttpGet("pending-credits/export/pdf")]
    public async Task<IActionResult> ExportPendingCreditsPdf(CancellationToken ct)
    {
        var rows = await _reports.GetPendingCreditsAsync(ct);
        var lines = new List<string> { "GarageGo — Pending Credits Report", $"Generated: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC", "" };

        foreach (var row in rows)
        {
            lines.Add($"{row.InvoiceNumber} | {row.CustomerName} | Rs {row.RemainingAmount:0.00} | Due {row.DueDate:yyyy-MM-dd} | {row.PaymentStatus}");
        }

        if (rows.Count == 0)
        {
            lines.Add("No open credit balances.");
        }

        var pdf = BuildSimpleTextPdf(lines);
        return File(pdf, "application/pdf", "pending-credits.pdf");
    }

    [HttpPost("seed-demo-data")]
    [Authorize(Roles = "Admin")]
    public Task<ActionResult<SeedDemoCustomerReportsResponseDto>> SeedDemoData()
    {
        return Task.FromResult<ActionResult<SeedDemoCustomerReportsResponseDto>>(
            Ok(new SeedDemoCustomerReportsResponseDto
            {
                Message = "Use POST /api/notifications/seed-overdue-test for credit sale demo data."
            }));
    }

    private static byte[] BuildSimpleTextPdf(IReadOnlyList<string> lines)
    {
        var content = new StringBuilder();
        content.AppendLine("BT");
        content.AppendLine("/F1 11 Tf");
        var y = 780;
        foreach (var line in lines.Take(45))
        {
            var safe = line.Replace("\\", "\\\\").Replace("(", "\\(").Replace(")", "\\)");
            content.AppendLine($"50 {y} Td ({safe}) Tj");
            content.AppendLine("0 -14 Td");
            y -= 14;
        }

        content.AppendLine("ET");
        var contentBytes = Encoding.ASCII.GetBytes(content.ToString());

        using var stream = new MemoryStream();
        void Write(string text) => stream.Write(Encoding.ASCII.GetBytes(text));

        Write("%PDF-1.4\n");
        var offsets = new List<long> { 0 };
        void Object(int id, string body)
        {
            offsets.Add(stream.Position);
            Write($"{id} 0 obj\n{body}\nendobj\n");
        }

        Object(1, "<< /Type /Catalog /Pages 2 0 R >>");
        Object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
        Object(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>");
        Object(4, $"<< /Length {contentBytes.Length} >>\nstream\n{Encoding.ASCII.GetString(contentBytes)}\nendstream");
        Object(5, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

        var xrefPos = stream.Position;
        Write($"xref\n0 {offsets.Count}\n");
        Write("0000000000 65535 f \n");
        for (var i = 1; i < offsets.Count; i++)
        {
            Write($"{offsets[i]:D10} 00000 n \n");
        }

        Write($"trailer\n<< /Size {offsets.Count} /Root 1 0 R >>\nstartxref\n{xrefPos}\n%%EOF\n");
        return stream.ToArray();
    }
}
