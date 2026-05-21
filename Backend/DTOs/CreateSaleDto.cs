using System.Collections.Generic;

namespace Backend.DTOs
{
    public class CreateSaleDto
    {
        public int CustomerId { get; set; }

        /// <summary>Optional vehicle to associate with the mirrored purchase history row.</summary>
        public int? VehicleId { get; set; }

        /// <summary>Paid, Credit, or Partial (default Paid).</summary>
        public string? PaymentStatus { get; set; }

        /// <summary>Required for Credit/Partial. Amount already collected for Partial.</summary>
        public decimal? PaidAmount { get; set; }

        public DateTime? DueDate { get; set; }

        public List<SaleItemDto> Items { get; set; } = new();
    }

    public class SaleItemDto
    {
        public int PartId { get; set; }
        public int Quantity { get; set; }
        public decimal Price { get; set; }
    }

    public class SalesCatalogDto
    {
        public List<SalesCatalogPartDto> Parts { get; set; } = new();
        public List<SalesCatalogCustomerDto> Customers { get; set; } = new();
    }

    public class SalesCatalogPartDto
    {
        public int Id { get; set; }
        public string PartName { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int Quantity { get; set; }
        public string VendorName { get; set; } = string.Empty;
    }

    public class SalesCatalogCustomerDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
    }

    public class SaleInvoiceDto
    {
        public int SaleId { get; set; }
        public int CustomerId { get; set; }
        public DateTime Date { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal FinalAmount { get; set; }
        public bool LoyaltyDiscountApplied { get; set; }
        public int LoyaltyPointsEarned { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public string PaymentStatus { get; set; } = "Paid";
        public decimal PaidAmount { get; set; }
        public decimal RemainingAmount { get; set; }
        public DateTime? DueDate { get; set; }
        public List<SaleInvoiceItemDto> Items { get; set; } = new();
    }

    public class SaleInvoiceItemDto
    {
        public int PartId { get; set; }
        public string PartName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal Price { get; set; }
        public decimal LineTotal { get; set; }
    }

    public class SendInvoiceEmailDto
    {
        public string Email { get; set; } = string.Empty;
        public int? SaleId { get; set; }
        public SaleInvoiceDto? Invoice { get; set; }
    }
}
