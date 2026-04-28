using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/staff-customers")]
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
        var customersQuery = _context.Customers
            .AsNoTracking()
            .Include(customer => customer.Vehicles)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(normalizedQuery))
        {
            var loweredQuery = normalizedQuery.ToLower();
            var isIdSearch = int.TryParse(normalizedQuery, out var customerId);

            customersQuery = customersQuery.Where(customer =>
                (isIdSearch && customer.Id == customerId) ||
                customer.Name.ToLower().Contains(loweredQuery) ||
                customer.Phone.ToLower().Contains(loweredQuery) ||
                customer.Vehicles.Any(vehicle =>
                    vehicle.VehicleNumber.ToLower().Contains(loweredQuery)));
        }

        var customers = await customersQuery
            .OrderBy(customer => customer.Name)
            .Take(50)
            .Select(customer => new
            {
                customer.Id,
                customer.Name,
                customer.Email,
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
        var customer = await _context.Customers
            .AsNoTracking()
            .Where(existingCustomer => existingCustomer.Id == id)
            .Select(existingCustomer => new
            {
                existingCustomer.Id,
                existingCustomer.Name,
                existingCustomer.Email,
                existingCustomer.Phone,
                existingCustomer.Address,
                existingCustomer.CreatedAt,
                Vehicles = existingCustomer.Vehicles
                    .OrderBy(vehicle => vehicle.VehicleNumber)
                    .Select(vehicle => new
                    {
                        vehicle.Id,
                        vehicle.VehicleNumber,
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
