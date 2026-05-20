using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs
{
    public class CreatePurchaseInvoiceDto
    {
        [Required]
        public int VendorId { get; set; }

        [MaxLength(50)]
        public string? InvoiceNumber { get; set; }

        public DateTime? PurchaseDate { get; set; }

        [Required]
        [MinLength(1, ErrorMessage = "Add at least one part before saving the purchase invoice.")]
        public List<CreatePurchaseInvoiceItemDto> Items { get; set; } = new();
    }

    public class CreatePurchaseInvoiceItemDto
    {
        [Required]
        public int PartId { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Quantity must be greater than zero.")]
        public int Quantity { get; set; }

        [Range(0.01, double.MaxValue, ErrorMessage = "Unit price must be greater than zero.")]
        public decimal UnitPrice { get; set; }
    }

    public class PurchaseInvoiceDto
    {
        public int Id { get; set; }
        public int VendorId { get; set; }
        public string VendorName { get; set; } = string.Empty;
        public string CompanyName { get; set; } = string.Empty;
        public string InvoiceNumber { get; set; } = string.Empty;
        public DateTime PurchaseDate { get; set; }
        public decimal TotalAmount { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<PurchaseInvoiceItemDto> Items { get; set; } = new();
    }

    public class PurchaseInvoiceItemDto
    {
        public int Id { get; set; }
        public int PartId { get; set; }
        public string PartName { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal SubTotal { get; set; }
    }
}
