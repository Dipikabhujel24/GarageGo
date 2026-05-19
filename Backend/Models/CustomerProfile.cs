using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    [Table("Customers")]
    public class CustomerProfile
    {
        public int Id { get; set; }

        public int? UserId { get; set; }
        public AppUser? User { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [Phone]
        [MaxLength(20)]
        public string Phone { get; set; } = string.Empty;

        [MaxLength(250)]
        public string Address { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Legacy auth snapshot columns kept for compatibility with the existing schema.
        [Required]
        [EmailAddress]
        [MaxLength(150)]
        [Column("Email")]
        public string LegacyEmail { get; set; } = string.Empty;

        [Required]
        [Column("PasswordHash")]
        public string LegacyPasswordHash { get; set; } = string.Empty;

        [Required]
        [MaxLength(30)]
        [Column("Role")]
        public string LegacyRole { get; set; } = "Customer";

        public ICollection<CustomerVehicle> Vehicles { get; set; } = new List<CustomerVehicle>();

        public ICollection<ServiceHistory> ServiceHistories { get; set; } = new List<ServiceHistory>();

        public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();

        public ICollection<UnavailablePartRequest> UnavailablePartRequests { get; set; } = new List<UnavailablePartRequest>();

        public ICollection<ServiceReview> ServiceReviews { get; set; } = new List<ServiceReview>();

        // Loyalty points accumulated by the customer
        public int LoyaltyPoints { get; set; }

        // When the customer was last notified about a loyalty milestone
        public DateTime? LastLoyaltyNotifiedAt { get; set; }
    }
}
