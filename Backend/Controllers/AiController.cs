using Backend.DTOs;
using Backend.Services;
using Backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/ai")]
    [Authorize]
    public class AiController : ControllerBase
    {
        private const string StaffRoles =
            "Admin,Staff,Sales Staff,Inventory Staff,Store Keeper,Cashier,Service Advisor,Mechanic / Technician,Purchase Officer,Accountant,Customer Support,Branch Manager,Receptionist";

        private readonly PredictiveMaintenanceService _predictionService;
        private readonly AppDbContext _context;

        public AiController(PredictiveMaintenanceService predictionService, AppDbContext context)
        {
            _predictionService = predictionService;
            _context = context;
        }

        [HttpGet("predict/{customerId:int}")]
        [Authorize(Roles = "Customer," + StaffRoles)]
        public async Task<ActionResult<MaintenancePredictionResponseDto>> Predict(int customerId, CancellationToken cancellationToken)
        {
            if (User.IsInRole("Customer"))
            {
                if (!TryGetLoggedInUserId(out var userId))
                {
                    return Unauthorized(new { message = "Invalid or missing token." });
                }

                var ownCustomerId = await _context.CustomerProfiles
                    .AsNoTracking()
                    .Where(profile => profile.UserId == userId)
                    .Select(profile => (int?)profile.Id)
                    .FirstOrDefaultAsync(cancellationToken);

                if (!ownCustomerId.HasValue)
                {
                    return NotFound(new { message = "Customer not found." });
                }

                if (ownCustomerId.Value != customerId)
                {
                    return Forbid();
                }
            }

            var result = await _predictionService.PredictAsync(customerId, cancellationToken);

            if (!result.AiAvailable && result.Message == "Customer not found.")
            {
                return NotFound(result);
            }

            if (!result.AiAvailable)
            {
                return Ok(result);
            }

            return Ok(result);
        }

        private bool TryGetLoggedInUserId(out int userId)
        {
            userId = 0;
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            return userIdClaim != null && int.TryParse(userIdClaim.Value, out userId);
        }
    }
}
