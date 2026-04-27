using System.ComponentModel.DataAnnotations;

public class UpsertStaffDto
{
    [Required]
    [MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(200)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(255)]
    public string? Password { get; set; }

    [Required]
    [RegularExpression("^(Admin|Staff)$")]
    public string Role { get; set; } = "Staff";
}
