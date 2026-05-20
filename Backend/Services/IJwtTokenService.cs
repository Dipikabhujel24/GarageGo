using Backend.Models;

namespace Backend.Services
{
    public interface IJwtTokenService
    {
        (string token, DateTime expiresAtUtc) GenerateUserToken(AppUser user);
    }
}
