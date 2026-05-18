using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs
{
    public class CombinedRegisterDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Phone { get; set; } = string.Empty;

        [Required]
        [MinLength(6)]
        public string Password { get; set; } = string.Empty;

        public string Address { get; set; } = string.Empty;

        // Customer-only vehicle fields
        public string VehicleMake { get; set; } = string.Empty;
        public string VehicleModel { get; set; } = string.Empty;
        [Range(1900, 2100)]
        public int? VehicleYear { get; set; }
        public string LicensePlate { get; set; } = string.Empty;
    }
}
