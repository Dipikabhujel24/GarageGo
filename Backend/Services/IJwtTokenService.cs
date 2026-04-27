using Backend.Models;

namespace Backend.Services
{
    public interface IJwtTokenService
    {
        (string token, DateTime expiresAtUtc) GenerateCustomerToken(Customer customer);
    }
}