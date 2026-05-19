using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class ServiceHistory
    {
        public int Id { get; set; }

        [Required]
        public int CustomerId { get; set; }
        public CustomerProfile Customer { get; set; } = null!;

        public int? VehicleId { get; set; }
        public CustomerVehicle? Vehicle { get; set; }

        [Required]
        [MaxLength(20)]
        public string HistoryType { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [MaxLength(1000)]
        public string Description { get; set; } = string.Empty;

        [Required]
        public decimal Amount { get; set; }

        [Required]
        [MaxLength(20)]
        public string PaymentStatus { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? InvoiceNumber { get; set; }

        [Required]
        public DateTime ServiceDate { get; set; }

        // Timestamp when a payment reminder was last sent for overdue credit
        public DateTime? ReminderSentAt { get; set; }
    }
}
