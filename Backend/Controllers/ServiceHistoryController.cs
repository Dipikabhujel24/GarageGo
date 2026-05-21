using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/customers/service-history")]
    [Authorize(Roles = "Customer")]
    public class ServiceHistoryController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ServiceHistoryController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetServiceHistory([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null, [FromQuery] string? paymentStatus = null)
        {
            if (!TryGetLoggedInUserId(out var userId))
            {
                return Unauthorized(new { message = "Invalid or missing token." });
            }

            var customerId = await _context.CustomerProfiles
                .Where(profile => profile.UserId == userId)
                .Select(profile => (int?)profile.Id)
                .FirstOrDefaultAsync();

            if (!customerId.HasValue)
            {
                return NotFound(new { message = "Customer not found." });
            }

            var query = _context.ServiceHistories
                .AsNoTracking()
                .Include(s => s.Vehicle)
                .Where(s => s.CustomerId == customerId.Value)
                .AsQueryable();

            if (startDate.HasValue)
            {
                query = query.Where(s => s.ServiceDate >= startDate.Value);
            }

            if (endDate.HasValue)
            {
                // include the entire endDate day when time portion not provided
                var end = endDate.Value;
                query = query.Where(s => s.ServiceDate <= end);
            }

            if (!string.IsNullOrWhiteSpace(paymentStatus))
            {
                var filter = paymentStatus.Trim().ToLowerInvariant();
                query = query.Where(s => s.PaymentStatus != null && s.PaymentStatus.ToLower() == filter);
            }

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(s => s.ServiceDate)
                .Skip((Math.Max(1, page) - 1) * Math.Max(1, pageSize))
                .Take(Math.Max(1, pageSize))
                .ToListAsync();

            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var history = items.Select(s => MapToDto(s, baseUrl)).ToList();

            var totalPages = (int)Math.Ceiling(totalCount / (double)Math.Max(1, pageSize));

            return Ok(new
            {
                items = history,
                totalCount,
                page = Math.Max(1, page),
                pageSize = Math.Max(1, pageSize),
                totalPages
            });
        }

        [HttpGet("{id}/pdf")]
        public async Task<IActionResult> DownloadHistoryPdf(int id)
        {
            if (!TryGetLoggedInUserId(out var userId))
            {
                return Unauthorized(new { message = "Invalid or missing token." });
            }

            var customer = await _context.CustomerProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(profile => profile.UserId == userId);

            if (customer == null)
            {
                return NotFound(new { message = "Customer not found." });
            }

            var history = await _context.ServiceHistories
                .AsNoTracking()
                .Include(s => s.Vehicle)
                .FirstOrDefaultAsync(s => s.Id == id && s.CustomerId == customer.Id);

            if (history == null)
            {
                return NotFound(new { message = "Service history not found." });
            }

            var pdf = BuildHistoryPdf(customer, history);
            var fileName = BuildPdfFileName(history);

            return File(pdf, "application/pdf", fileName);
        }

        [HttpPost("seed-test-data")]
        public async Task<IActionResult> SeedTestData()
        {
            if (!TryGetLoggedInUserId(out var userId))
            {
                return Unauthorized(new { message = "Invalid or missing token." });
            }

            var customerId = await _context.CustomerProfiles
                .Where(profile => profile.UserId == userId)
                .Select(profile => (int?)profile.Id)
                .FirstOrDefaultAsync();

            if (!customerId.HasValue)
            {
                return NotFound(new { message = "Customer not found." });
            }

            var vehicleId = await _context.CustomerVehicles
                .Where(v => v.CustomerId == customerId.Value)
                .Select(v => (int?)v.Id)
                .FirstOrDefaultAsync();

            var now = DateTime.UtcNow;
            var sampleRecords = new List<ServiceHistory>
            {
                new()
                {
                    CustomerId = customerId.Value,
                    VehicleId = vehicleId,
                    HistoryType = "Service",
                    Title = "Oil Change and Inspection",
                    Description = "Engine oil replacement, filter check, fluid top-up, and multi-point inspection.",
                    Amount = 4500,
                    PaymentStatus = "Paid",
                    InvoiceNumber = "GG-INV-1001",
                    ServiceDate = now.AddDays(-12)
                },
                new()
                {
                    CustomerId = customerId.Value,
                    VehicleId = vehicleId,
                    HistoryType = "Service",
                    Title = "Tyre Rotation",
                    Description = "Tyre rotation and balancing for smoother daily driving.",
                    Amount = 3000,
                    PaymentStatus = "Credit",
                    InvoiceNumber = "GG-INV-1002",
                    ServiceDate = now.AddDays(-5)
                },
                new()
                {
                    CustomerId = customerId.Value,
                    VehicleId = null,
                    HistoryType = "Purchase",
                    Title = "Brake Pads Purchase",
                    Description = "Front brake pads and related consumables purchased from the garage store.",
                    Amount = 8200,
                    PaymentStatus = "Pending",
                    InvoiceNumber = null,
                    ServiceDate = now.AddDays(-2)
                }
            };

            _context.ServiceHistories.AddRange(sampleRecords);
            await _context.SaveChangesAsync();

            var createdIds = sampleRecords.Select(record => record.Id).ToList();
            var createdRecords = await _context.ServiceHistories
                .AsNoTracking()
                .Include(s => s.Vehicle)
                .Where(s => createdIds.Contains(s.Id))
                .OrderByDescending(s => s.ServiceDate)
                .ToListAsync();
            var baseUrlForSeed = $"{Request.Scheme}://{Request.Host}";
            return Ok(createdRecords.Select(s => MapToDto(s, baseUrlForSeed)).ToList());
        }

        private ServiceHistoryDto MapToDto(ServiceHistory history, string baseUrl)
        {
            return new ServiceHistoryDto
            {
                Id = history.Id,
                CustomerId = history.CustomerId,
                VehicleId = history.VehicleId,
                VehicleDetails = history.Vehicle != null
                    ? $"{history.Vehicle.Make} {history.Vehicle.Model} ({history.Vehicle.Year}) - {history.Vehicle.LicensePlate}"
                    : string.Empty,
                HistoryType = history.HistoryType,
                Title = history.Title,
                Description = history.Description,
                Amount = history.Amount,
                PaymentStatus = NormalizePaymentStatus(history.PaymentStatus),
                InvoiceNumber = history.InvoiceNumber,
                RelatedSaleId = history.RelatedSaleId,
                InvoiceUrl = $"{baseUrl}/api/customers/service-history/{history.Id}/pdf",
                ServiceDate = history.ServiceDate
            };
        }

        private static string NormalizePaymentStatus(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return string.Empty;
            var lower = raw.Trim().ToLowerInvariant();
            return lower switch
            {
                "paid" => "Paid",
                "credit" => "Credit",
                "pending" => "Pending",
                "overdue" => "Overdue",
                _ => char.ToUpperInvariant(lower[0]) + lower.Substring(1)
            };
        }

        private bool TryGetLoggedInUserId(out int userId)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            userId = 0;

            return userIdClaim != null && int.TryParse(userIdClaim.Value, out userId);
        }

        [HttpGet("{id}/invoice")]
        public async Task<IActionResult> GetInvoiceLink(int id)
        {
            if (!TryGetLoggedInUserId(out var userId))
            {
                return Unauthorized(new { message = "Invalid or missing token." });
            }

            var customerProfileId = await _context.CustomerProfiles.Where(p => p.UserId == userId).Select(p => p.Id).FirstOrDefaultAsync();

            var history = await _context.ServiceHistories
                .AsNoTracking()
                .Where(s => s.Id == id && s.CustomerId == customerProfileId)
                .FirstOrDefaultAsync();

            if (history == null)
            {
                return NotFound(new { message = "Service history not found." });
            }

            if (string.IsNullOrWhiteSpace(history.InvoiceNumber))
            {
                return NotFound(new { message = "Invoice PDF not available." });
            }

            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var url = $"{baseUrl}/api/customers/service-history/{history.Id}/pdf";
            return Ok(new { url });
        }

        private static byte[] BuildHistoryPdf(CustomerProfile customer, ServiceHistory history)
        {
            var lines = new List<(float FontSize, string Text)>
            {
                (18f, "GarageGo History Receipt"),
                (11f, $"Customer: {customer.Name}"),
                (11f, $"Email: {customer.LegacyEmail}"),
                (11f, $"Invoice #: {(string.IsNullOrWhiteSpace(history.InvoiceNumber) ? "N/A" : history.InvoiceNumber)}"),
                (11f, $"Date: {history.ServiceDate:yyyy-MM-dd HH:mm}"),
                (11f, $"Type: {NormalizeText(history.HistoryType)}"),
                (11f, $"Title: {NormalizeText(history.Title)}"),
                (11f, history.Vehicle == null
                    ? "Vehicle: No vehicle linked"
                    : $"Vehicle: {history.Vehicle.Make} {history.Vehicle.Model} ({history.Vehicle.Year}) - {history.Vehicle.LicensePlate}"),
                (11f, $"Payment Status: {NormalizePaymentStatus(history.PaymentStatus)}"),
                (11f, $"Amount: Rs{history.Amount:0.00}"),
                (11f, "Description:"),
            };

            var y = 780;
            var content = new StringBuilder();
            content.AppendLine("BT");

            foreach (var line in lines)
            {
                foreach (var wrapped in WrapText(line.Text, line.FontSize >= 16f ? 72 : 84))
                {
                    content.AppendLine($"/F1 {line.FontSize:0.##} Tf");
                    content.AppendLine($"1 0 0 1 48 {y} Tm");
                    content.AppendLine($"({EscapePdfText(wrapped)}) Tj");
                    y -= line.FontSize >= 16f ? 24 : 16;
                }
            }

            content.AppendLine("ET");

            var contentStream = content.ToString();
            var objects = new List<string>
            {
                "<< /Type /Catalog /Pages 2 0 R >>",
                "<< /Type /Pages /Kids [5 0 R] /Count 1 >>",
                "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
                $"<< /Length {Encoding.ASCII.GetByteCount(contentStream)} >>\nstream\n{contentStream}endstream",
                "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents 4 0 R >>"
            };

            var output = new StringBuilder();
            output.AppendLine("%PDF-1.4");

            var offsets = new List<int> { 0 };
            for (var index = 0; index < objects.Count; index++)
            {
                offsets.Add(Encoding.ASCII.GetByteCount(output.ToString()));
                output.AppendLine($"{index + 1} 0 obj");
                output.AppendLine(objects[index]);
                output.AppendLine("endobj");
            }

            var xrefStart = Encoding.ASCII.GetByteCount(output.ToString());
            output.AppendLine("xref");
            output.AppendLine($"0 {objects.Count + 1}");
            output.AppendLine("0000000000 65535 f ");

            for (var index = 1; index < offsets.Count; index++)
            {
                output.AppendLine($"{offsets[index]:0000000000} 00000 n ");
            }

            output.AppendLine("trailer");
            output.AppendLine($"<< /Size {objects.Count + 1} /Root 1 0 R >>");
            output.AppendLine("startxref");
            output.AppendLine(xrefStart.ToString());
            output.AppendLine("%%EOF");

            return Encoding.ASCII.GetBytes(output.ToString());
        }

        private static IEnumerable<string> WrapText(string text, int maxCharacters)
        {
            if (string.IsNullOrWhiteSpace(text))
            {
                yield break;
            }

            var words = text.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            var builder = new StringBuilder();

            foreach (var word in words)
            {
                if (builder.Length == 0)
                {
                    builder.Append(word);
                    continue;
                }

                if (builder.Length + word.Length + 1 > maxCharacters)
                {
                    yield return builder.ToString();
                    builder.Clear();
                    builder.Append(word);
                    continue;
                }

                builder.Append(' ').Append(word);
            }

            if (builder.Length > 0)
            {
                yield return builder.ToString();
            }
        }

        private static string EscapePdfText(string text)
        {
            return text
                .Replace("\\", "\\\\")
                .Replace("(", "\\(")
                .Replace(")", "\\)");
        }

        private static string BuildPdfFileName(ServiceHistory history)
        {
            var baseName = !string.IsNullOrWhiteSpace(history.InvoiceNumber)
                ? history.InvoiceNumber.Trim()
                : $"history-{history.Id}";

            var safe = new string(baseName.Select(ch => Path.GetInvalidFileNameChars().Contains(ch) ? '-' : ch).ToArray());
            return $"garagego-{safe}.pdf";
        }

        private static string NormalizeText(string? value)
        {
            return string.IsNullOrWhiteSpace(value) ? "N/A" : value.Trim();
        }
    }
}
