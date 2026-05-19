using Google.Apis.Auth;

namespace Backend.Services
{
    public class GoogleAuthService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<GoogleAuthService> _logger;

        public GoogleAuthService(IConfiguration configuration, ILogger<GoogleAuthService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public bool IsConfigured()
        {
            return !string.IsNullOrWhiteSpace(GetClientId());
        }

        public async Task<GoogleJsonWebSignature.Payload?> ValidateIdTokenAsync(string idToken)
        {
            var clientId = GetClientId();
            if (string.IsNullOrWhiteSpace(clientId))
            {
                _logger.LogWarning("Google ClientId is not configured.");
                return null;
            }

            if (string.IsNullOrWhiteSpace(idToken))
            {
                return null;
            }

            try
            {
                var settings = new GoogleJsonWebSignature.ValidationSettings
                {
                    Audience = new[] { clientId }
                };

                return await GoogleJsonWebSignature.ValidateAsync(idToken, settings);
            }
            catch (InvalidJwtException ex)
            {
                _logger.LogWarning(ex, "Google ID token validation failed.");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error validating Google ID token.");
                return null;
            }
        }

        private string GetClientId() =>
            _configuration["Google:ClientId"] ?? string.Empty;
    }
}
