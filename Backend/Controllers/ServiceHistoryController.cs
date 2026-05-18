using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/customers/service-history")]
    [Authorize(Roles = "Customer")]
    public class ServiceHistoryController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ServiceHistoryController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetServiceHistory()
        {
            if (!TryGetLoggedInUserId(out var userId))
            {
                return Unauthorized(new { message = "Invalid or missing token." });
            }

            var customerId = await _context.CustomerProfiles
                .Where(profile => profile.UserId == userId)
                .Select(profile => (int?)profile.Id)
                .FirstOrDefaultAsync();

            if (!customerId.HasValue)
            {
                return NotFound(new { message = "Customer not found." });
            }

            var records = await _context.ServiceHistories
                .AsNoTracking()
                .Include(s => s.Vehicle)
                .Where(s => s.CustomerId == customerId.Value)
                .OrderByDescending(s => s.ServiceDate)
                .ToListAsync();

            var history = records.Select(MapToDto).ToList();

            return Ok(history);
        }

        [HttpPost("seed-test-data")]
        public async Task<IActionResult> SeedTestData()
        {
            if (!TryGetLoggedInUserId(out var userId))
            {
                return Unauthorized(new { message = "Invalid or missing token." });
            }

            var customerId = await _context.CustomerProfiles
                .Where(profile => profile.UserId == userId)
                .Select(profile => (int?)profile.Id)
                .FirstOrDefaultAsync();

            if (!customerId.HasValue)
            {
                return NotFound(new { message = "Customer not found." });
            }

            var vehicleId = await _context.CustomerVehicles
                .Where(v => v.CustomerId == customerId.Value)
                .Select(v => (int?)v.Id)
                .FirstOrDefaultAsync();

            var now = DateTime.UtcNow;
            var sampleRecords = new List<ServiceHistory>
            {
                new()
                {
                    CustomerId = customerId.Value,
                    VehicleId = vehicleId,
                    HistoryType = "Service",
                    Title = "Oil Change and Inspection",
                    Description = "Engine oil replacement, filter check, fluid top-up, and multi-point inspection.",
                    Amount = 4500,
                    PaymentStatus = "Paid",
                    InvoiceNumber = "GG-INV-1001",
                    ServiceDate = now.AddDays(-12)
                },
                new()
                {
                    CustomerId = customerId.Value,
                    VehicleId = vehicleId,
                    HistoryType = "Service",
                    Title = "Tyre Rotation",
                    Description = "Tyre rotation and balancing for smoother daily driving.",
                    Amount = 3000,
                    PaymentStatus = "Credit",
                    InvoiceNumber = "GG-INV-1002",
                    ServiceDate = now.AddDays(-5)
                },
                new()
                {
                    CustomerId = customerId.Value,
                    VehicleId = null,
                    HistoryType = "Purchase",
                    Title = "Brake Pads Purchase",
                    Description = "Front brake pads and related consumables purchased from the garage store.",
                    Amount = 8200,
                    PaymentStatus = "Pending",
                    InvoiceNumber = null,
                    ServiceDate = now.AddDays(-2)
                }
            };

            _context.ServiceHistories.AddRange(sampleRecords);
            await _context.SaveChangesAsync();

            var createdIds = sampleRecords.Select(record => record.Id).ToList();
            var createdRecords = await _context.ServiceHistories
                .AsNoTracking()
                .Include(s => s.Vehicle)
                .Where(s => createdIds.Contains(s.Id))
                .OrderByDescending(s => s.ServiceDate)
                .ToListAsync();

            return Ok(createdRecords.Select(MapToDto).ToList());
        }

        private static ServiceHistoryDto MapToDto(ServiceHistory history)
        {
            return new ServiceHistoryDto
            {
                Id = history.Id,
                CustomerId = history.CustomerId,
                VehicleId = history.VehicleId,
                VehicleDetails = history.Vehicle != null
                    ? $"{history.Vehicle.Make} {history.Vehicle.Model} ({history.Vehicle.Year}) - {history.Vehicle.LicensePlate}"
                    : string.Empty,
                HistoryType = history.HistoryType,
                Title = history.Title,
                Description = history.Description,
                Amount = history.Amount,
                PaymentStatus = history.PaymentStatus,
                InvoiceNumber = history.InvoiceNumber,
                ServiceDate = history.ServiceDate
            };
        }

        private bool TryGetLoggedInUserId(out int userId)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            userId = 0;

            return userIdClaim != null && int.TryParse(userIdClaim.Value, out userId);
        }
    }
}
