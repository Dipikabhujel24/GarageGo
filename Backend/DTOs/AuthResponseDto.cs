namespace Backend.DTOs
{
    public class AuthResponseDto
    {
        public string Message { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
        public DateTime ExpiresAtUtc { get; set; }
        public AuthCustomerDto Customer { get; set; } = new();
    }
}