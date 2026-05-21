using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class UnavailablePartRequest
    {
        public int Id { get; set; }

        public int CustomerId { get; set; }

        [Required]
        [MaxLength(160)]
        public string PartName { get; set; } = string.Empty;

        [Required]
        [MaxLength(120)]
        public string VehicleModel { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        [Required]
        [MaxLength(40)]
        public string Status { get; set; } = "Pending";

        public string AdminNotes { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        public DateTime? StatusUpdatedAt { get; set; }
    }
}
