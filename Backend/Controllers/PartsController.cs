using Backend.Data;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin,Staff,Sales Staff,Inventory Staff,Store Keeper,Cashier,Service Advisor,Mechanic / Technician,Purchase Officer,Accountant,Customer Support,Branch Manager,Receptionist")]
    public class PartsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly NotificationService _notificationService;
        private readonly EmailService _emailService;

        public PartsController(
            AppDbContext context,
            NotificationService notificationService,
            EmailService emailService)
        {
            _context = context;
            _notificationService = notificationService;
            _emailService = emailService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Part>>> GetParts()
        {
            return Ok(await _context.Parts
                .Include(part => part.Vendor)
                .ToListAsync());
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<Part>> GetPart(int id)
        {
            var part = await _context.Parts
                .Include(existingPart => existingPart.Vendor)
                .FirstOrDefaultAsync(existingPart => existingPart.Id == id);

            if (part == null)
            {
                return NotFound($"Part with ID {id} was not found.");
            }

            return Ok(part);
        }

        [HttpPost]
        public async Task<ActionResult<Part>> CreatePart(Part part)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var vendorExists = await _context.Vendors.AnyAsync(vendor => vendor.Id == part.VendorId);
            if (!vendorExists)
            {
                return BadRequest($"Vendor with ID {part.VendorId} does not exist.");
            }

            part.Id = 0;
            part.Vendor = null;
            part.CreatedAt = DateTime.UtcNow;

            _context.Parts.Add(part);
            await _context.SaveChangesAsync();

            var createdPart = await _context.Parts
                .Include(existingPart => existingPart.Vendor)
                .FirstAsync(existingPart => existingPart.Id == part.Id);

            await _notificationService.HandlePartStockChangedAsync(createdPart.Id, _emailService);

            return CreatedAtAction(nameof(GetPart), new { id = createdPart.Id }, createdPart);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdatePart(int id, Part part)
        {
            if (id != part.Id)
            {
                return BadRequest("Route ID does not match part ID.");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var existingPart = await _context.Parts.FindAsync(id);
            if (existingPart == null)
            {
                return NotFound($"Part with ID {id} was not found.");
            }

            var vendorExists = await _context.Vendors.AnyAsync(vendor => vendor.Id == part.VendorId);
            if (!vendorExists)
            {
                return BadRequest($"Vendor with ID {part.VendorId} does not exist.");
            }

            existingPart.PartName = part.PartName;
            existingPart.Category = part.Category;
            existingPart.Price = part.Price;
            existingPart.Quantity = part.Quantity;
            existingPart.Description = part.Description;
            existingPart.VendorId = part.VendorId;

            await _context.SaveChangesAsync();
            await _notificationService.HandlePartStockChangedAsync(existingPart.Id, _emailService);

            return NoContent();
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeletePart(int id)
        {
            var part = await _context.Parts.FindAsync(id);
            if (part == null)
            {
                return NotFound($"Part with ID {id} was not found.");
            }

            _context.Parts.Remove(part);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
