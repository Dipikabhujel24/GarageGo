using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class SalesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly EmailService _emailService;
    private readonly InvoiceService _invoiceService;

    // ✅ MODIFY constructor
    public SalesController(AppDbContext context, EmailService emailService, InvoiceService invoiceService)
    {
        _context = context;
        _emailService = emailService;
        _invoiceService = invoiceService;
    }

    // ✅ Sale API
    [HttpPost]
    public IActionResult CreateSale(CreateSaleDto dto)
    {
        var sale = new Sale
        {
            CustomerId = dto.CustomerId,
            Date = DateTime.UtcNow,
            Items = dto.Items.Select(i => new SaleItem
            {
                PartId = i.PartId,
                Quantity = i.Quantity,
                Price = i.Price
            }).ToList()
        };

        sale.TotalAmount = sale.Items.Sum(i => i.Quantity * i.Price);

        // ✅ Loyalty Discount Logic
        if (sale.TotalAmount > 5000)
        {
            sale.LoyaltyDiscountApplied = true;
            sale.DiscountAmount = sale.TotalAmount * 0.10m;
        }
        else
        {
            sale.LoyaltyDiscountApplied = false;
            sale.DiscountAmount = 0;
        }

        // ✅ Final Amount After Discount
        sale.FinalAmount = sale.TotalAmount - sale.DiscountAmount;

        _context.Sales.Add(sale);
        _context.SaveChanges();

        // ✅ Invoice Response
        var invoice = new
        {
            SaleId = sale.Id,
            Date = sale.Date,
            Total = sale.TotalAmount,
            Discount = sale.DiscountAmount,
            FinalAmount = sale.FinalAmount,
            LoyaltyApplied = sale.LoyaltyDiscountApplied,
            Items = sale.Items
        };

        return Ok(invoice);
    }

    // ✅ EMAIL API
    [HttpPost("send-email")]
    public async Task<IActionResult> SendInvoiceEmail(string email)
    {
        try
        {
            // ✅ Get latest sale WITH loyalty fields
            var sale = _context.Sales
                .OrderByDescending(s => s.Id)
                .Select(s => new
                {
                    saleId = s.Id,
                    date = s.Date,
                    total = s.TotalAmount,
                    discount = s.DiscountAmount,
                    finalAmount = s.FinalAmount,
                    loyaltyApplied = s.LoyaltyDiscountApplied,
                    items = s.Items
                })
                .FirstOrDefault();

            if (sale == null)
                return BadRequest("No sale found");

            // ✅ Generate PDF
            var pdfBytes = _invoiceService.GenerateInvoicePdf(sale);

            // ✅ PROFESSIONAL EMAIL BODY
            string body = $@"
<h2 style='color:#0F172A;'>GarageGo Invoice</h2>

<p>Dear Customer,</p>

<p>Thank you for choosing <strong>GarageGo</strong>.</p>

<p>Your invoice has been successfully generated and is attached with this email.</p>

<p><strong>Invoice Details:</strong></p>

<ul>
    <li>Invoice ID: {sale.saleId}</li>
    <li>Date: {sale.date:yyyy-MM-dd}</li>
    <li>Subtotal: Rs {sale.total}</li>
    <li>Discount: Rs {sale.discount}</li>
    <li>Final Amount: Rs {sale.finalAmount}</li>
</ul>

<p>If you have any questions or need assistance, feel free to contact us.</p>

<br/>

<p>Best regards,</p>
<p><strong>GarageGo Team</strong></p>

<hr/>
<small>This is an automated email. Please do not reply directly.</small>
";

            // ✅ Send email with PDF attachment
            await _emailService.SendEmailWithAttachmentAsync(
                email,
                "GarageGo Invoice",
                body,
                pdfBytes,
                "Invoice.pdf"
            );

            return Ok("Email with invoice sent successfully");
        }
        catch (Exception ex)
        {
            return BadRequest($"Email failed: {ex.Message}");
        }
    }
}