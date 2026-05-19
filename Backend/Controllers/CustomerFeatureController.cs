using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

[ApiController]
[Route("api/customer-features")]
public class CustomerFeatureController : ControllerBase
{
    private static readonly string[] ServiceTypeOptions =
    [
        "General Service",
        "Oil Change",
        "Brake Service",
        "Engine Repair",
        "Tire Service",
        "Battery Service",
        "AC Service",
        "Transmission Service",
        "Electrical Repair",
        "Inspection"
    ];

    private readonly AppDbContext _context;

    public CustomerFeatureController(AppDbContext context)
    {
        _context = context;
    }

    [Authorize(Roles = "Customer")]
    [HttpGet("service-types")]
    public IActionResult GetServiceTypes()
    {
        return Ok(ServiceTypeOptions);
    }

    [Authorize(Roles = "Admin,Staff,Sales Staff,Receptionist")]
    [HttpGet("{customerId:int}/vehicles")]
    public async Task<IActionResult> GetVehicles(int customerId)
    {
        var vehicles = await _context.CustomerVehicles
            .AsNoTracking()
            .Where(vehicle => vehicle.CustomerId == customerId)
            .OrderBy(vehicle => vehicle.VehicleNumber)
            .Select(vehicle => new
            {
                vehicle.Id,
                vehicle.VehicleNumber,
                vehicle.Make,
                vehicle.Model,
                vehicle.Year,
                vehicle.Color,
                vehicle.VehicleType
            })
            .ToListAsync();

        return Ok(vehicles);
    }

    [Authorize(Roles = "Admin,Staff,Sales Staff,Receptionist")]
    [HttpGet("{customerId:int}/service-history")]
    public async Task<IActionResult> GetServiceHistory(int customerId)
    {
        var history = await _context.ServiceHistories
            .AsNoTracking()
            .Where(service => service.CustomerId == customerId)
            .OrderByDescending(service => service.ServiceDate)
            .Select(service => new
            {
                service.Id,
                service.VehicleId,
                VehicleNumber = service.Vehicle == null ? string.Empty : service.Vehicle.VehicleNumber,
                Vehicle = service.Vehicle == null
                    ? string.Empty
                    : $"{service.Vehicle.Make} {service.Vehicle.Model}",
                service.ServiceDate,
                service.HistoryType,
                service.Title,
                service.Description,
                service.Amount,
                service.PaymentStatus,
                service.InvoiceNumber
            })
            .ToListAsync();

        return Ok(history);
    }

    [Authorize(Roles = "Customer")]
    [HttpPost("appointments")]
    public async Task<IActionResult> BookAppointment([FromBody] CreateAppointmentDto dto)
    {
        if (!TryGetLoggedInUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid or missing token." });
        }

        var customerId = await ResolveCustomerProfileIdAsync(userId);
        if (!customerId.HasValue)
        {
            return NotFound(new { message = "Customer not found." });
        }

        var vehicleBelongsToCustomer = await _context.CustomerVehicles
            .AnyAsync(vehicle =>
                vehicle.Id == dto.VehicleId &&
                vehicle.CustomerId == customerId.Value);

        if (!vehicleBelongsToCustomer)
        {
            return BadRequest(new { message = "Selected vehicle does not belong to this customer." });
        }

        var appointment = new Appointment
        {
            CustomerId = customerId.Value,
            VehicleId = dto.VehicleId,
            AppointmentDate = DateTime.SpecifyKind(dto.AppointmentDate, DateTimeKind.Utc),
            ServiceType = dto.ServiceType.Trim(),
            Description = dto.Description.Trim(),
            Status = "Pending",
            CreatedAt = DateTime.UtcNow
        };

        _context.Appointments.Add(appointment);
        await _context.SaveChangesAsync();

        return Created($"/api/customer-features/appointments/{appointment.Id}", appointment);
    }

    [Authorize(Roles = "Customer")]
    [HttpPost("part-requests")]
    public async Task<IActionResult> RequestPart([FromBody] CreateUnavailablePartRequestDto dto)
    {
        if (!TryGetLoggedInUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid or missing token." });
        }

        var customerId = await ResolveCustomerProfileIdAsync(userId);
        if (!customerId.HasValue)
        {
            return NotFound(new { message = "Customer not found." });
        }

        var partRequest = new UnavailablePartRequest
        {
            CustomerId = customerId.Value,
            PartName = dto.PartName.Trim(),
            VehicleModel = dto.VehicleModel.Trim(),
            Description = dto.Description.Trim(),
            Status = "Pending",
            CreatedAt = DateTime.UtcNow
        };

        _context.UnavailablePartRequests.Add(partRequest);
        await _context.SaveChangesAsync();

        return Created($"/api/customer-features/part-requests/{partRequest.Id}", partRequest);
    }

    [Authorize(Roles = "Customer")]
    [HttpPost("service-reviews")]
    public async Task<IActionResult> ReviewService([FromBody] CreateServiceReviewDto dto)
    {
        if (!TryGetLoggedInUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid or missing token." });
        }

        var customerId = await ResolveCustomerProfileIdAsync(userId);
        if (!customerId.HasValue)
        {
            return NotFound(new { message = "Customer not found." });
        }

        var serviceReview = new ServiceReview
        {
            CustomerId = customerId.Value,
            Rating = dto.Rating,
            Comment = dto.Comment.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.ServiceReviews.Add(serviceReview);
        await _context.SaveChangesAsync();

        return Created($"/api/customer-features/service-reviews/{serviceReview.Id}", serviceReview);
    }

    private async Task<int?> ResolveCustomerProfileIdAsync(int userId)
    {
        return await _context.CustomerProfiles
            .Where(profile => profile.UserId == userId)
            .Select(profile => (int?)profile.Id)
            .FirstOrDefaultAsync();
    }

    private bool TryGetLoggedInUserId(out int userId)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        userId = 0;

        return userIdClaim != null && int.TryParse(userIdClaim.Value, out userId);
    }
}
