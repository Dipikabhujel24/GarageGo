using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Data.Common;
using System.Security.Claims;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IJwtTokenService _jwtTokenService;

        public AuthController(AppDbContext context, IJwtTokenService jwtTokenService)
        {
            _context = context;
            _jwtTokenService = jwtTokenService;
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
                Status = "Active"
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
                customerProfile.Vehicles.Add(new CustomerVehicle
                {
                    Make = (dto.VehicleMake ?? string.Empty).Trim(),
                    Model = (dto.VehicleModel ?? string.Empty).Trim(),
                    Year = dto.VehicleYear.Value,
                    LicensePlate = (dto.LicensePlate ?? string.Empty).Trim()
                });
            }

            _context.CustomerProfiles.Add(customerProfile);
            await _context.SaveChangesAsync();

            var (token, expiresAtUtc) = _jwtTokenService.GenerateUserToken(user);

            return Ok(new AuthSessionResponseDto
            {
                Message = "Registration successful.",
                Token = token,
                ExpiresAtUtc = expiresAtUtc,
                User = BuildAuthenticatedUserDto(user, customerProfile)
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

            if (user == null
                || !string.Equals(user.Status, "Active", StringComparison.OrdinalIgnoreCase)
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
