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

        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetAllStaff()
        {
            var staffMembers = await _context.Staff
                .AsNoTracking()
                .OrderBy(staff => staff.Name)
                .Select(staff => MapStaffResponse(staff))
                .ToListAsync();

            return Ok(staffMembers);
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<object>> GetStaffById(int id)
        {
            var staffMember = await _context.Staff
                .AsNoTracking()
                .FirstOrDefaultAsync(staff => staff.Id == id);

            if (staffMember is null)
            {
                return NotFound(new { message = "Staff member not found." });
            }

            return Ok(MapStaffResponse(staffMember));
        }

        [HttpPost]
        public async Task<ActionResult<object>> CreateStaff([FromBody] UpsertStaffDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Password))
            {
                return BadRequest(new { message = "Password is required when creating staff." });
            }

            var email = dto.Email.Trim().ToLowerInvariant();
            var emailExists = await _context.Staff.AnyAsync(staff => staff.Email.ToLower() == email);

            if (emailExists)
            {
                return Conflict(new { message = "A staff member with this email already exists." });
            }

            var entity = new Staff
            {
                Name = dto.Name.Trim(),
                Email = email,
                Password = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = dto.Role
            };

            _context.Staff.Add(entity);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetStaffById), new { id = entity.Id }, MapStaffResponse(entity));
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<object>> UpdateStaff(int id, [FromBody] UpsertStaffDto dto)
        {
            var entity = await _context.Staff.FirstOrDefaultAsync(staff => staff.Id == id);
            if (entity is null)
            {
                return NotFound(new { message = "Staff member not found." });
            }

            var email = dto.Email.Trim().ToLowerInvariant();
            var duplicateEmail = await _context.Staff.AnyAsync(staff => staff.Id != id && staff.Email.ToLower() == email);

            if (duplicateEmail)
            {
                return Conflict(new { message = "Another staff member already uses this email." });
            }

            entity.Name = dto.Name.Trim();
            entity.Email = email;
            entity.Role = dto.Role;

            if (!string.IsNullOrWhiteSpace(dto.Password))
            {
                entity.Password = BCrypt.Net.BCrypt.HashPassword(dto.Password);
            }

            await _context.SaveChangesAsync();

            return Ok(MapStaffResponse(entity));
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteStaff(int id)
        {
            var entity = await _context.Staff.FirstOrDefaultAsync(staff => staff.Id == id);
            if (entity is null)
            {
                return NotFound(new { message = "Staff member not found." });
            }

            _context.Staff.Remove(entity);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPost("customers")]
        public async Task<IActionResult> RegisterCustomerByStaff([FromBody] StaffRegisterCustomerDto dto)
        {
            var normalizedEmail = (dto.Email ?? string.Empty).Trim().ToLowerInvariant();

            if (string.IsNullOrWhiteSpace(normalizedEmail))
            {
                return BadRequest(new { message = "Email is required." });
            }

            if (await _context.Customers.AnyAsync(customer => customer.Email == normalizedEmail))
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

            var vehicle = customer.Vehicles.First();

            return Ok(new
            {
                message = "Customer registered successfully by staff.",
                customerId = customer.Id,
                customer = new
                {
                    id = customer.Id,
                    name = customer.Name,
                    email = customer.Email,
                    phone = customer.Phone,
                    address = customer.Address
                },
                vehicle = new
                {
                    id = vehicle.Id,
                    make = vehicle.Make,
                    model = vehicle.Model,
                    year = vehicle.Year,
                    licensePlate = vehicle.LicensePlate
                }
            });
        }

        private static object MapStaffResponse(Staff staff)
        {
            return new
            {
                id = staff.Id,
                name = staff.Name,
                email = staff.Email,
                role = staff.Role
            };
        }
    }
}
