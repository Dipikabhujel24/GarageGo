using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs
{
    public class StaffRegisterCustomerDto
    {
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [StringLength(150)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [Phone]
        [StringLength(20)]
        public string Phone { get; set; } = string.Empty;

        [Required]
        [MinLength(6)]
        public string Password { get; set; } = string.Empty;

        [StringLength(250)]
        public string Address { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string VehicleMake { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string VehicleModel { get; set; } = string.Empty;

        [Range(1900, 2100)]
        public int VehicleYear { get; set; }

        [StringLength(50)]
        public string LicensePlate { get; set; } = string.Empty;
    }
}
