namespace Backend.DTOs;

public class RegularCustomerReportDto
{
    public int CustomerId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int TotalOrders { get; set; }
    public int TotalVisits { get; set; }
    public DateTime? LastPurchaseDate { get; set; }
    public decimal TotalSpent { get; set; }
}

public class HighSpenderReportDto
{
    public int CustomerId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public decimal TotalSpent { get; set; }
    public int TotalPurchases { get; set; }
    public int LoyaltyPoints { get; set; }
}

public class PendingCreditReportDto
{
    public int SaleId { get; set; }
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string InvoiceNumber { get; set; } = string.Empty;
    public decimal RemainingAmount { get; set; }
    public DateTime? DueDate { get; set; }
    public int DaysOverdue { get; set; }
    public string PaymentStatus { get; set; } = string.Empty;
    public int ReminderCount { get; set; }
    public bool IsOverdue { get; set; }
}

public class CustomerReportsSummaryDto
{
    public decimal TotalPendingCredit { get; set; }
    public int TotalOverdueCustomers { get; set; }
    public int TotalCreditInvoices { get; set; }
    public string? TopCustomerName { get; set; }
    public decimal MonthlyRevenue { get; set; }
}
