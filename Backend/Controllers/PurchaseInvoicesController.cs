using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class PurchaseInvoicesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<PurchaseInvoicesController> _logger;

        public PurchaseInvoicesController(AppDbContext context, ILogger<PurchaseInvoicesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<PurchaseInvoiceDto>>> GetPurchaseInvoices()
        {
            var invoices = await _context.PurchaseInvoices
                .AsNoTracking()
                .Include(invoice => invoice.Vendor)
                .Include(invoice => invoice.Items)
                    .ThenInclude(item => item.Part)
                .OrderByDescending(invoice => invoice.PurchaseDate)
                .ThenByDescending(invoice => invoice.Id)
                .ToListAsync();

            return Ok(invoices.Select(MapInvoice));
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<PurchaseInvoiceDto>> GetPurchaseInvoice(int id)
        {
            var invoice = await _context.PurchaseInvoices
                .AsNoTracking()
                .Include(existingInvoice => existingInvoice.Vendor)
                .Include(existingInvoice => existingInvoice.Items)
                    .ThenInclude(item => item.Part)
                .FirstOrDefaultAsync(existingInvoice => existingInvoice.Id == id);

            if (invoice == null)
            {
                return NotFound(new { message = $"Purchase invoice with ID {id} was not found." });
            }

            return Ok(MapInvoice(invoice));
        }

        [HttpPost]
        public async Task<ActionResult<PurchaseInvoiceDto>> CreatePurchaseInvoice([FromBody] CreatePurchaseInvoiceDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var vendor = await _context.Vendors.FindAsync(dto.VendorId);
            if (vendor == null)
            {
                return NotFound(new { message = $"Vendor with ID {dto.VendorId} was not found." });
            }

            var normalizedItems = dto.Items
                .GroupBy(item => item.PartId)
                .Select(group => new
                {
                    PartId = group.Key,
                    Quantity = group.Sum(item => item.Quantity),
                    UnitPrice = group.Last().UnitPrice
                })
                .ToList();

            if (normalizedItems.Count == 0)
            {
                return BadRequest(new { message = "Add at least one part before saving the purchase invoice." });
            }

            if (normalizedItems.Any(item => item.Quantity <= 0 || item.UnitPrice <= 0))
            {
                return BadRequest(new { message = "Each invoice item needs a valid quantity and unit price." });
            }

            var partIds = normalizedItems.Select(item => item.PartId).ToList();
            var parts = await _context.Parts
                .Where(part => partIds.Contains(part.Id))
                .ToListAsync();

            var partsById = parts.ToDictionary(part => part.Id);
            var missingPartIds = partIds.Where(partId => !partsById.ContainsKey(partId)).ToList();
            if (missingPartIds.Count > 0)
            {
                return NotFound(new { message = $"Part(s) not found: {string.Join(", ", missingPartIds)}" });
            }

            if (normalizedItems.Any(item => partsById[item.PartId].VendorId != dto.VendorId))
            {
                return BadRequest(new { message = "All selected parts must belong to the selected vendor." });
            }

            await using var transaction = await _context.Database.BeginTransactionAsync();

            var invoice = new PurchaseInvoice
            {
                VendorId = dto.VendorId,
                InvoiceNumber = string.IsNullOrWhiteSpace(dto.InvoiceNumber)
                    ? await GenerateInvoiceNumberAsync()
                    : dto.InvoiceNumber.Trim(),
                PurchaseDate = NormalizeUtc(dto.PurchaseDate ?? DateTime.UtcNow),
                CreatedAt = DateTime.UtcNow
            };

            foreach (var item in normalizedItems)
            {
                var part = partsById[item.PartId];
                part.Quantity += item.Quantity;

                invoice.Items.Add(new PurchaseInvoiceItem
                {
                    PartId = part.Id,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    SubTotal = item.Quantity * item.UnitPrice
                });
            }

            invoice.TotalAmount = invoice.Items.Sum(item => item.SubTotal);

            _context.PurchaseInvoices.Add(invoice);

            try
            {
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Failed to create purchase invoice {InvoiceNumber}.", invoice.InvoiceNumber);
                return BadRequest(new { message = "Unable to create purchase invoice. Check invoice number and item details." });
            }

            var createdInvoice = await _context.PurchaseInvoices
                .AsNoTracking()
                .Include(existingInvoice => existingInvoice.Vendor)
                .Include(existingInvoice => existingInvoice.Items)
                    .ThenInclude(item => item.Part)
                .FirstAsync(existingInvoice => existingInvoice.Id == invoice.Id);

            return CreatedAtAction(nameof(GetPurchaseInvoice), new { id = createdInvoice.Id }, MapInvoice(createdInvoice));
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeletePurchaseInvoice(int id)
        {
            var invoice = await _context.PurchaseInvoices
                .Include(existingInvoice => existingInvoice.Items)
                .FirstOrDefaultAsync(existingInvoice => existingInvoice.Id == id);

            if (invoice == null)
            {
                return NotFound(new { message = $"Purchase invoice with ID {id} was not found." });
            }

            var partIds = invoice.Items.Select(item => item.PartId).ToList();
            var parts = await _context.Parts
                .Where(part => partIds.Contains(part.Id))
                .ToDictionaryAsync(part => part.Id);

            foreach (var item in invoice.Items)
            {
                if (!parts.TryGetValue(item.PartId, out var part))
                {
                    return BadRequest(new { message = $"Part with ID {item.PartId} no longer exists." });
                }

                if (part.Quantity < item.Quantity)
                {
                    return BadRequest(new { message = $"Cannot delete this invoice because stock for {part.PartName} has already been consumed." });
                }
            }

            await using var transaction = await _context.Database.BeginTransactionAsync();

            foreach (var item in invoice.Items)
            {
                parts[item.PartId].Quantity -= item.Quantity;
            }

            _context.PurchaseInvoices.Remove(invoice);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return NoContent();
        }

        private async Task<string> GenerateInvoiceNumberAsync()
        {
            var todayPrefix = $"PI-{DateTime.UtcNow:yyyyMMdd}";
            var count = await _context.PurchaseInvoices
                .CountAsync(invoice => invoice.InvoiceNumber.StartsWith(todayPrefix));

            return $"{todayPrefix}-{count + 1:000}";
        }

        private static DateTime NormalizeUtc(DateTime value)
        {
            if (value.Kind == DateTimeKind.Utc)
            {
                return value;
            }

            return value.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(value, DateTimeKind.Utc)
                : value.ToUniversalTime();
        }

        private static PurchaseInvoiceDto MapInvoice(PurchaseInvoice invoice) =>
            new()
            {
                Id = invoice.Id,
                VendorId = invoice.VendorId,
                VendorName = invoice.Vendor?.VendorName ?? string.Empty,
                CompanyName = invoice.Vendor?.CompanyName ?? string.Empty,
                InvoiceNumber = invoice.InvoiceNumber,
                PurchaseDate = invoice.PurchaseDate,
                TotalAmount = invoice.TotalAmount,
                CreatedAt = invoice.CreatedAt,
                Items = invoice.Items.Select(item => new PurchaseInvoiceItemDto
                {
                    Id = item.Id,
                    PartId = item.PartId,
                    PartName = item.Part?.PartName ?? string.Empty,
                    Category = item.Part?.Category ?? string.Empty,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    SubTotal = item.SubTotal
                }).ToList()
            };
    }
}
