using Backend.Data;
using Backend.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/customers/service-history")]
    [Authorize]
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
            var customerIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

            if (customerIdClaim == null || !int.TryParse(customerIdClaim.Value, out var customerId))
            {
                return Unauthorized(new { message = "Invalid or missing token." });
            }

            var history = await _context.ServiceHistories
                .Include(s => s.Vehicle)
                .Where(s => s.CustomerId == customerId)
                .OrderByDescending(s => s.ServiceDate)
                .Select(s => new ServiceHistoryDto
                {
                    Id = s.Id,
                    CustomerId = s.CustomerId,
                    VehicleId = s.VehicleId,
                    VehicleDetails = s.Vehicle != null
                        ? $"{s.Vehicle.Make} {s.Vehicle.Model} ({s.Vehicle.LicensePlate})"
                        : "N/A",
                    ServiceDate = s.ServiceDate,
                    ServiceType = s.ServiceType,
                    Description = s.Description,
                    Cost = s.Cost
                })
                .ToListAsync();

            return Ok(history);
        }
    }
}