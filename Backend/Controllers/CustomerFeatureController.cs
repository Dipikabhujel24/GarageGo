using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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

    [HttpGet("service-types")]
    public IActionResult GetServiceTypes()
    {
        return Ok(ServiceTypeOptions);
    }

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
                service.CustomerVehicleId,
                VehicleNumber = service.Vehicle == null ? string.Empty : service.Vehicle.VehicleNumber,
                Vehicle = service.Vehicle == null
                    ? string.Empty
                    : $"{service.Vehicle.Make} {service.Vehicle.Model}",
                service.ServiceDate,
                service.ServiceType,
                service.Description,
                service.MechanicName,
                service.TotalCost,
                service.Status
            })
            .ToListAsync();

        return Ok(history);
    }

    [HttpPost("appointments")]
    public async Task<IActionResult> BookAppointment([FromBody] CreateAppointmentDto dto)
    {
        var vehicleBelongsToCustomer = await _context.CustomerVehicles
            .AnyAsync(vehicle =>
                vehicle.Id == dto.VehicleId &&
                vehicle.CustomerId == dto.CustomerId);

        if (!vehicleBelongsToCustomer)
        {
            return BadRequest(new { message = "Selected vehicle does not belong to this customer." });
        }

        var appointment = new Appointment
        {
            CustomerId = dto.CustomerId,
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

    [HttpPost("part-requests")]
    public async Task<IActionResult> RequestPart([FromBody] CreateUnavailablePartRequestDto dto)
    {
        var partRequest = new UnavailablePartRequest
        {
            CustomerId = dto.CustomerId,
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

    [HttpPost("service-reviews")]
    public async Task<IActionResult> ReviewService([FromBody] CreateServiceReviewDto dto)
    {
        var serviceReview = new ServiceReview
        {
            CustomerId = dto.CustomerId,
            Rating = dto.Rating,
            Comment = dto.Comment.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.ServiceReviews.Add(serviceReview);
        await _context.SaveChangesAsync();

        return Created($"/api/customer-features/service-reviews/{serviceReview.Id}", serviceReview);
    }
}
