using System.ComponentModel.DataAnnotations;

public class CustomerVehicle
{
    public int Id { get; set; }

    public int CustomerId { get; set; }

    public Customer? Customer { get; set; }

    [Required]
    [MaxLength(30)]
    public string VehicleNumber { get; set; } = string.Empty;

    [Required]
    [MaxLength(80)]
    public string Make { get; set; } = string.Empty;

    [Required]
    [MaxLength(80)]
    public string Model { get; set; } = string.Empty;

    public int? Year { get; set; }

    [MaxLength(40)]
    public string Color { get; set; } = string.Empty;

    [MaxLength(60)]
    public string VehicleType { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ServiceHistory> ServiceHistories { get; set; } = new List<ServiceHistory>();

    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();

}
