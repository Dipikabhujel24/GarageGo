using System.ComponentModel.DataAnnotations;

public class ServiceReview
{
    public int Id { get; set; }

    public int CustomerId { get; set; }

    [Range(1, 5)]
    public int Rating { get; set; }

    [MaxLength(1000)]
    public string Comment { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
