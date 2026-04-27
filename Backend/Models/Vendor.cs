using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

public class Vendor
{
    public int Id { get; set; }

    [Required]
    public string VendorName { get; set; } = string.Empty;

    [Required]
    public string CompanyName { get; set; } = string.Empty;

    [Required]
    public string Phone { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Address { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonIgnore]
    public ICollection<Part> Parts { get; set; } = new List<Part>();
}
