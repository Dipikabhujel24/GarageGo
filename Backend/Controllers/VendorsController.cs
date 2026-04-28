using Backend.Data;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VendorsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly EmailService _emailService;
        private readonly ILogger<VendorsController> _logger;

        public VendorsController(
            AppDbContext context,
            EmailService emailService,
            ILogger<VendorsController> logger)
        {
            _context = context;
            _emailService = emailService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Vendor>>> GetVendors()
        {
            return Ok(await _context.Vendors
                .Include(vendor => vendor.Parts)
                .ToListAsync());
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<Vendor>> GetVendor(int id)
        {
            var vendor = await _context.Vendors
                .Include(existingVendor => existingVendor.Parts)
                .FirstOrDefaultAsync(existingVendor => existingVendor.Id == id);

            if (vendor == null)
            {
                return NotFound($"Vendor with ID {id} was not found.");
            }

            return Ok(vendor);
        }

        [HttpPost]
        public async Task<ActionResult<Vendor>> CreateVendor(Vendor vendor)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            vendor.Id = 0;
            vendor.CreatedAt = DateTime.UtcNow;

            _context.Vendors.Add(vendor);
            await _context.SaveChangesAsync();

            try
            {
                await _emailService.SendEmailAsync(
                    vendor.Email,
                    "Vendor Registration Successful",
                    $"Hello {vendor.VendorName}, you have been successfully registered in GarageGo.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send registration email to vendor {VendorId}.", vendor.Id);
            }

            return CreatedAtAction(nameof(GetVendor), new { id = vendor.Id }, vendor);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateVendor(int id, Vendor vendor)
        {
            if (id != vendor.Id)
            {
                return BadRequest("Route ID does not match vendor ID.");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var existingVendor = await _context.Vendors.FindAsync(id);
            if (existingVendor == null)
            {
                return NotFound($"Vendor with ID {id} was not found.");
            }

            existingVendor.VendorName = vendor.VendorName;
            existingVendor.CompanyName = vendor.CompanyName;
            existingVendor.Phone = vendor.Phone;
            existingVendor.Email = vendor.Email;
            existingVendor.Address = vendor.Address;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteVendor(int id)
        {
            var vendor = await _context.Vendors.FindAsync(id);
            if (vendor == null)
            {
                return NotFound($"Vendor with ID {id} was not found.");
            }

            _context.Vendors.Remove(vendor);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return BadRequest("Vendor cannot be deleted while parts are assigned to it.");
            }

            return NoContent();
        }
    }
}
