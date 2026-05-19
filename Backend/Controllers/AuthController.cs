using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
        public async Task<IActionResult> Register([FromBody] RegisterCustomerDto dto)
        {
            var normalizedEmail = (dto.Email ?? string.Empty).Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(normalizedEmail))
            {
                return BadRequest(new { message = "Email is required." });
            }

            if (await _context.Customers.AnyAsync(c => c.Email == normalizedEmail))
            {
                return Conflict(new { message = "An account with this email already exists." });
            }

            var customer = new Customer
            {
                Name = (dto.Name ?? string.Empty).Trim(),
                Email = normalizedEmail,
                Phone = (dto.Phone ?? string.Empty).Trim(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password ?? string.Empty),
                Address = (dto.Address ?? string.Empty).Trim(),
                Vehicles =
                [
                    new CustomerVehicle
                    {
                        Make = (dto.VehicleMake ?? string.Empty).Trim(),
                        Model = (dto.VehicleModel ?? string.Empty).Trim(),
                        Year = dto.VehicleYear,
                        LicensePlate = (dto.LicensePlate ?? string.Empty).Trim()
                    }
                ]
            };

            _context.Customers.Add(customer);
            await _context.SaveChangesAsync();

            var (token, expiresAtUtc) = _jwtTokenService.GenerateCustomerToken(customer);

            return Ok(BuildAuthResponse("Registration successful.", customer, token, expiresAtUtc));
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginCustomerDto dto)
        {
            var normalizedEmail = (dto.Email ?? string.Empty).Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(normalizedEmail))
            {
                return BadRequest(new { message = "Email is required." });
            }

            // Load customer without including vehicles to avoid failing when DB schema is missing vehicle columns.
            var customer = await _context.Customers
                .FirstOrDefaultAsync(c => c.Email == normalizedEmail);

            if (customer == null || !BCrypt.Net.BCrypt.Verify(dto.Password ?? string.Empty, customer.PasswordHash))
            {
                return Unauthorized(new { message = "Invalid email or password." });
            }

            // Try to load vehicles separately; if the DB is missing vehicle columns, fall back to empty list.
            try
            {
                customer.Vehicles = await _context.CustomerVehicles
                    .Where(v => v.CustomerId == customer.Id)
                    .ToListAsync();
            }
            catch (Microsoft.Data.Sqlite.SqliteException)
            {
                customer.Vehicles = new List<CustomerVehicle>();
            }

            var (token, expiresAtUtc) = _jwtTokenService.GenerateCustomerToken(customer);

            return Ok(BuildAuthResponse("Login successful.", customer, token, expiresAtUtc));
        }

        [Authorize]
        [HttpGet("profile")]
        [HttpGet("~/api/customers/profile")]
        public async Task<IActionResult> GetProfile()
        {
            if (!TryGetLoggedInCustomerId(out var customerId))
            {
                return Unauthorized(new { message = "Invalid or missing token." });
            }

            var customer = await _context.Customers
                .Include(c => c.Vehicles)
                .FirstOrDefaultAsync(c => c.Id == customerId);

            if (customer == null)
            {
                return NotFound(new { message = "Customer not found." });
            }

            return Ok(BuildCustomerDto(customer));
        }

        [Authorize]
        [HttpPut("profile")]
        [HttpPut("~/api/customers/profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateCustomerProfileDto dto)
        {
            if (!TryGetLoggedInCustomerId(out var customerId))
            {
                return Unauthorized(new { message = "Invalid or missing token." });
            }

            var customer = await _context.Customers
                .Include(c => c.Vehicles)
                .FirstOrDefaultAsync(c => c.Id == customerId);

            if (customer == null)
            {
                return NotFound(new { message = "Customer not found." });
            }

            customer.Name = (dto.Name ?? string.Empty).Trim();
            customer.Phone = (dto.Phone ?? string.Empty).Trim();
            customer.Address = (dto.Address ?? string.Empty).Trim();

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Profile updated successfully.",
                customer = BuildCustomerDto(customer)
            });
        }

        [Authorize]
        [HttpGet("vehicles")]
        [HttpGet("~/api/customers/vehicles")]
        public async Task<IActionResult> GetVehicles()
        {
            if (!TryGetLoggedInCustomerId(out var customerId))
            {
                return Unauthorized(new { message = "Invalid or missing token." });
            }

            var vehicles = await _context.CustomerVehicles
                .Where(v => v.CustomerId == customerId)
                .Select(v => new AuthVehicleDto
                {
                    Id = v.Id,
                    Make = v.Make,
                    Model = v.Model,
                    Year = v.Year,
                    LicensePlate = v.LicensePlate
                })
                .ToListAsync();

            return Ok(vehicles);
        }

        [Authorize]
        [HttpPost("vehicles")]
        [HttpPost("~/api/customers/vehicles")]
        public async Task<IActionResult> AddVehicle([FromBody] AddVehicleDto dto)
        {
            if (!TryGetLoggedInCustomerId(out var customerId))
            {
                return Unauthorized(new { message = "Invalid or missing token." });
            }

            var vehicle = new CustomerVehicle
            {
                CustomerId = customerId,
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

        private bool TryGetLoggedInCustomerId(out int customerId)
        {
            var customerIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            customerId = 0;

            return customerIdClaim != null && int.TryParse(customerIdClaim.Value, out customerId);
        }

        private static AuthResponseDto BuildAuthResponse(
            string message,
            Customer customer,
            string token,
            DateTime expiresAtUtc)
        {
            return new AuthResponseDto
            {
                Message = message,
                Token = token,
                ExpiresAtUtc = expiresAtUtc,
                Customer = BuildCustomerDto(customer)
            };
        }

        private static AuthCustomerDto BuildCustomerDto(Customer customer)
        {
            return new AuthCustomerDto
            {
                Id = customer.Id,
                Name = customer.Name,
                Email = customer.Email,
                Phone = customer.Phone,
                Address = customer.Address,
                Vehicles = customer.Vehicles
                    .Select(v => new AuthVehicleDto
                    {
                        Id = v.Id,
                        Make = v.Make,
                        Model = v.Model,
                        Year = v.Year,
                        LicensePlate = v.LicensePlate
                    })
                    .ToList()
            };
        }
    }
}