using System.ComponentModel.DataAnnotations;

namespace Backend.Models;

public class Sale
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public decimal TotalAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal FinalAmount { get; set; }
    public bool LoyaltyDiscountApplied { get; set; }

    [MaxLength(50)]
    public string InvoiceNumber { get; set; } = string.Empty;

    [MaxLength(20)]
    public string PaymentStatus { get; set; } = PaymentStatuses.Paid;

    public decimal PaidAmount { get; set; }
    public decimal RemainingAmount { get; set; }
    public DateTime? DueDate { get; set; }
    public DateTime? LastReminderSentAt { get; set; }
    public int ReminderCount { get; set; }

    public List<SaleItem> Items { get; set; } = new();
}
