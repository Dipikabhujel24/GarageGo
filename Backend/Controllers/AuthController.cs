using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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

        private readonly AppDbContext _context;
        private readonly IJwtTokenService _jwtTokenService;
        private readonly Backend.Services.EmailService _emailService;

        public AuthController(AppDbContext context, IJwtTokenService jwtTokenService, Backend.Services.EmailService emailService)
        {
            _context = context;
            _jwtTokenService = jwtTokenService;
            _emailService = emailService;
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

            // generate a short numeric OTP and persist on the user
            var rng = new Random();
            var code = rng.Next(100000, 999999).ToString();
            user.VerificationCode = code;
            user.VerificationExpiresAt = DateTime.UtcNow.AddMinutes(15);
            await _context.SaveChangesAsync();

            // send OTP email
            var subject = "Your GarageGo verification code";
            var body = $"<p>Hello {customerProfile.Name},</p><p>Your verification code is <strong>{code}</strong>. It expires in 15 minutes.</p>";
            try
            {
                await _emailService.SendEmailAsync(user.Email, subject, body);
            }
            catch
            {
                // don't reveal internals; log is already handled by EmailService
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

            var subject = "Your GarageGo verification code";
            var body = $"<p>Hello,</p><p>Your new verification code is <strong>{code}</strong>. It expires at {user.VerificationExpiresAt:HH:mm} UTC.</p>";
            try
            {
                await _emailService.SendEmailAsync(user.Email, subject, body);
            }
            catch
            {
            }

            return Ok(new { message = "Verification code re-sent to your email. It expires in 15 minutes." });
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

            if (user == null
                || !string.Equals(user.Status, "Active", StringComparison.OrdinalIgnoreCase)
                || !user.EmailVerified
                || !BCrypt.Net.BCrypt.Verify(dto.Password ?? string.Empty, user.PasswordHash))
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

        private static string NormalizeEmail(string? email) =>
            (email ?? string.Empty).Trim().ToLowerInvariant();
    }
}
