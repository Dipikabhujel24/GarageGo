namespace Backend.DTOs
{
    public class AuthStaffResponseDto
    {
        public string Message { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
        public DateTime ExpiresAtUtc { get; set; }
        public AuthStaffDto Staff { get; set; } = new();
    }
}
