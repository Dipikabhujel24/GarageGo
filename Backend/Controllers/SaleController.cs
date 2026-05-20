using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin,Staff,Sales Staff,Inventory Staff,Store Keeper,Cashier,Service Advisor,Mechanic / Technician,Purchase Officer,Accountant,Customer Support,Branch Manager,Receptionist")]
    public class SalesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly EmailService _emailService;
        private readonly InvoiceService _invoiceService;
        private readonly NotificationService _notificationService;
        private readonly SalesService _salesService;
        private readonly IConfiguration _configuration;

        public SalesController(
            AppDbContext context,
            EmailService emailService,
            InvoiceService invoiceService,
            NotificationService notificationService,
            SalesService salesService,
            IConfiguration configuration)
        {
            _context = context;
            _emailService = emailService;
            _invoiceService = invoiceService;
            _notificationService = notificationService;
            _salesService = salesService;
            _configuration = configuration;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetSales()
        {
            var sales = await _context.Sales
                .AsNoTracking()
                .OrderByDescending(sale => sale.Date)
                .Select(sale => new
                {
                    sale.Id,
                    sale.CustomerId,
                    sale.Date,
                    sale.TotalAmount,
                    sale.DiscountAmount,
                    sale.FinalAmount,
                    sale.LoyaltyDiscountApplied,
                    Items = sale.Items.Select(item => new
                    {
                        item.PartId,
                        item.Quantity,
                        item.Price
                    }).ToList()
                })
                .ToListAsync();

            return Ok(sales);
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<object>> GetSaleById(int id)
        {
            var sale = await LoadSaleResponseAsync(id);
            if (sale is null)
            {
                return NotFound(new { message = "Sale not found." });
            }

            return Ok(sale);
        }

        [HttpGet("customer/{customerId:int}")]
        public async Task<ActionResult<IEnumerable<object>>> GetCustomerSales(int customerId)
        {
            var sales = await _context.Sales
                .AsNoTracking()
                .Where(sale => sale.CustomerId == customerId)
                .OrderByDescending(sale => sale.Date)
                .Select(sale => new
                {
                    sale.Id,
                    sale.Date,
                    sale.TotalAmount,
                    sale.DiscountAmount,
                    sale.FinalAmount,
                    sale.LoyaltyDiscountApplied
                })
                .ToListAsync();

            return Ok(sales);
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
            try
            {
                var invoice = await _salesService.CreateSaleAsync(dto);

                var partIds = dto.Items.Select(item => item.PartId).Distinct();
                foreach (var partId in partIds)
                {
                    await _notificationService.HandlePartStockChangedAsync(partId, _emailService);
                }

                await TrySendLoyaltyMilestoneEmailAsync(dto.CustomerId);

                return Ok(invoice);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("send-email")]
        public async Task<IActionResult> SendInvoiceEmail([FromBody] SendInvoiceEmailDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Email))
            {
                return BadRequest(new { message = "Recipient email is required." });
            }

            Sale? saleEntity = null;
            if (dto.SaleId.HasValue && dto.SaleId.Value > 0)
            {
                saleEntity = await _context.Sales
                    .Include(sale => sale.Items)
                    .FirstOrDefaultAsync(sale => sale.Id == dto.SaleId.Value);
            }
            else if (dto.Invoice?.SaleId > 0)
            {
                saleEntity = await _context.Sales
                    .Include(sale => sale.Items)
                    .FirstOrDefaultAsync(sale => sale.Id == dto.Invoice.SaleId);
            }
            else
            {
                saleEntity = await _context.Sales
                    .Include(sale => sale.Items)
                    .OrderByDescending(sale => sale.Id)
                    .FirstOrDefaultAsync();
            }

            if (saleEntity is null)
            {
                return BadRequest(new { message = "No sale found to email." });
            }

            var partIds = saleEntity.Items.Select(item => item.PartId).Distinct().ToList();
            var partsById = await _context.Parts
                .AsNoTracking()
                .Where(part => partIds.Contains(part.Id))
                .ToDictionaryAsync(part => part.Id, part => part);

            var pdfModel = BuildPdfModel(saleEntity, partsById);
            var pdfBytes = _invoiceService.GenerateInvoicePdf(pdfModel);

            var body = $@"
<h2 style='color:#0F172A;'>GarageGo Invoice</h2>
<p>Dear Customer,</p>
<p>Thank you for choosing <strong>GarageGo</strong>.</p>
<p>Your invoice has been successfully generated and is attached with this email.</p>
<p><strong>Invoice Details:</strong></p>
<ul>
    <li>Invoice ID: {saleEntity.Id}</li>
    <li>Customer ID: {saleEntity.CustomerId}</li>
    <li>Date: {saleEntity.Date:yyyy-MM-dd}</li>
    <li>Subtotal: Rs {saleEntity.TotalAmount:0.00}</li>
    <li>Discount: Rs {saleEntity.DiscountAmount:0.00}</li>
    <li>Final Amount: Rs {saleEntity.FinalAmount:0.00}</li>
</ul>
<p>Best regards,<br/><strong>GarageGo Team</strong></p>";

            try
            {
                await _emailService.SendEmailWithAttachmentAsync(
                    dto.Email.Trim(),
                    "GarageGo Invoice",
                    body,
                    pdfBytes,
                    $"Invoice-{saleEntity.Id}.pdf");
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Email failed: {ex.Message}" });
            }

            return Ok(new { message = "Email with invoice sent successfully." });
        }

        private async Task TrySendLoyaltyMilestoneEmailAsync(int customerId)
        {
            try
            {
                var customer = await _context.CustomerProfiles.FindAsync(customerId);
                if (customer is null)
                {
                    return;
                }

                var threshold = 100;
                if (int.TryParse(_configuration["Loyalty:NotifyThreshold"], out var cfgThreshold))
                {
                    threshold = cfgThreshold;
                }

                if (customer.LoyaltyPoints < threshold
                    || customer.LastLoyaltyNotifiedAt != null
                    || string.IsNullOrWhiteSpace(customer.LegacyEmail)
                    || !_emailService.IsConfigured())
                {
                    return;
                }

                var subject = "Congratulations — Loyalty Reward Unlocked";
                var body = $"Dear {customer.Name},<br/><br/>You've earned {customer.LoyaltyPoints} loyalty points and reached a reward milestone! Thank you for being a valued customer.<br/><br/>— GarageGo";
                await _emailService.SendEmailAsync(customer.LegacyEmail.Trim(), subject, body);
                customer.LastLoyaltyNotifiedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
            catch
            {
                // Do not fail the sale if loyalty email fails.
            }
        }

        private async Task<object?> LoadSaleResponseAsync(int id)
        {
            var sale = await _context.Sales
                .AsNoTracking()
                .Include(s => s.Items)
                .FirstOrDefaultAsync(s => s.Id == id);

            if (sale is null)
            {
                return null;
            }

            var partIds = sale.Items.Select(item => item.PartId).Distinct().ToList();
            var partsById = await _context.Parts
                .AsNoTracking()
                .Where(part => partIds.Contains(part.Id))
                .ToDictionaryAsync(part => part.Id, part => part);

            return new
            {
                sale.Id,
                sale.CustomerId,
                sale.Date,
                sale.TotalAmount,
                sale.DiscountAmount,
                sale.FinalAmount,
                sale.LoyaltyDiscountApplied,
                Items = sale.Items.Select(item =>
                {
                    partsById.TryGetValue(item.PartId, out var part);
                    return new
                    {
                        item.PartId,
                        PartName = part?.PartName ?? $"Part {item.PartId}",
                        item.Quantity,
                        item.Price,
                        LineTotal = item.Quantity * item.Price
                    };
                }).ToList()
            };
        }

        private static InvoicePdfModel BuildPdfModel(Sale sale, IReadOnlyDictionary<int, Part> partsById)
        {
            return new InvoicePdfModel
            {
                SaleId = sale.Id,
                CustomerId = sale.CustomerId,
                Date = sale.Date,
                TotalAmount = sale.TotalAmount,
                DiscountAmount = sale.DiscountAmount,
                FinalAmount = sale.FinalAmount,
                LoyaltyDiscountApplied = sale.LoyaltyDiscountApplied,
                Items = sale.Items.Select(item =>
                {
                    partsById.TryGetValue(item.PartId, out var part);
                    return new InvoicePdfItem
                    {
                        PartId = item.PartId,
                        PartName = part?.PartName ?? $"Part {item.PartId}",
                        Quantity = item.Quantity,
                        Price = item.Price
                    };
                }).ToList()
            };
        }
    }
}
