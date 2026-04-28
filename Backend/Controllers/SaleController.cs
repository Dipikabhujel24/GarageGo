using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers
{
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
                Items = dto.Items.Select(item => new SaleItem
                {
                    PartId = item.PartId,
                    Quantity = item.Quantity,
                    Price = item.Price
                }).ToList()
            };

            sale.TotalAmount = sale.Items.Sum(item => item.Quantity * item.Price);

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
}
