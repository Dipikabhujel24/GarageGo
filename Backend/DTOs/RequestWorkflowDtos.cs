using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs;

public class UpdateRequestStatusDto
{
    [Required]
    [MaxLength(40)]
    public string Status { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string? AdminNotes { get; set; }
}

public class AppointmentVehicleDto
{
    public string VehicleNumber { get; set; } = string.Empty;
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int? Year { get; set; }
    public string LicensePlate { get; set; } = string.Empty;
}

public class AppointmentListItemDto
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerEmail { get; set; }
    public string? CustomerPhone { get; set; }
    public int VehicleId { get; set; }
    public AppointmentVehicleDto? Vehicle { get; set; }
    public DateTime AppointmentDate { get; set; }
    public string ServiceType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string AdminNotes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? StatusUpdatedAt { get; set; }
}

public class PartRequestListItemDto
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerEmail { get; set; }
    public string? CustomerPhone { get; set; }
    public string PartName { get; set; } = string.Empty;
    public string VehicleModel { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string AdminNotes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? StatusUpdatedAt { get; set; }
}
