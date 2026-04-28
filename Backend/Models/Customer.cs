using System.ComponentModel.DataAnnotations;

public class Customer
{
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(150)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [Phone]
    [MaxLength(20)]
    public string Phone { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    [MaxLength(250)]
    public string Address { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<CustomerVehicle> Vehicles { get; set; } = new List<CustomerVehicle>();

    public ICollection<ServiceHistory> ServiceHistories { get; set; } = new List<ServiceHistory>();

    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();

    public ICollection<UnavailablePartRequest> UnavailablePartRequests { get; set; } = new List<UnavailablePartRequest>();

    public ICollection<ServiceReview> ServiceReviews { get; set; } = new List<ServiceReview>();
}
