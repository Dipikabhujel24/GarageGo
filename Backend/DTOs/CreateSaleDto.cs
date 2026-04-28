using System.Collections.Generic;

namespace Backend.DTOs
{
    public class CreateSaleDto
    {
        public int CustomerId { get; set; }
        public List<SaleItemDto> Items { get; set; } = new();
    }

    public class SaleItemDto
    {
        public int PartId { get; set; }
        public int Quantity { get; set; }
        public decimal Price { get; set; }
    }
}
