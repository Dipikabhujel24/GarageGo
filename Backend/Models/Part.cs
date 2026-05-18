using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class Part
    {
        public int Id { get; set; }

        [Required]
        public string PartName { get; set; } = string.Empty;

        [Required]
        public string Category { get; set; } = string.Empty;

        [Range(0, double.MaxValue)]
        public decimal Price { get; set; }

        [Range(0, int.MaxValue)]
        public int Quantity { get; set; }

        public string Description { get; set; } = string.Empty;

        public int VendorId { get; set; }

        public Vendor? Vendor { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastLowStockNotifiedAt { get; set; }
    }
}
