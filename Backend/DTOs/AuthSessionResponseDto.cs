namespace Backend.DTOs
{
    public class AuthSessionResponseDto
    {
        public string Message { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
        public DateTime ExpiresAtUtc { get; set; }
        public AuthenticatedUserDto User { get; set; } = new();
    }
}
