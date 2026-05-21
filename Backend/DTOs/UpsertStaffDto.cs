using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs
{
    public class UpsertStaffDto
    {
        [Required]
        [MaxLength(120)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(200)]
        public string Email { get; set; } = string.Empty;

        [MaxLength(255)]
        public string? Password { get; set; }

        [MaxLength(30)]
        public string? Role { get; set; }

        [MaxLength(20)]
        public string? Status { get; set; }
    }
}
