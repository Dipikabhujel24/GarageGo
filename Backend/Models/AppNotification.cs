using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class AppNotification
    {
        public int Id { get; set; }

        /// <summary>Admin or Customer</summary>
        [Required]
        [MaxLength(20)]
        public string Audience { get; set; } = "Admin";

        /// <summary>Set for customer-specific notifications.</summary>
        public int? UserId { get; set; }

        [Required]
        [MaxLength(40)]
        public string Type { get; set; } = string.Empty;

        [Required]
        [MaxLength(160)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [MaxLength(1000)]
        public string Message { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? LinkUrl { get; set; }

        [Required]
        [MaxLength(120)]
        public string DedupeKey { get; set; } = string.Empty;

        public bool IsRead { get; set; }

        public bool IsDismissed { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public int? ReferenceId { get; set; }

        [MaxLength(40)]
        public string? ReferenceType { get; set; }
    }
}
