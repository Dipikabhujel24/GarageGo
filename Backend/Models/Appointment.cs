using System.ComponentModel.DataAnnotations;

public class Appointment
{
    public int Id { get; set; }

    public int CustomerId { get; set; }

    public int VehicleId { get; set; }

    public DateTime AppointmentDate { get; set; }

    [Required]
    [MaxLength(120)]
    public string ServiceType { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    [Required]
    [MaxLength(40)]
    public string Status { get; set; } = "Pending";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
