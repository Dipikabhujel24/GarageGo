using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class SalesController : ControllerBase
{
    private readonly AppDbContext _context;

    public SalesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    public IActionResult CreateSale(CreateSaleDto dto)
    {
        var sale = new Sale
        {
            CustomerId = dto.CustomerId,
            Items = dto.Items.Select(i => new SaleItem
            {
                PartId = i.PartId,
                Quantity = i.Quantity,
                Price = i.Price
            }).ToList()
        };

        sale.TotalAmount = sale.Items.Sum(i => i.Quantity * i.Price);

        _context.Sales.Add(sale);
        _context.SaveChanges();

        return Ok(sale);
    }

    [HttpPost("send-email")]
    public IActionResult SendInvoiceEmail(string email)
    {
        return Ok("Email sent");
    }
}