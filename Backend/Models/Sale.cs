using System;
using System.Collections.Generic;

namespace Backend.Models
{
    public class Sale
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public DateTime Date { get; set; } = DateTime.UtcNow;
        public decimal TotalAmount { get; set; }

        public List<SaleItem> Items { get; set; } = new();
    }
}
