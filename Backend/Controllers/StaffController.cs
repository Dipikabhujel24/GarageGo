using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/staff")]
    public class StaffController : ControllerBase
    {
        private readonly AppDbContext _context;

        public StaffController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost("customers")]
        public async Task<IActionResult> RegisterCustomerByStaff([FromBody] StaffRegisterCustomerDto dto)
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

            return Ok(new
            {
                message = "Customer registered successfully by staff.",
                customerId = customer.Id,
                customerEmail = customer.Email
            });
        }
    }
}
