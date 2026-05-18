using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
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

        [Authorize(Roles = "Admin")]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetAllStaff()
        {
            var staffMembers = await _context.StaffProfiles
                .AsNoTracking()
                .Include(staff => staff.User)
                .Where(staff => staff.User != null && staff.User.Role == "Staff")
                .OrderBy(staff => staff.Name)
                .Select(staff => MapStaffResponse(staff))
                .ToListAsync();

            return Ok(staffMembers);
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("{id:int}")]
        public async Task<ActionResult<object>> GetStaffById(int id)
        {
            var staffMember = await _context.StaffProfiles
                .AsNoTracking()
                .Include(staff => staff.User)
                .FirstOrDefaultAsync(staff => staff.Id == id && staff.User != null && staff.User.Role == "Staff");

            if (staffMember is null)
            {
                return NotFound(new { message = "Staff member not found." });
            }

            return Ok(MapStaffResponse(staffMember));
        }

        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<ActionResult<object>> CreateStaff([FromBody] UpsertStaffDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Password))
            {
                return BadRequest(new { message = "Password is required when creating staff." });
            }

            var email = NormalizeEmail(dto.Email);
            if (string.IsNullOrWhiteSpace(email))
            {
                return BadRequest(new { message = "Email is required." });
            }

            var emailExists = await _context.Users.AnyAsync(user => user.Email == email);

            if (emailExists)
            {
                return Conflict(new { message = "An account with this email already exists." });
            }

            var passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
            var user = new AppUser
            {
                Email = email,
                PasswordHash = passwordHash,
                Role = "Staff",
                Status = "Active"
            };

            var profile = new StaffProfile
            {
                User = user,
                Name = dto.Name.Trim(),
                LegacyEmail = email,
                LegacyPasswordHash = passwordHash,
                LegacyRole = "Staff"
            };

            _context.StaffProfiles.Add(profile);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetStaffById), new { id = profile.Id }, MapStaffResponse(profile));
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id:int}")]
        public async Task<ActionResult<object>> UpdateStaff(int id, [FromBody] UpsertStaffDto dto)
        {
            var entity = await _context.StaffProfiles
                .Include(staff => staff.User)
                .FirstOrDefaultAsync(staff => staff.Id == id && staff.User != null && staff.User.Role == "Staff");

            if (entity is null || entity.User is null)
            {
                return NotFound(new { message = "Staff member not found." });
            }

            var email = NormalizeEmail(dto.Email);
            if (string.IsNullOrWhiteSpace(email))
            {
                return BadRequest(new { message = "Email is required." });
            }

            var duplicateEmail = await _context.Users.AnyAsync(user => user.Id != entity.User.Id && user.Email == email);

            if (duplicateEmail)
            {
                return Conflict(new { message = "Another account already uses this email." });
            }

            entity.Name = dto.Name.Trim();
            entity.User.Email = email;
            entity.LegacyEmail = email;
            entity.LegacyRole = "Staff";

            if (!string.IsNullOrWhiteSpace(dto.Password))
            {
                var passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
                entity.User.PasswordHash = passwordHash;
                entity.LegacyPasswordHash = passwordHash;
            }

            await _context.SaveChangesAsync();

            return Ok(MapStaffResponse(entity));
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteStaff(int id)
        {
            var entity = await _context.StaffProfiles
                .Include(staff => staff.User)
                .FirstOrDefaultAsync(staff => staff.Id == id && staff.User != null && staff.User.Role == "Staff");

            if (entity is null || entity.User is null)
            {
                return NotFound(new { message = "Staff member not found." });
            }

            _context.Users.Remove(entity.User);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [Authorize(Roles = "Staff")]
        [HttpPost("customers")]
        public async Task<IActionResult> RegisterCustomerByStaff([FromBody] StaffRegisterCustomerDto dto)
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

            var customer = new CustomerProfile
            {
                User = user,
                Name = (dto.Name ?? string.Empty).Trim(),
                Phone = (dto.Phone ?? string.Empty).Trim(),
                Address = (dto.Address ?? string.Empty).Trim(),
                LegacyEmail = normalizedEmail,
                LegacyPasswordHash = passwordHash,
                LegacyRole = "Customer",
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

            _context.CustomerProfiles.Add(customer);
            await _context.SaveChangesAsync();

            var vehicle = customer.Vehicles.First();

            return Ok(new
            {
                message = "Customer registered successfully by staff.",
                customerId = customer.Id,
                customer = new
                {
                    id = customer.Id,
                    userId = user.Id,
                    name = customer.Name,
                    email = user.Email,
                    phone = customer.Phone,
                    address = customer.Address,
                    role = user.Role
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

        private static object MapStaffResponse(StaffProfile staff)
        {
            return new
            {
                id = staff.Id,
                userId = staff.User?.Id ?? 0,
                name = staff.Name,
                email = staff.User?.Email ?? staff.LegacyEmail,
                role = staff.User?.Role ?? staff.LegacyRole
            };
        }

        private static string NormalizeEmail(string? email) =>
            (email ?? string.Empty).Trim().ToLowerInvariant();
    }
}
