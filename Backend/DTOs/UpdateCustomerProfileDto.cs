using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs
{
    public class UpdateCustomerProfileDto
    {
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [Phone]
        public string Phone { get; set; } = string.Empty;

        [StringLength(250)]
        public string Address { get; set; } = string.Empty;
    }
}