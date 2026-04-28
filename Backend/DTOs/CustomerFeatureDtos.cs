using System.ComponentModel.DataAnnotations;

public class CreateAppointmentDto
{
    [Required]
    public int CustomerId { get; set; }

    [Required]
    public int VehicleId { get; set; }

    [Required]
    public DateTime AppointmentDate { get; set; }

    [Required]
    [MaxLength(120)]
    public string ServiceType { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;
}

public class CreateUnavailablePartRequestDto
{
    [Required]
    public int CustomerId { get; set; }

    [Required]
    [MaxLength(160)]
    public string PartName { get; set; } = string.Empty;

    [Required]
    [MaxLength(120)]
    public string VehicleModel { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;
}

public class CreateServiceReviewDto
{
    [Required]
    public int CustomerId { get; set; }

    [Range(1, 5)]
    public int Rating { get; set; }

    [MaxLength(1000)]
    public string Comment { get; set; } = string.Empty;
}
