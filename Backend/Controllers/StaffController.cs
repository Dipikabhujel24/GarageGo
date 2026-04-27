using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
public class StaffController : ControllerBase
{
    private readonly AppDbContext _context;

    public StaffController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Staff>>> GetAllStaff()
    {
        var staff = await _context.Staff
            .AsNoTracking()
            .OrderBy(s => s.Name)
            .ToListAsync();

        return Ok(staff);
    }

    [HttpPost]
    public async Task<ActionResult<Staff>> CreateStaff([FromBody] UpsertStaffDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Password))
        {
            return BadRequest(new { message = "Password is required when creating staff." });
        }

        var email = dto.Email.Trim().ToLowerInvariant();
        var emailExists = await _context.Staff.AnyAsync(s => s.Email.ToLower() == email);

        if (emailExists)
        {
            return Conflict(new { message = "A staff member with this email already exists." });
        }

        var entity = new Staff
        {
            Name = dto.Name.Trim(),
            Email = email,
            Password = dto.Password,
            Role = dto.Role
        };

        _context.Staff.Add(entity);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAllStaff), new { id = entity.Id }, entity);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<Staff>> UpdateStaff(int id, [FromBody] UpsertStaffDto dto)
    {
        var entity = await _context.Staff.FirstOrDefaultAsync(s => s.Id == id);
        if (entity is null)
        {
            return NotFound(new { message = "Staff member not found." });
        }

        var email = dto.Email.Trim().ToLowerInvariant();
        var duplicateEmail = await _context.Staff.AnyAsync(s => s.Id != id && s.Email.ToLower() == email);

        if (duplicateEmail)
        {
            return Conflict(new { message = "Another staff member already uses this email." });
        }

        entity.Name = dto.Name.Trim();
        entity.Email = email;
        entity.Role = dto.Role;

        if (!string.IsNullOrWhiteSpace(dto.Password))
        {
            entity.Password = dto.Password;
        }

        await _context.SaveChangesAsync();

        return Ok(entity);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteStaff(int id)
    {
        var entity = await _context.Staff.FirstOrDefaultAsync(s => s.Id == id);
        if (entity is null)
        {
            return NotFound(new { message = "Staff member not found." });
        }

        _context.Staff.Remove(entity);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
