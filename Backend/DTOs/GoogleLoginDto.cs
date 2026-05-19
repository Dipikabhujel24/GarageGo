using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs
{
    public class GoogleLoginDto
    {
        [Required]
        public string IdToken { get; set; } = string.Empty;
    }
}
