using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin,Staff,Sales Staff,Inventory Staff,Store Keeper,Cashier,Service Advisor,Mechanic / Technician,Purchase Officer,Accountant,Customer Support,Branch Manager,Receptionist")]
public class AdminRequestsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly NotificationService _notificationService;
    private readonly EmailService _emailService;

    public AdminRequestsController(
        AppDbContext context,
        NotificationService notificationService,
        EmailService emailService)
    {
        _context = context;
        _notificationService = notificationService;
        _emailService = emailService;
    }

    [HttpGet("appointments")]
    public async Task<IActionResult> GetAppointments()
    {
        var appointments = await BuildAppointmentRowsAsync();
        return Ok(appointments);
    }

    [HttpPut("appointments/{id:int}/status")]
    public async Task<IActionResult> UpdateAppointmentStatus(int id, [FromBody] UpdateRequestStatusDto dto)
    {
        if (!AppointmentStatuses.TryNormalize(dto.Status, out var normalizedStatus))
        {
            return BadRequest(new
            {
                message = $"Invalid status. Allowed values: {string.Join(", ", AppointmentStatuses.All)}"
            });
        }

        var appointment = await _context.Appointments.FirstOrDefaultAsync(item => item.Id == id);
        if (appointment is null)
        {
            return NotFound(new { message = "Appointment not found." });
        }

        var previousStatus = appointment.Status;
        var now = DateTime.UtcNow;

        appointment.Status = normalizedStatus;
        if (dto.AdminNotes is not null)
        {
            appointment.AdminNotes = dto.AdminNotes.Trim();
        }
        appointment.UpdatedAt = now;
        appointment.StatusUpdatedAt = now;

        await _context.SaveChangesAsync();

        await NotifyCustomerForAppointmentAsync(appointment, previousStatus, normalizedStatus);

        var rows = await BuildAppointmentRowsAsync(id);
        return Ok(rows.FirstOrDefault());
    }

    [HttpGet("part-requests")]
    public async Task<IActionResult> GetPartRequests()
    {
        var requests = await BuildPartRequestRowsAsync();
        return Ok(requests);
    }

    [HttpPut("part-requests/{id:int}/status")]
    public async Task<IActionResult> UpdatePartRequestStatus(int id, [FromBody] UpdateRequestStatusDto dto)
    {
        if (!PartRequestStatuses.TryNormalize(dto.Status, out var normalizedStatus))
        {
            return BadRequest(new
            {
                message = $"Invalid status. Allowed values: {string.Join(", ", PartRequestStatuses.All)}"
            });
        }

        var partRequest = await _context.UnavailablePartRequests.FirstOrDefaultAsync(item => item.Id == id);
        if (partRequest is null)
        {
            return NotFound(new { message = "Part request not found." });
        }

        var previousStatus = partRequest.Status;
        var now = DateTime.UtcNow;

        partRequest.Status = normalizedStatus;
        if (dto.AdminNotes is not null)
        {
            partRequest.AdminNotes = dto.AdminNotes.Trim();
        }
        partRequest.UpdatedAt = now;
        partRequest.StatusUpdatedAt = now;

        await _context.SaveChangesAsync();

        await NotifyCustomerForPartRequestAsync(partRequest, previousStatus, normalizedStatus);

        var rows = await BuildPartRequestRowsAsync(id);
        return Ok(rows.FirstOrDefault());
    }

    private async Task NotifyCustomerForAppointmentAsync(
        Appointment appointment,
        string previousStatus,
        string newStatus)
    {
        if (string.Equals(previousStatus, newStatus, StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var customer = await _context.CustomerProfiles
            .AsNoTracking()
            .Include(profile => profile.User)
            .FirstOrDefaultAsync(profile => profile.Id == appointment.CustomerId);

        if (customer?.UserId is not int userId)
        {
            return;
        }

        var email = customer.User?.Email ?? customer.LegacyEmail;
        await _notificationService.NotifyAppointmentStatusChangedAsync(
            appointment,
            userId,
            customer.Name,
            previousStatus,
            newStatus,
            _emailService,
            email);
    }

    private async Task NotifyCustomerForPartRequestAsync(
        UnavailablePartRequest partRequest,
        string previousStatus,
        string newStatus)
    {
        if (string.Equals(previousStatus, newStatus, StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var customer = await _context.CustomerProfiles
            .AsNoTracking()
            .Include(profile => profile.User)
            .FirstOrDefaultAsync(profile => profile.Id == partRequest.CustomerId);

        if (customer?.UserId is not int userId)
        {
            return;
        }

        var email = customer.User?.Email ?? customer.LegacyEmail;
        await _notificationService.NotifyPartRequestStatusChangedAsync(
            partRequest,
            userId,
            customer.Name,
            previousStatus,
            newStatus,
            _emailService,
            email);
    }

    private async Task<List<AppointmentListItemDto>> BuildAppointmentRowsAsync(int? id = null)
    {
        var query = _context.Appointments.AsNoTracking();

        if (id.HasValue)
        {
            query = query.Where(appointment => appointment.Id == id.Value);
        }

        return await (
            from appointment in query
            join customer in _context.CustomerProfiles.AsNoTracking()
                on appointment.CustomerId equals customer.Id into customerJoin
            from customer in customerJoin.DefaultIfEmpty()
            join user in _context.Users.AsNoTracking()
                on customer.UserId equals user.Id into userJoin
            from user in userJoin.DefaultIfEmpty()
            join vehicle in _context.CustomerVehicles.AsNoTracking()
                on appointment.VehicleId equals vehicle.Id into vehicleJoin
            from vehicle in vehicleJoin.DefaultIfEmpty()
            orderby appointment.AppointmentDate descending
            select new AppointmentListItemDto
            {
                Id = appointment.Id,
                CustomerId = appointment.CustomerId,
                CustomerName = customer == null ? null : customer.Name,
                CustomerEmail = user == null ? customer.LegacyEmail : user.Email,
                CustomerPhone = customer == null ? null : customer.Phone,
                VehicleId = appointment.VehicleId,
                Vehicle = vehicle == null
                    ? null
                    : new AppointmentVehicleDto
                    {
                        VehicleNumber = vehicle.VehicleNumber,
                        Make = vehicle.Make,
                        Model = vehicle.Model,
                        Year = vehicle.Year,
                        LicensePlate = vehicle.LicensePlate
                    },
                AppointmentDate = appointment.AppointmentDate,
                ServiceType = appointment.ServiceType,
                Description = appointment.Description,
                Status = appointment.Status,
                AdminNotes = appointment.AdminNotes,
                CreatedAt = appointment.CreatedAt,
                UpdatedAt = appointment.UpdatedAt,
                StatusUpdatedAt = appointment.StatusUpdatedAt
            }).ToListAsync();
    }

    private async Task<List<PartRequestListItemDto>> BuildPartRequestRowsAsync(int? id = null)
    {
        var query = _context.UnavailablePartRequests.AsNoTracking();

        if (id.HasValue)
        {
            query = query.Where(request => request.Id == id.Value);
        }

        return await (
            from request in query
            join customer in _context.CustomerProfiles.AsNoTracking()
                on request.CustomerId equals customer.Id into customerJoin
            from customer in customerJoin.DefaultIfEmpty()
            join user in _context.Users.AsNoTracking()
                on customer.UserId equals user.Id into userJoin
            from user in userJoin.DefaultIfEmpty()
            orderby request.CreatedAt descending
            select new PartRequestListItemDto
            {
                Id = request.Id,
                CustomerId = request.CustomerId,
                CustomerName = customer == null ? null : customer.Name,
                CustomerEmail = user == null ? customer.LegacyEmail : user.Email,
                CustomerPhone = customer == null ? null : customer.Phone,
                PartName = request.PartName,
                VehicleModel = request.VehicleModel,
                Description = request.Description,
                Status = request.Status,
                AdminNotes = request.AdminNotes,
                CreatedAt = request.CreatedAt,
                UpdatedAt = request.UpdatedAt,
                StatusUpdatedAt = request.StatusUpdatedAt
            }).ToListAsync();
    }
}
