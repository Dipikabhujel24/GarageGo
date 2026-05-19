using System;
using System.Collections.Generic;

public class Sale
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public DateTime Date { get; set; } = DateTime.Now;
    public decimal TotalAmount { get; set; }

    public decimal DiscountAmount { get; set; }
    public decimal FinalAmount { get; set; }
    public bool LoyaltyDiscountApplied { get; set; }
    public List<SaleItem> Items { get; set; }
}