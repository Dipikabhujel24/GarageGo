using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    [Table("Staff")]
    public class StaffProfile
    {
        public int Id { get; set; }

        public int? UserId { get; set; }
        public AppUser? User { get; set; }

        [Required]
        [MaxLength(120)]
        public string Name { get; set; } = string.Empty;

        // Legacy auth snapshot columns kept for compatibility with the existing schema.
        [Required]
        [EmailAddress]
        [MaxLength(200)]
        [Column("Email")]
        public string LegacyEmail { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        [Column("Password")]
        public string LegacyPasswordHash { get; set; } = string.Empty;

        [Required]
        [MaxLength(30)]
        [Column("Role")]
        public string LegacyRole { get; set; } = "Staff";
    }
}
