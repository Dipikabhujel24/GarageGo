using Backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/staff-customers")]
[Authorize(Roles = "Staff,Admin")]
public class StaffCustomerController : ControllerBase
{
    private readonly AppDbContext _context;

    public StaffCustomerController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("search")]
    public async Task<IActionResult> SearchCustomers([FromQuery] string? query)
    {
        var normalizedQuery = query?.Trim();
        var customersQuery = _context.CustomerProfiles
            .AsNoTracking()
            .Include(customer => customer.User)
            .Include(customer => customer.Vehicles)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(normalizedQuery))
        {
            var loweredQuery = normalizedQuery.ToLower();
            var isIdSearch = int.TryParse(normalizedQuery, out var customerId);
            var isShortNumericSearch = isIdSearch && normalizedQuery.Length <= 4;

            if (isShortNumericSearch)
            {
                var exactCustomerExists = await customersQuery.AnyAsync(customer => customer.Id == customerId);

                customersQuery = exactCustomerExists
                    ? customersQuery.Where(customer => customer.Id == customerId)
                    : customersQuery.Where(customer =>
                        customer.Vehicles.Any(vehicle =>
                            vehicle.VehicleNumber.ToLower().Contains(loweredQuery) ||
                            vehicle.LicensePlate.ToLower().Contains(loweredQuery)));
            }
            else
            {
                customersQuery = customersQuery.Where(customer =>
                    (isIdSearch && customer.Id == customerId) ||
                    customer.Name.ToLower().Contains(loweredQuery) ||
                    customer.Phone.ToLower().Contains(loweredQuery) ||
                    (customer.User != null && customer.User.Email.ToLower().Contains(loweredQuery)) ||
                    customer.Vehicles.Any(vehicle =>
                        vehicle.VehicleNumber.ToLower().Contains(loweredQuery) ||
                        vehicle.LicensePlate.ToLower().Contains(loweredQuery)));
            }
        }

        var customers = await customersQuery
            .OrderBy(customer => customer.Name)
            .Take(50)
            .Select(customer => new
            {
                customer.Id,
                customer.Name,
                Email = customer.User == null ? customer.LegacyEmail : customer.User.Email,
                customer.Phone,
                customer.Address,
                VehicleNumbers = customer.Vehicles
                    .OrderBy(vehicle => vehicle.VehicleNumber)
                    .Select(vehicle => vehicle.VehicleNumber)
                    .ToList()
            })
            .ToListAsync();

        return Ok(customers);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetCustomerDetails(int id)
    {
        var customer = await _context.CustomerProfiles
            .AsNoTracking()
            .Include(existingCustomer => existingCustomer.User)
            .Where(existingCustomer => existingCustomer.Id == id)
            .Select(existingCustomer => new
            {
                existingCustomer.Id,
                existingCustomer.Name,
                Email = existingCustomer.User == null ? existingCustomer.LegacyEmail : existingCustomer.User.Email,
                existingCustomer.Phone,
                existingCustomer.Address,
                existingCustomer.CreatedAt,
                Vehicles = existingCustomer.Vehicles
                    .OrderBy(vehicle => vehicle.VehicleNumber)
                    .Select(vehicle => new
                    {
                        vehicle.Id,
                        vehicle.VehicleNumber,
                        vehicle.LicensePlate,
                        vehicle.Make,
                        vehicle.Model,
                        vehicle.Year,
                        vehicle.Color,
                        vehicle.VehicleType,
                        vehicle.CreatedAt
                    })
                    .ToList(),
                ServiceHistory = existingCustomer.ServiceHistories
                    .OrderByDescending(history => history.ServiceDate)
                    .Select(history => new
                    {
                        history.Id,
                        history.VehicleId,
                        VehicleNumber = history.Vehicle == null ? string.Empty : history.Vehicle.VehicleNumber,
                        Vehicle = history.Vehicle == null
                            ? string.Empty
                            : $"{history.Vehicle.Make} {history.Vehicle.Model}",
                        history.ServiceDate,
                        history.HistoryType,
                        history.Title,
                        history.Description,
                        history.Amount,
                        history.PaymentStatus,
                        history.InvoiceNumber
                    })
                    .ToList()
            })
            .FirstOrDefaultAsync();

        if (customer is null)
        {
            return NotFound(new { message = "Customer not found." });
        }

        return Ok(customer);
    }
}
