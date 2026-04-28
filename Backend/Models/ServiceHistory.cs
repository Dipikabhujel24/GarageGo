using System.ComponentModel.DataAnnotations;

public class ServiceHistory
{
    public int Id { get; set; }

    public int CustomerId { get; set; }

    public Customer? Customer { get; set; }

    public int CustomerVehicleId { get; set; }

    public CustomerVehicle? Vehicle { get; set; }

    public DateTime ServiceDate { get; set; } = DateTime.UtcNow;

    [Required]
    [MaxLength(120)]
    public string ServiceType { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;    

    [MaxLength(120)]
    public string MechanicName { get; set; } = string.Empty;

    public decimal TotalCost { get; set; }

    [Required]
    [MaxLength(40)]
    public string Status { get; set; } = "Completed";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

}
