using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs
{
    public class AddVehicleDto
    {
        [Required]
        public string Make { get; set; } = string.Empty;

        [Required]
        public string Model { get; set; } = string.Empty;

        [Range(1900, 2100)]
        public int Year { get; set; }

        public string LicensePlate { get; set; } = string.Empty;
    }
}