using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class ServiceHistory
    {
        public int Id { get; set; }

        [Required]
        public int CustomerId { get; set; }
        public Customer Customer { get; set; } = null!;

        public int? VehicleId { get; set; }
        public CustomerVehicle? Vehicle { get; set; }

        [Required]
        public DateTime ServiceDate { get; set; }

        [Required]
        public string ServiceType { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        [Required]
        public decimal Cost { get; set; }
    }
}