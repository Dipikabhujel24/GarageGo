using Backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Backend.Controllers;

[ApiController]
[Route("api/customer")]
[Authorize(Roles = "Customer")]
public class CustomerRequestsController : ControllerBase
{
    private readonly AppDbContext _context;

    public CustomerRequestsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("appointments")]
    public async Task<IActionResult> GetMyAppointments()
    {
        var customerId = await ResolveCustomerProfileIdAsync();
        if (!customerId.HasValue)
        {
            return NotFound(new { message = "Customer not found." });
        }

        var appointments = await (
            from appointment in _context.Appointments.AsNoTracking()
            where appointment.CustomerId == customerId.Value
            join vehicle in _context.CustomerVehicles.AsNoTracking()
                on appointment.VehicleId equals vehicle.Id into vehicleJoin
            from vehicle in vehicleJoin.DefaultIfEmpty()
            orderby appointment.AppointmentDate descending
            select new
            {
                appointment.Id,
                appointment.CustomerId,
                appointment.VehicleId,
                Vehicle = vehicle == null
                    ? null
                    : new
                    {
                        vehicle.VehicleNumber,
                        vehicle.Make,
                        vehicle.Model,
                        vehicle.Year,
                        vehicle.LicensePlate
                    },
                appointment.AppointmentDate,
                appointment.ServiceType,
                appointment.Description,
                appointment.Status,
                appointment.AdminNotes,
                appointment.CreatedAt,
                appointment.UpdatedAt,
                appointment.StatusUpdatedAt
            }).ToListAsync();

        return Ok(appointments);
    }

    [HttpGet("part-requests")]
    public async Task<IActionResult> GetMyPartRequests()
    {
        var customerId = await ResolveCustomerProfileIdAsync();
        if (!customerId.HasValue)
        {
            return NotFound(new { message = "Customer not found." });
        }

        var requests = await _context.UnavailablePartRequests
            .AsNoTracking()
            .Where(request => request.CustomerId == customerId.Value)
            .OrderByDescending(request => request.CreatedAt)
            .Select(request => new
            {
                request.Id,
                request.CustomerId,
                request.PartName,
                request.VehicleModel,
                request.Description,
                request.Status,
                request.AdminNotes,
                request.CreatedAt,
                request.UpdatedAt,
                request.StatusUpdatedAt
            })
            .ToListAsync();

        return Ok(requests);
    }

    private async Task<int?> ResolveCustomerProfileIdAsync()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim is null || !int.TryParse(userIdClaim.Value, out var userId))
        {
            return null;
        }

        return await _context.CustomerProfiles
            .Where(profile => profile.UserId == userId)
            .Select(profile => (int?)profile.Id)
            .FirstOrDefaultAsync();
    }
}
