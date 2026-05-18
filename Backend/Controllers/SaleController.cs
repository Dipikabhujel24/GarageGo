using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Staff")]
    public class SalesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly EmailService _emailService;

        public SalesController(AppDbContext context, EmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        [HttpGet("catalog")]
        public async Task<ActionResult<SalesCatalogDto>> GetCatalog()
        {
            var catalog = new SalesCatalogDto
            {
                Parts = await _context.Parts
                    .AsNoTracking()
                    .Include(part => part.Vendor)
                    .OrderBy(part => part.PartName)
                    .Select(part => new SalesCatalogPartDto
                    {
                        Id = part.Id,
                        PartName = part.PartName,
                        Category = part.Category,
                        Price = part.Price,
                        Quantity = part.Quantity,
                        VendorName = part.Vendor == null ? string.Empty : part.Vendor.VendorName
                    })
                    .ToListAsync(),
                Customers = await _context.CustomerProfiles
                    .AsNoTracking()
                    .OrderBy(customer => customer.Name)
                    .Select(customer => new SalesCatalogCustomerDto
                    {
                        Id = customer.Id,
                        Name = customer.Name,
                        Email = customer.LegacyEmail,
                        Phone = customer.Phone
                    })
                    .ToListAsync()
            };

            return Ok(catalog);
        }

        [HttpPost]
        public async Task<ActionResult<SaleInvoiceDto>> CreateSale([FromBody] CreateSaleDto dto)
        {
            if (dto.Items == null || dto.Items.Count == 0)
            {
                return BadRequest(new { message = "Add at least one part before saving the sale." });
            }

            var customerExists = await _context.CustomerProfiles.AnyAsync(customer => customer.Id == dto.CustomerId);
            if (!customerExists)
            {
                return NotFound(new { message = $"Customer with ID {dto.CustomerId} was not found." });
            }

            var requestedPartIds = dto.Items.Select(item => item.PartId).Distinct().ToList();
            var parts = await _context.Parts
                .Include(part => part.Vendor)
                .Where(part => requestedPartIds.Contains(part.Id))
                .ToListAsync();

            var partsById = parts.ToDictionary(part => part.Id);
            var missingPartIds = requestedPartIds.Where(partId => !partsById.ContainsKey(partId)).ToList();
            if (missingPartIds.Count > 0)
            {
                return NotFound(new { message = $"Part(s) not found: {string.Join(", ", missingPartIds)}" });
            }

            var normalizedItems = dto.Items
                .GroupBy(item => item.PartId)
                .Select(group => new
                {
                    PartId = group.Key,
                    Quantity = group.Sum(item => item.Quantity)
                })
                .ToList();

            foreach (var item in normalizedItems)
            {
                if (item.Quantity <= 0)
                {
                    return BadRequest(new { message = "Each part quantity must be greater than zero." });
                }

                var part = partsById[item.PartId];
                if (part.Quantity < item.Quantity)
                {
                    return BadRequest(new { message = $"Not enough stock for {part.PartName}. Available: {part.Quantity}." });
                }
            }

            await using var transaction = await _context.Database.BeginTransactionAsync();

            var sale = new Sale
            {
                CustomerId = dto.CustomerId,
                Date = DateTime.UtcNow
            };

            foreach (var item in normalizedItems)
            {
                var part = partsById[item.PartId];
                part.Quantity -= item.Quantity;

                sale.Items.Add(new SaleItem
                {
                    PartId = part.Id,
                    Quantity = item.Quantity,
                    Price = part.Price
                });
            };

            sale.TotalAmount = sale.Items.Sum(item => item.Quantity * item.Price);

            _context.Sales.Add(sale);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(BuildInvoice(sale, partsById));
        }

        [HttpPost("send-email")]
        public async Task<IActionResult> SendInvoiceEmail([FromBody] SendInvoiceEmailDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Email))
            {
                return BadRequest(new { message = "Recipient email is required." });
            }

            if (dto.Invoice == null || dto.Invoice.Items.Count == 0)
            {
                return BadRequest(new { message = "Invoice details are required to send the email." });
            }

            var subject = $"GarageGo Invoice #{dto.Invoice.SaleId}";
            var body = BuildInvoiceEmailBody(dto.Invoice);

            await _emailService.SendEmailAsync(dto.Email.Trim(), subject, body);

            return Ok(new { message = "Email sent" });
        }

        private static SaleInvoiceDto BuildInvoice(Sale sale, IReadOnlyDictionary<int, Part> partsById)
        {
            return new SaleInvoiceDto
            {
                SaleId = sale.Id,
                CustomerId = sale.CustomerId,
                Date = sale.Date,
                TotalAmount = sale.TotalAmount,
                Items = sale.Items.Select(item =>
                {
                    var part = partsById[item.PartId];
                    return new SaleInvoiceItemDto
                    {
                        PartId = item.PartId,
                        PartName = part.PartName,
                        Quantity = item.Quantity,
                        Price = item.Price,
                        LineTotal = item.Quantity * item.Price
                    };
                }).ToList()
            };
        }

        private static string BuildInvoiceEmailBody(SaleInvoiceDto invoice)
        {
            var builder = new StringBuilder();
            builder.AppendLine("<html><body style='font-family:Segoe UI,Arial,sans-serif;color:#0f172a;'>");
            builder.AppendLine("<div style='max-width:720px;margin:0 auto;padding:24px;border:1px solid #dbeafe;border-radius:16px;background:#f8fbff;'>");
            builder.AppendLine("<h2 style='margin-top:0;color:#0f172a;'>GarageGo Invoice</h2>");
            builder.AppendLine($"<p><strong>Invoice #:</strong> {invoice.SaleId}<br />");
            builder.AppendLine($"<strong>Customer ID:</strong> {invoice.CustomerId}<br />");
            builder.AppendLine($"<strong>Date:</strong> {invoice.Date:yyyy-MM-dd HH:mm}</p>");
            builder.AppendLine("<table style='width:100%;border-collapse:collapse;'>");
            builder.AppendLine("<thead><tr><th style='text-align:left;padding:10px;border-bottom:1px solid #cbd5e1;'>Part</th><th style='text-align:right;padding:10px;border-bottom:1px solid #cbd5e1;'>Qty</th><th style='text-align:right;padding:10px;border-bottom:1px solid #cbd5e1;'>Price</th><th style='text-align:right;padding:10px;border-bottom:1px solid #cbd5e1;'>Total</th></tr></thead>");
            builder.AppendLine("<tbody>");

            foreach (var item in invoice.Items)
            {
                builder.AppendLine("<tr>");
                builder.AppendLine($"<td style='padding:10px;border-bottom:1px solid #e2e8f0;'>{System.Net.WebUtility.HtmlEncode(item.PartName)}</td>");
                builder.AppendLine($"<td style='padding:10px;text-align:right;border-bottom:1px solid #e2e8f0;'>{item.Quantity}</td>");
                builder.AppendLine($"<td style='padding:10px;text-align:right;border-bottom:1px solid #e2e8f0;'>Rs{item.Price:0.00}</td>");
                builder.AppendLine($"<td style='padding:10px;text-align:right;border-bottom:1px solid #e2e8f0;'>Rs{item.LineTotal:0.00}</td>");
                builder.AppendLine("</tr>");
            }

            builder.AppendLine("</tbody></table>");
            builder.AppendLine($"<p style='text-align:right;margin-top:18px;font-size:1.05rem;'><strong>Total: Rs{invoice.TotalAmount:0.00}</strong></p>");
            builder.AppendLine("</div></body></html>");
            return builder.ToString();
        }
    }
}
