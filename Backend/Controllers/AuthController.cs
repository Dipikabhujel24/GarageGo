using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;
using System.Data.Common;
using System.Security.Claims;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private static readonly TimeSpan ResendCooldown = TimeSpan.FromMinutes(1);
        private static readonly ConcurrentDictionary<string, DateTime> ResendAttempts = new();
        private static readonly ConcurrentDictionary<string, DateTime> PasswordResetAttempts = new();

        private readonly AppDbContext _context;
        private readonly IJwtTokenService _jwtTokenService;
        private readonly EmailService _emailService;
        private readonly GoogleAuthService _googleAuthService;
        private readonly NotificationService _notificationService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            AppDbContext context,
            IJwtTokenService jwtTokenService,
            EmailService emailService,
            GoogleAuthService googleAuthService,
            NotificationService notificationService,
            ILogger<AuthController> logger)
        {
            _context = context;
            _jwtTokenService = jwtTokenService;
            _emailService = emailService;
            _googleAuthService = googleAuthService;
            _notificationService = notificationService;
            _logger = logger;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] CombinedRegisterDto dto)
        {
            var normalizedEmail = NormalizeEmail(dto.Email);
            if (string.IsNullOrWhiteSpace(normalizedEmail))
            {
                return BadRequest(new { message = "Email is required." });
            }

            if (await _context.Users.AnyAsync(user => user.Email == normalizedEmail))
            {
                return Conflict(new { message = "An account with this email already exists." });
            }

            var passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password ?? string.Empty);
            var user = new AppUser
            {
                Email = normalizedEmail,
                PasswordHash = passwordHash,
                Role = "Customer",
                Status = "Pending",
                EmailVerified = false
            };

            var customerProfile = new CustomerProfile
            {
                User = user,
                Name = (dto.Name ?? string.Empty).Trim(),
                Phone = (dto.Phone ?? string.Empty).Trim(),
                Address = (dto.Address ?? string.Empty).Trim(),
                LegacyEmail = normalizedEmail,
                LegacyPasswordHash = passwordHash,
                LegacyRole = "Customer"
            };

            if (!string.IsNullOrWhiteSpace(dto.VehicleMake)
                && !string.IsNullOrWhiteSpace(dto.VehicleModel)
                && dto.VehicleYear.HasValue)
            {
                var lp = NormalizeLicensePlate(dto.LicensePlate);
                if (!string.IsNullOrWhiteSpace(lp))
                {
                    var exists = await _context.CustomerVehicles
                        .AnyAsync(v => v.LicensePlate.ToUpper() == lp.ToUpper());
                    if (exists)
                    {
                        return Conflict(new { message = "License plate already registered." });
                    }
                }

                customerProfile.Vehicles.Add(new CustomerVehicle
                {
                    Make = (dto.VehicleMake ?? string.Empty).Trim(),
                    Model = (dto.VehicleModel ?? string.Empty).Trim(),
                    Year = dto.VehicleYear.Value,
                    LicensePlate = lp
                });
            }

            _context.CustomerProfiles.Add(customerProfile);
            await _context.SaveChangesAsync();

            await _notificationService.NotifyNewCustomerRegistrationAsync(customerProfile);

            // generate a short numeric OTP and persist on the user
            var rng = new Random();
            var code = rng.Next(100000, 999999).ToString();
            user.VerificationCode = code;
            user.VerificationExpiresAt = DateTime.UtcNow.AddMinutes(15);
            await _context.SaveChangesAsync();

            var emailSent = await TrySendVerificationEmailAsync(user.Email, customerProfile.Name, code);
            if (!emailSent)
            {
                return StatusCode(503, new
                {
                    message = "Your account was created, but the verification email could not be sent. Check SMTP settings and try Resend verification.",
                    emailDeliveryFailed = true
                });
            }

            return Ok(new { message = "Verification code sent to your email. It expires in 15 minutes. Please verify to complete registration." });
        }

        [HttpPost("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromBody] DTOs.VerifyEmailDto dto)
        {
            var normalizedEmail = NormalizeEmail(dto.Email);
            if (string.IsNullOrWhiteSpace(normalizedEmail))
            {
                return BadRequest(new { message = "Email is required." });
            }

            var user = await _context.Users
                .Include(u => u.CustomerProfile)
                .ThenInclude(p => p!.Vehicles)
                .FirstOrDefaultAsync(u => u.Email == normalizedEmail);
            if (user == null)
            {
                return NotFound(new { message = "Account not found." });
            }

            if (user.EmailVerified)
            {
                return BadRequest(new { message = "Email already verified." });
            }

            if (string.IsNullOrWhiteSpace(user.VerificationCode) || user.VerificationExpiresAt == null || user.VerificationExpiresAt < DateTime.UtcNow)
            {
                return BadRequest(new { message = "Verification code expired or not found. Please request a new code. Codes are valid for 15 minutes after they are sent." });
            }

            if (!string.Equals(user.VerificationCode, dto.Code?.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "Invalid verification code." });
            }

            // mark verified
            user.EmailVerified = true;
            user.VerificationCode = null;
            user.VerificationExpiresAt = null;
            user.Status = "Active";
            await _context.SaveChangesAsync();

            // generate token and return session
            var sessionUser = await LoadAuthenticatedUserDtoAsync(user);
            if (sessionUser == null)
            {
                return NotFound(new { message = "Customer profile is missing or incomplete." });
            }
            var (token, expiresAtUtc) = _jwtTokenService.GenerateUserToken(user);

            return Ok(new AuthSessionResponseDto
            {
                Message = "Email verified. Registration complete.",
                Token = token,
                ExpiresAtUtc = expiresAtUtc,
                User = sessionUser
            });
        }

        [HttpPost("resend-verification")]
        public async Task<IActionResult> ResendVerification([FromBody] DTOs.VerifyEmailDto dto)
        {
            var normalizedEmail = NormalizeEmail(dto.Email);
            if (string.IsNullOrWhiteSpace(normalizedEmail))
            {
                return BadRequest(new { message = "Email is required." });
            }

            var user = await _context.Users.Include(u => u.CustomerProfile).FirstOrDefaultAsync(u => u.Email == normalizedEmail);
            if (user == null)
            {
                return NotFound(new { message = "Account not found." });
            }

            if (user.EmailVerified)
            {
                return BadRequest(new { message = "Email already verified." });
            }

            var cooldownKey = normalizedEmail;
            var now = DateTime.UtcNow;
            if (ResendAttempts.TryGetValue(cooldownKey, out var lastAttempt))
            {
                var elapsed = now - lastAttempt;
                if (elapsed < ResendCooldown)
                {
                    var waitSeconds = (int)Math.Ceiling((ResendCooldown - elapsed).TotalSeconds);
                    return StatusCode(429, new { message = $"Please wait {waitSeconds} seconds before requesting another code." });
                }
            }

            // generate new code
            var rng = new Random();
            var code = rng.Next(100000, 999999).ToString();
            user.VerificationCode = code;
            user.VerificationExpiresAt = now.AddMinutes(15);
            await _context.SaveChangesAsync();
            ResendAttempts[cooldownKey] = now;

            var displayName = user.CustomerProfile?.Name;
            var emailSent = await TrySendVerificationEmailAsync(user.Email, displayName, code);
            if (!emailSent)
            {
                return StatusCode(503, new
                {
                    message = "Could not send the verification email. Check SMTP settings and try again shortly.",
                    emailDeliveryFailed = true
                });
            }

            return Ok(new { message = "Verification code re-sent to your email. It expires in 15 minutes." });
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
        {
            var normalizedEmail = NormalizeEmail(dto.Email);
            if (string.IsNullOrWhiteSpace(normalizedEmail))
            {
                return BadRequest(new { message = "Email is required." });
            }

            var user = await _context.Users
                .Include(u => u.CustomerProfile)
                .FirstOrDefaultAsync(u => u.Email == normalizedEmail);

            if (user == null)
            {
                return NotFound(new { message = "No customer account found for this email." });
            }

            if (!string.Equals(user.Role, "Customer", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "Password reset is only available for customer accounts." });
            }

            if (!user.EmailVerified)
            {
                return BadRequest(new { message = "This email is not verified yet. Complete registration verification first." });
            }

            if (!string.Equals(user.Status, "Active", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "This customer account is not active." });
            }

            var cooldownKey = $"reset:{normalizedEmail}";
            var now = DateTime.UtcNow;
            if (PasswordResetAttempts.TryGetValue(cooldownKey, out var lastAttempt))
            {
                var elapsed = now - lastAttempt;
                if (elapsed < ResendCooldown)
                {
                    var waitSeconds = (int)Math.Ceiling((ResendCooldown - elapsed).TotalSeconds);
                    return StatusCode(429, new { message = $"Please wait {waitSeconds} seconds before requesting another code." });
                }
            }

            var code = new Random().Next(100000, 999999).ToString();
            user.PasswordResetCode = code;
            user.PasswordResetExpiresAt = now.AddMinutes(15);
            await _context.SaveChangesAsync();
            PasswordResetAttempts[cooldownKey] = now;

            var displayName = user.CustomerProfile?.Name;
            var emailSent = await TrySendPasswordResetEmailAsync(user.Email, displayName, code);
            if (!emailSent)
            {
                return StatusCode(503, new
                {
                    message = "Could not send the password reset email. Check SMTP settings and try again shortly.",
                    emailDeliveryFailed = true
                });
            }

            return Ok(new { message = "Password reset code sent to your email. It expires in 15 minutes." });
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
        {
            var normalizedEmail = NormalizeEmail(dto.Email);
            if (string.IsNullOrWhiteSpace(normalizedEmail))
            {
                return BadRequest(new { message = "Email is required." });
            }

            if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
            {
                return BadRequest(new { message = "New password must be at least 6 characters." });
            }

            var user = await _context.Users
                .Include(u => u.CustomerProfile)
                .FirstOrDefaultAsync(u => u.Email == normalizedEmail);

            if (user == null)
            {
                return NotFound(new { message = "No customer account found for this email." });
            }

            if (!string.Equals(user.Role, "Customer", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "Password reset is only available for customer accounts." });
            }

            if (string.IsNullOrWhiteSpace(user.PasswordResetCode)
                || user.PasswordResetExpiresAt == null
                || user.PasswordResetExpiresAt < DateTime.UtcNow)
            {
                return BadRequest(new { message = "Reset code expired or not found. Request a new code." });
            }

            if (!string.Equals(user.PasswordResetCode, dto.Code?.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "Invalid reset code." });
            }

            var passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            user.PasswordHash = passwordHash;
            user.PasswordResetCode = null;
            user.PasswordResetExpiresAt = null;

            if (user.CustomerProfile != null)
            {
                user.CustomerProfile.LegacyPasswordHash = passwordHash;
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Password updated successfully. You can sign in with your new password." });
        }

        [HttpPost("google")]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginDto dto)
        {
            if (!_googleAuthService.IsConfigured())
            {
                return StatusCode(503, new
                {
                    message = "Google Sign-In is not configured. Add Google:ClientId to appsettings (same Client ID as the React app)."
                });
            }

            var payload = await _googleAuthService.ValidateIdTokenAsync(dto.IdToken);
            if (payload == null || string.IsNullOrWhiteSpace(payload.Email))
            {
                return Unauthorized(new { message = "Invalid Google sign-in. Please try again." });
            }

            if (payload.EmailVerified != true)
            {
                return BadRequest(new { message = "Your Google account email is not verified." });
            }

            var normalizedEmail = NormalizeEmail(payload.Email);
            var googleId = payload.Subject ?? string.Empty;
            if (string.IsNullOrWhiteSpace(googleId))
            {
                return Unauthorized(new { message = "Invalid Google account information." });
            }

            var displayName = string.IsNullOrWhiteSpace(payload.Name)
                ? (string.IsNullOrWhiteSpace(payload.GivenName) ? "Customer" : payload.GivenName.Trim())
                : payload.Name.Trim();

            var user = await _context.Users
                .Include(u => u.CustomerProfile)
                .FirstOrDefaultAsync(u =>
                    u.GoogleId == googleId
                    || u.Email == normalizedEmail);

            if (user != null)
            {
                if (!string.Equals(user.Role, "Customer", StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest(new
                    {
                        message = "Google Sign-In is for customer accounts only. Staff and admin must sign in with email and password."
                    });
                }

                if (!string.Equals(user.Status, "Active", StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest(new { message = "This customer account is not active." });
                }

                if (string.IsNullOrWhiteSpace(user.GoogleId))
                {
                    user.GoogleId = googleId;
                }

                user.EmailVerified = true;

                if (user.CustomerProfile != null && string.IsNullOrWhiteSpace(user.CustomerProfile.Name))
                {
                    user.CustomerProfile.Name = displayName;
                }

                await _context.SaveChangesAsync();
            }
            else
            {
                var passwordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N"));
                user = new AppUser
                {
                    Email = normalizedEmail,
                    PasswordHash = passwordHash,
                    Role = "Customer",
                    Status = "Active",
                    EmailVerified = true,
                    GoogleId = googleId
                };

                _context.CustomerProfiles.Add(new CustomerProfile
                {
                    User = user,
                    Name = displayName,
                    Phone = string.Empty,
                    Address = string.Empty,
                    LegacyEmail = normalizedEmail,
                    LegacyPasswordHash = passwordHash,
                    LegacyRole = "Customer"
                });

                await _context.SaveChangesAsync();
            }

            var sessionUser = await LoadAuthenticatedUserDtoAsync(user);
            if (sessionUser == null)
            {
                return NotFound(new { message = "Customer profile is missing or incomplete." });
            }

            var (token, expiresAtUtc) = _jwtTokenService.GenerateUserToken(user);

            return Ok(new AuthSessionResponseDto
            {
                Message = "Signed in with Google successfully.",
                Token = token,
                ExpiresAtUtc = expiresAtUtc,
                User = sessionUser
            });
        }

        [HttpPost("login")]
        [HttpPost("staff/login")]
        public async Task<IActionResult> Login([FromBody] LoginCustomerDto dto)
        {
            var normalizedEmail = NormalizeEmail(dto.Email);
            if (string.IsNullOrWhiteSpace(normalizedEmail))
            {
                return BadRequest(new { message = "Email is required." });
            }

            var user = await _context.Users
                .FirstOrDefaultAsync(existingUser => existingUser.Email == normalizedEmail);

            var passwordValid = user != null
                && BCrypt.Net.BCrypt.Verify(dto.Password ?? string.Empty, user.PasswordHash);
            var statusValid = user != null
                && string.Equals(user.Status, "Active", StringComparison.OrdinalIgnoreCase);
            var emailVerifiedValid = user != null && (
                !string.Equals(user.Role, "Customer", StringComparison.OrdinalIgnoreCase)
                || user.EmailVerified);

            if (user is null || !passwordValid || !statusValid || !emailVerifiedValid)
            {
                return Unauthorized(new { message = "Invalid email or password." });
            }

            var sessionUser = await LoadAuthenticatedUserDtoAsync(user);
            if (sessionUser == null)
            {
                return Unauthorized(new { message = "Account profile is missing or incomplete." });
            }

            var (token, expiresAtUtc) = _jwtTokenService.GenerateUserToken(user);

            return Ok(new AuthSessionResponseDto
            {
                Message = "Login successful.",
                Token = token,
                ExpiresAtUtc = expiresAtUtc,
                User = sessionUser
            });
        }

        [Authorize(Roles = "Customer")]
        [HttpGet("profile")]
        [HttpGet("~/api/customers/profile")]
        public async Task<IActionResult> GetProfile()
        {
            if (!TryGetLoggedInUserId(out var userId))
            {
                return Unauthorized(new { message = "Invalid or missing token." });
            }

            var customerProfile = await _context.CustomerProfiles
                .Include(profile => profile.User)
                .Include(profile => profile.Vehicles)
                .FirstOrDefaultAsync(profile => profile.UserId == userId);

            if (customerProfile == null || customerProfile.User == null)
            {
                return NotFound(new { message = "Customer not found." });
            }

            return Ok(BuildAuthenticatedUserDto(customerProfile.User, customerProfile));
        }

        [Authorize(Roles = "Customer")]
        [HttpPut("profile")]
        [HttpPut("~/api/customers/profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateCustomerProfileDto dto)
        {
            if (!TryGetLoggedInUserId(out var userId))
            {
                return Unauthorized(new { message = "Invalid or missing token." });
            }

            var customerProfile = await _context.CustomerProfiles
                .Include(profile => profile.User)
                .Include(profile => profile.Vehicles)
                .FirstOrDefaultAsync(profile => profile.UserId == userId);

            if (customerProfile == null || customerProfile.User == null)
            {
                return NotFound(new { message = "Customer not found." });
            }

            customerProfile.Name = (dto.Name ?? string.Empty).Trim();
            customerProfile.Phone = (dto.Phone ?? string.Empty).Trim();
            customerProfile.Address = (dto.Address ?? string.Empty).Trim();

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Profile updated successfully.",
                user = BuildAuthenticatedUserDto(customerProfile.User, customerProfile)
            });
        }

        [Authorize(Roles = "Customer")]
        [HttpGet("vehicles")]
        [HttpGet("~/api/customers/vehicles")]
        public async Task<IActionResult> GetVehicles()
        {
            if (!TryGetLoggedInUserId(out var userId))
            {
                return Unauthorized(new { message = "Invalid or missing token." });
            }

            var customerProfileId = await _context.CustomerProfiles
                .Where(profile => profile.UserId == userId)
                .Select(profile => (int?)profile.Id)
                .FirstOrDefaultAsync();

            if (!customerProfileId.HasValue)
            {
                return NotFound(new { message = "Customer not found." });
            }

            var vehicles = await _context.CustomerVehicles
                .Where(vehicle => vehicle.CustomerId == customerProfileId.Value)
                .Select(vehicle => new AuthVehicleDto
                {
                    Id = vehicle.Id,
                    Make = vehicle.Make,
                    Model = vehicle.Model,
                    Year = vehicle.Year,
                    LicensePlate = vehicle.LicensePlate
                })
                .ToListAsync();

            return Ok(vehicles);
        }

        [Authorize(Roles = "Customer")]
        [HttpPost("vehicles")]
        [HttpPost("~/api/customers/vehicles")]
        public async Task<IActionResult> AddVehicle([FromBody] AddVehicleDto dto)
        {
            if (!TryGetLoggedInUserId(out var userId))
            {
                return Unauthorized(new { message = "Invalid or missing token." });
            }

            var customerProfileId = await _context.CustomerProfiles
                .Where(profile => profile.UserId == userId)
                .Select(profile => (int?)profile.Id)
                .FirstOrDefaultAsync();

            if (!customerProfileId.HasValue)
            {
                return NotFound(new { message = "Customer not found." });
            }

            var vehicle = new CustomerVehicle
            {
                CustomerId = customerProfileId.Value,
                Make = (dto.Make ?? string.Empty).Trim(),
                Model = (dto.Model ?? string.Empty).Trim(),
                Year = dto.Year,
                LicensePlate = (dto.LicensePlate ?? string.Empty).Trim()
            };

            _context.CustomerVehicles.Add(vehicle);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Vehicle added successfully.",
                vehicle = new AuthVehicleDto
                {
                    Id = vehicle.Id,
                    Make = vehicle.Make,
                    Model = vehicle.Model,
                    Year = vehicle.Year,
                    LicensePlate = vehicle.LicensePlate
                }
            });
        }

        private async Task<AuthenticatedUserDto?> LoadAuthenticatedUserDtoAsync(AppUser user)
        {
            if (string.Equals(user.Role, "Customer", StringComparison.OrdinalIgnoreCase))
            {
                CustomerProfile? customerProfile;

                try
                {
                    customerProfile = await _context.CustomerProfiles
                        .Include(profile => profile.Vehicles)
                        .FirstOrDefaultAsync(profile => profile.UserId == user.Id);
                }
                catch (DbException)
                {
                    customerProfile = await _context.CustomerProfiles
                        .FirstOrDefaultAsync(profile => profile.UserId == user.Id);

                    if (customerProfile != null)
                    {
                        customerProfile.Vehicles = new List<CustomerVehicle>();
                    }
                }

                return customerProfile == null ? null : BuildAuthenticatedUserDto(user, customerProfile);
            }

            if (string.Equals(user.Role, "Staff", StringComparison.OrdinalIgnoreCase)
                || string.Equals(user.Role, "Admin", StringComparison.OrdinalIgnoreCase))
            {
                var staffProfile = await _context.StaffProfiles
                    .FirstOrDefaultAsync(profile => profile.UserId == user.Id);

                return staffProfile == null ? null : BuildAuthenticatedUserDto(user, staffProfile: staffProfile);
            }

            return null;
        }

        private bool TryGetLoggedInUserId(out int userId)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            userId = 0;

            return userIdClaim != null && int.TryParse(userIdClaim.Value, out userId);
        }

        private static string NormalizeLicensePlate(string? licensePlate)
        {
            return (licensePlate ?? string.Empty).Trim().ToUpperInvariant();
        }

        private static AuthenticatedUserDto BuildAuthenticatedUserDto(
            AppUser user,
            CustomerProfile? customerProfile = null,
            StaffProfile? staffProfile = null)
        {
            if (customerProfile != null)
            {
                return new AuthenticatedUserDto
                {
                    Id = customerProfile.Id,
                    UserId = user.Id,
                    Name = customerProfile.Name,
                    Email = user.Email,
                    Role = user.Role,
                    Phone = customerProfile.Phone,
                    Address = customerProfile.Address,
                    Vehicles = customerProfile.Vehicles
                        .Select(vehicle => new AuthVehicleDto
                        {
                            Id = vehicle.Id,
                            Make = vehicle.Make,
                            Model = vehicle.Model,
                            Year = vehicle.Year,
                            LicensePlate = vehicle.LicensePlate
                        })
                        .ToList()
                };
            }

            return new AuthenticatedUserDto
            {
                Id = staffProfile?.Id ?? 0,
                UserId = user.Id,
                Name = staffProfile?.Name ?? user.Email,
                Email = user.Email,
                Role = user.Role,
                Phone = string.Empty,
                Address = string.Empty,
                Vehicles = new List<AuthVehicleDto>()
            };
        }

        private async Task<bool> TrySendPasswordResetEmailAsync(string recipientEmail, string? recipientName, string code)
        {
            if (!_emailService.IsConfigured())
            {
                _logger.LogError("Password reset email skipped because SMTP is not configured.");
                return false;
            }

            var subject = "Your GarageGo password reset code";
            var greetingName = string.IsNullOrWhiteSpace(recipientName) ? "there" : recipientName.Trim();
            var body = $@"
<p>Hello {greetingName},</p>
<p>We received a request to reset your GarageGo customer account password.</p>
<p>Your password reset code is <strong>{code}</strong>. It expires in 15 minutes.</p>
<p>If you did not request this, you can ignore this email.</p>";

            try
            {
                await _emailService.SendEmailAsync(recipientEmail, subject, body);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send password reset email to {Email}", recipientEmail);
                return false;
            }
        }

        private async Task<bool> TrySendVerificationEmailAsync(string recipientEmail, string? recipientName, string code)
        {
            if (!_emailService.IsConfigured())
            {
                _logger.LogError("Verification email skipped because SMTP is not configured.");
                return false;
            }

            var subject = "Your GarageGo verification code";
            var greetingName = string.IsNullOrWhiteSpace(recipientName) ? "there" : recipientName.Trim();
            var body = $"<p>Hello {greetingName},</p><p>Your verification code is <strong>{code}</strong>. It expires in 15 minutes.</p>";

            try
            {
                await _emailService.SendEmailAsync(recipientEmail, subject, body);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send verification email to {Email}", recipientEmail);
                return false;
            }
        }

        private static string NormalizeEmail(string? email) =>
            (email ?? string.Empty).Trim().ToLowerInvariant();
    }
}
