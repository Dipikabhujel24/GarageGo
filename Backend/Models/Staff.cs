using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class Staff
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(120)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(200)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        public string Password { get; set; } = string.Empty;

        [Required]
        [MaxLength(30)]
        public string Role { get; set; } = "Staff";
    }
}
