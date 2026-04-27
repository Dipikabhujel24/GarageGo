using Backend.Models;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Backend.Services
{
    public class JwtTokenService : IJwtTokenService
    {
        private readonly IConfiguration _configuration;

        public JwtTokenService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public (string token, DateTime expiresAtUtc) GenerateCustomerToken(Customer customer)
        {
            var jwtSection = _configuration.GetSection("Jwt");
            var key = jwtSection["Key"] ?? "garagego_super_secret_key_123456789";
            var issuer = jwtSection["Issuer"] ?? "GarageGo.Backend";
            var audience = jwtSection["Audience"] ?? "GarageGo.Frontend";

            var expiresAtUtc = DateTime.UtcNow.AddHours(2);

            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, customer.Id.ToString()),
                new(ClaimTypes.Name, customer.Name),
                new(ClaimTypes.Email, customer.Email),
                new(ClaimTypes.Role, "Customer")
            };

            var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
            var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer,
                audience,
                claims,
                expires: expiresAtUtc,
                signingCredentials: credentials
            );

            return (new JwtSecurityTokenHandler().WriteToken(token), expiresAtUtc);
        }
    }
}