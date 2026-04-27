using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class CustomerVehicle
    {
        public int Id { get; set; }

        public int CustomerId { get; set; }
        public Customer Customer { get; set; } = null!;

        [Required]
        [MaxLength(50)]
        public string Make { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Model { get; set; } = string.Empty;

        public int Year { get; set; }

        [MaxLength(50)]
        public string LicensePlate { get; set; } = string.Empty;

        public ICollection<ServiceHistory> ServiceHistories { get; set; } = new List<ServiceHistory>();
    }
}