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
        private static readonly List<string> StaffAccountRoles = new()
        {
            "Admin",
            "Staff",
            "Sales Staff",
            "Inventory Staff",
            "Store Keeper",
            "Cashier",
            "Service Advisor",
            "Mechanic / Technician",
            "Purchase Officer",
            "Accountant",
            "Customer Support",
            "Branch Manager",
            "Receptionist",
        };

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
                .Where(staff => staff.User != null && StaffAccountRoles.Contains(staff.User.Role))
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
                .FirstOrDefaultAsync(staff => staff.Id == id && staff.User != null && StaffAccountRoles.Contains(staff.User.Role));

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

            var role = NormalizeStaffRole(dto.Role);
            if (role is null)
            {
                return BadRequest(new { message = "Select a valid garage staff role." });
            }

            var passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
            var user = new AppUser
            {
                Email = email,
                PasswordHash = passwordHash,
                Role = role,
                Status = NormalizeStatus(dto.Status)
            };

            var profile = new StaffProfile
            {
                User = user,
                Name = dto.Name.Trim(),
                LegacyEmail = email,
                LegacyPasswordHash = passwordHash,
                LegacyRole = user.Role
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
                .FirstOrDefaultAsync(staff => staff.Id == id && staff.User != null && StaffAccountRoles.Contains(staff.User.Role));

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

            var nextRole = NormalizeStaffRole(dto.Role);
            var nextStatus = NormalizeStatus(dto.Status);
            if (nextRole is null)
            {
                return BadRequest(new { message = "Select a valid garage staff role." });
            }

            if (entity.User.Role == "Admin"
                && (nextRole != "Admin" || nextStatus == "Disabled")
                && await CountActiveAdminsAsync(entity.User.Id) == 0)
            {
                return BadRequest(new { message = "At least one active admin account must remain." });
            }

            entity.Name = dto.Name.Trim();
            entity.User.Email = email;
            entity.User.Role = nextRole;
            entity.User.Status = nextStatus;
            entity.LegacyEmail = email;
            entity.LegacyRole = entity.User.Role;

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
                .FirstOrDefaultAsync(staff => staff.Id == id && staff.User != null && StaffAccountRoles.Contains(staff.User.Role));

            if (entity is null || entity.User is null)
            {
                return NotFound(new { message = "Staff member not found." });
            }

            if (entity.User.Role == "Admin" && await CountActiveAdminsAsync(entity.User.Id) == 0)
            {
                return BadRequest(new { message = "At least one active admin account must remain." });
            }

            _context.Users.Remove(entity.User);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [Authorize(Roles = "Admin")]
        [HttpPatch("{id:int}/status")]
        public async Task<ActionResult<object>> UpdateStaffStatus(int id, [FromBody] UpsertStaffDto dto)
        {
            var entity = await _context.StaffProfiles
                .Include(staff => staff.User)
                .FirstOrDefaultAsync(staff => staff.Id == id && staff.User != null && StaffAccountRoles.Contains(staff.User.Role));

            if (entity is null || entity.User is null)
            {
                return NotFound(new { message = "Staff member not found." });
            }

            var nextStatus = NormalizeStatus(dto.Status);
            if (entity.User.Role == "Admin" && nextStatus == "Disabled" && await CountActiveAdminsAsync(entity.User.Id) == 0)
            {
                return BadRequest(new { message = "At least one active admin account must remain." });
            }

            entity.User.Status = nextStatus;
            await _context.SaveChangesAsync();

            return Ok(MapStaffResponse(entity));
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("activity")]
        public async Task<ActionResult<IEnumerable<object>>> GetStaffActivity()
        {
            var activities = await _context.StaffProfiles
                .AsNoTracking()
                .Include(staff => staff.User)
                .Where(staff => staff.User != null && StaffAccountRoles.Contains(staff.User.Role))
                .OrderByDescending(staff => staff.User!.CreatedAt)
                .Select(staff => new
                {
                    staffId = staff.Id,
                    name = staff.Name,
                    email = staff.User!.Email,
                    role = staff.User.Role,
                    status = staff.User.Status,
                    activity = staff.User.Status == "Disabled" ? "Account disabled" : "Account active",
                    occurredAt = staff.User.CreatedAt
                })
                .Take(20)
                .ToListAsync();

            return Ok(activities);
        }

        [Authorize(Roles = "Admin,Staff,Sales Staff,Receptionist")]
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
                Vehicles = new List<CustomerVehicle>
                {
                    new CustomerVehicle
                    {
                        Make = (dto.VehicleMake ?? string.Empty).Trim(),
                        Model = (dto.VehicleModel ?? string.Empty).Trim(),
                        Year = dto.VehicleYear,
                        LicensePlate = (dto.LicensePlate ?? string.Empty).Trim()
                    }
                }
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
                role = staff.User?.Role ?? staff.LegacyRole,
                status = staff.User?.Status ?? "Active",
                createdAt = staff.User?.CreatedAt
            };
        }

        private static string NormalizeEmail(string? email) =>
            (email ?? string.Empty).Trim().ToLowerInvariant();

        private static string? NormalizeStaffRole(string? role)
        {
            var normalizedRole = (role ?? string.Empty).Trim();

            if (string.Equals(normalizedRole, "Staff", StringComparison.OrdinalIgnoreCase))
            {
                return "Sales Staff";
            }

            return StaffAccountRoles.FirstOrDefault(allowedRole =>
                !string.Equals(allowedRole, "Staff", StringComparison.OrdinalIgnoreCase) &&
                string.Equals(allowedRole, normalizedRole, StringComparison.OrdinalIgnoreCase));
        }

        private static string NormalizeStatus(string? status) =>
            string.Equals(status, "Disabled", StringComparison.OrdinalIgnoreCase) ? "Disabled" : "Active";

        private async Task<int> CountActiveAdminsAsync(int excludedUserId) =>
            await _context.Users.CountAsync(user =>
                user.Id != excludedUserId &&
                user.Role == "Admin" &&
                user.Status == "Active");
    }
}
