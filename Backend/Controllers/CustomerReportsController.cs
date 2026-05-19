using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    public class RegularCustomerReportDto
    {
        public int CustomerId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public int TotalVisitsServices { get; set; }
    }

    public class HighSpenderReportDto
    {
        public int CustomerId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public decimal TotalSpent { get; set; }
    }

    public class PendingCreditReportDto
    {
        public int CustomerId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public decimal PendingAmount { get; set; }
        public DateTime? LastPaymentDate { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class SeedDemoCustomerReportsResponseDto
    {
        public string Message { get; set; } = string.Empty;
        public int RegularCustomerId { get; set; }
        public int HighSpenderCustomerId { get; set; }
        public int PendingCreditCustomerId { get; set; }
    }

    [ApiController]
    [Route("api/reports/customers")]
    [Authorize(Roles = "Admin,Staff")]
    public class CustomerReportsController : ControllerBase
    {
        private static readonly string[] PendingStatuses =
        {
            "pending",
            "unpaid",
            "credit",
            "partial",
            "partially paid"
        };

        private readonly AppDbContext _context;

        public CustomerReportsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("regulars")]
        public async Task<ActionResult<IEnumerable<RegularCustomerReportDto>>> GetRegularCustomers()
        {
            var appointmentCounts = await _context.Appointments
                .AsNoTracking()
                .GroupBy(appointment => appointment.CustomerId)
                .Select(group => new { CustomerId = group.Key, Count = group.Count() })
                .ToListAsync();
            var serviceHistoryCounts = await _context.ServiceHistories
                .AsNoTracking()
                .GroupBy(history => history.CustomerId)
                .Select(group => new { CustomerId = group.Key, Count = group.Count() })
                .ToListAsync();
            var saleCounts = await _context.Sales
                .AsNoTracking()
                .GroupBy(sale => sale.CustomerId)
                .Select(group => new { CustomerId = group.Key, Count = group.Count() })
                .ToListAsync();
            var partRequestCounts = await _context.UnavailablePartRequests
                .AsNoTracking()
                .GroupBy(request => request.CustomerId)
                .Select(group => new { CustomerId = group.Key, Count = group.Count() })
                .ToListAsync();

            var activityCounts = appointmentCounts
                .Concat(serviceHistoryCounts)
                .Concat(saleCounts)
                .Concat(partRequestCounts)
                .GroupBy(activity => activity.CustomerId)
                .Select(group => new
                {
                    CustomerId = group.Key,
                    Count = group.Sum(activity => activity.Count)
                })
                .Where(activity => activity.Count > 1)
                .ToList();

            if (activityCounts.Count == 0)
            {
                return Ok(Array.Empty<RegularCustomerReportDto>());
            }

            var customerIds = activityCounts
                .Select(activity => activity.CustomerId)
                .Distinct()
                .ToList();
            var activityCountByCustomerId = activityCounts.ToDictionary(
                activity => activity.CustomerId,
                activity => activity.Count);

            var customers = await _context.CustomerProfiles
                .Include(customer => customer.User)
                .AsNoTracking()
                .Where(customer => customerIds.Contains(customer.Id))
                .ToListAsync();

            var report = customers
                .Select(customer => new RegularCustomerReportDto
                {
                    CustomerId = customer.Id,
                    Name = customer.Name,
                    Phone = customer.Phone,
                    Email = customer.User != null ? customer.User.Email : customer.LegacyEmail,
                    TotalVisitsServices = activityCountByCustomerId.GetValueOrDefault(customer.Id)
                })
                .OrderByDescending(customer => customer.TotalVisitsServices)
                .ThenBy(customer => customer.Name)
                .ToList();

            return Ok(report);
        }

        [HttpGet("high-spenders")]
        public async Task<ActionResult<IEnumerable<HighSpenderReportDto>>> GetHighSpenders()
        {
            var sales = await _context.Sales
                .AsNoTracking()
                .ToListAsync();

            if (sales.Count == 0)
            {
                return Ok(Array.Empty<HighSpenderReportDto>());
            }

            var customerIds = sales
                .Select(sale => sale.CustomerId)
                .Distinct()
                .ToList();

            var invoiceHistories = await _context.ServiceHistories
                .AsNoTracking()
                .Where(history =>
                    customerIds.Contains(history.CustomerId) &&
                    history.InvoiceNumber != null &&
                    history.InvoiceNumber != "")
                .ToListAsync();

            var salesTotalByCustomerId = sales
                .GroupBy(sale => sale.CustomerId)
                .ToDictionary(group => group.Key, group => group.Sum(sale => sale.TotalAmount));
            var invoiceTotalByCustomerId = invoiceHistories
                .GroupBy(history => history.CustomerId)
                .ToDictionary(group => group.Key, group => group.Sum(history => history.Amount));

            var customers = await _context.CustomerProfiles
                .Include(customer => customer.User)
                .AsNoTracking()
                .Where(customer => customerIds.Contains(customer.Id))
                .ToListAsync();

            var report = customers
                .Select(customer => new HighSpenderReportDto
                {
                    CustomerId = customer.Id,
                    Name = customer.Name,
                    Phone = customer.Phone,
                    Email = customer.User != null ? customer.User.Email : customer.LegacyEmail,
                    TotalSpent = salesTotalByCustomerId.GetValueOrDefault(customer.Id) +
                        invoiceTotalByCustomerId.GetValueOrDefault(customer.Id)
                })
                .Where(customer => customer.TotalSpent > 0)
                .OrderByDescending(customer => customer.TotalSpent)
                .ThenBy(customer => customer.Name)
                .ToList();

            return Ok(report);
        }

        [HttpGet("pending-credits")]
        public async Task<ActionResult<IEnumerable<PendingCreditReportDto>>> GetPendingCredits()
        {
            var pendingServiceHistories = await _context.ServiceHistories
                .AsNoTracking()
                .Where(history =>
                    history.PaymentStatus != null &&
                    PendingStatuses.Contains(history.PaymentStatus.ToLower()))
                .ToListAsync();

            if (pendingServiceHistories.Count == 0)
            {
                return Ok(Array.Empty<PendingCreditReportDto>());
            }

            var customerIds = pendingServiceHistories
                .Select(history => history.CustomerId)
                .Distinct()
                .ToList();

            var customers = await _context.CustomerProfiles
                .Include(customer => customer.User)
                .AsNoTracking()
                .Where(customer => customerIds.Contains(customer.Id))
                .ToListAsync();

            var pendingHistoriesByCustomerId = pendingServiceHistories
                .GroupBy(history => history.CustomerId)
                .ToDictionary(group => group.Key, group => group.ToList());

            var report = customers
                .Select(customer =>
                {
                    var customerPendingHistories = pendingHistoriesByCustomerId.GetValueOrDefault(customer.Id) ?? new List<ServiceHistory>();
                    var latestPendingHistory = customerPendingHistories
                        .OrderByDescending(history => history.ServiceDate)
                        .FirstOrDefault();

                    return new PendingCreditReportDto
                    {
                        CustomerId = customer.Id,
                        Name = customer.Name,
                        Phone = customer.Phone,
                        Email = customer.User != null ? customer.User.Email : customer.LegacyEmail,
                        PendingAmount = customerPendingHistories.Sum(history => history.Amount),
                        LastPaymentDate = latestPendingHistory?.ServiceDate,
                        Status = latestPendingHistory?.PaymentStatus ?? string.Empty
                    };
                })
                .OrderByDescending(customer => customer.PendingAmount)
                .ThenBy(customer => customer.Name)
                .ToList();

            return Ok(report);
        }

        [HttpPost("seed-demo-data")]
        public async Task<ActionResult<SeedDemoCustomerReportsResponseDto>> SeedDemoData()
        {
            var now = DateTime.UtcNow;
            var passwordHash = BCrypt.Net.BCrypt.HashPassword("Demo@12345");

            var regularCustomer = await GetOrCreateCustomerAsync(
                "report-regular-demo@garagego.local",
                "Report Demo Regular",
                "9800000101",
                passwordHash);
            var highSpenderCustomer = await GetOrCreateCustomerAsync(
                "report-high-spender-demo@garagego.local",
                "Report Demo High Spender",
                "9800000102",
                passwordHash);
            var pendingCreditCustomer = await GetOrCreateCustomerAsync(
                "report-pending-credit-demo@garagego.local",
                "Report Demo Pending Credit",
                "9800000103",
                passwordHash);

            await _context.SaveChangesAsync();

            var regularVehicle = await GetOrCreateVehicleAsync(regularCustomer.Id, "Toyota", "Corolla", "RPT-REG-01");
            var highSpenderVehicle = await GetOrCreateVehicleAsync(highSpenderCustomer.Id, "Hyundai", "Tucson", "RPT-HSP-01");
            var pendingCreditVehicle = await GetOrCreateVehicleAsync(pendingCreditCustomer.Id, "Honda", "City", "RPT-PCR-01");

            await _context.SaveChangesAsync();

            await EnsureAppointmentAsync(regularCustomer.Id, regularVehicle.Id, now.AddDays(-30), "Oil Change");
            await EnsureAppointmentAsync(regularCustomer.Id, regularVehicle.Id, now.AddDays(-10), "Brake Inspection");
            await EnsurePartRequestAsync(regularCustomer.Id, "Air filter", "Toyota Corolla");

            await EnsureSaleAsync(highSpenderCustomer.Id, now.AddDays(-12), 65000m);
            await EnsureServiceHistoryAsync(
                highSpenderCustomer.Id,
                highSpenderVehicle.Id,
                "Invoice",
                "Transmission service invoice",
                "Paid",
                18000m,
                "RPT-HSP-INV-001",
                now.AddDays(-8));

            await EnsureServiceHistoryAsync(
                pendingCreditCustomer.Id,
                pendingCreditVehicle.Id,
                "Service",
                "Pending brake service credit",
                "Pending",
                12500m,
                "RPT-PCR-INV-001",
                now.AddDays(-5));

            await _context.SaveChangesAsync();

            return Ok(new SeedDemoCustomerReportsResponseDto
            {
                Message = "Demo customer report data is ready.",
                RegularCustomerId = regularCustomer.Id,
                HighSpenderCustomerId = highSpenderCustomer.Id,
                PendingCreditCustomerId = pendingCreditCustomer.Id
            });
        }

        private async Task<CustomerProfile> GetOrCreateCustomerAsync(
            string email,
            string name,
            string phone,
            string passwordHash)
        {
            var customer = await _context.CustomerProfiles
                .FirstOrDefaultAsync(profile => profile.LegacyEmail == email);

            if (customer != null)
            {
                return customer;
            }

            customer = new CustomerProfile
            {
                Name = name,
                Phone = phone,
                Address = "Demo report address",
                LegacyEmail = email,
                LegacyPasswordHash = passwordHash,
                LegacyRole = "Customer",
                CreatedAt = DateTime.UtcNow
            };

            _context.CustomerProfiles.Add(customer);
            return customer;
        }

        private async Task<CustomerVehicle> GetOrCreateVehicleAsync(
            int customerId,
            string make,
            string model,
            string licensePlate)
        {
            var vehicle = await _context.CustomerVehicles
                .FirstOrDefaultAsync(existing =>
                    existing.CustomerId == customerId &&
                    existing.LicensePlate == licensePlate);

            if (vehicle != null)
            {
                return vehicle;
            }

            vehicle = new CustomerVehicle
            {
                CustomerId = customerId,
                Make = make,
                Model = model,
                Year = 2022,
                LicensePlate = licensePlate,
                VehicleNumber = licensePlate,
                Color = "Silver",
                VehicleType = "Car",
                CreatedAt = DateTime.UtcNow
            };

            _context.CustomerVehicles.Add(vehicle);
            return vehicle;
        }

        private async Task EnsureAppointmentAsync(
            int customerId,
            int vehicleId,
            DateTime appointmentDate,
            string serviceType)
        {
            var exists = await _context.Appointments.AnyAsync(appointment =>
                appointment.CustomerId == customerId &&
                appointment.VehicleId == vehicleId &&
                appointment.ServiceType == serviceType);

            if (exists)
            {
                return;
            }

            _context.Appointments.Add(new Appointment
            {
                CustomerId = customerId,
                VehicleId = vehicleId,
                AppointmentDate = appointmentDate,
                ServiceType = serviceType,
                Description = "Demo report appointment",
                Status = "Completed",
                CreatedAt = appointmentDate
            });
        }

        private async Task EnsurePartRequestAsync(int customerId, string partName, string vehicleModel)
        {
            var exists = await _context.UnavailablePartRequests.AnyAsync(request =>
                request.CustomerId == customerId &&
                request.PartName == partName &&
                request.VehicleModel == vehicleModel);

            if (exists)
            {
                return;
            }

            _context.UnavailablePartRequests.Add(new UnavailablePartRequest
            {
                CustomerId = customerId,
                PartName = partName,
                VehicleModel = vehicleModel,
                Description = "Demo report part request",
                Status = "Fulfilled",
                CreatedAt = DateTime.UtcNow
            });
        }

        private async Task EnsureSaleAsync(int customerId, DateTime date, decimal totalAmount)
        {
            var exists = await _context.Sales.AnyAsync(sale =>
                sale.CustomerId == customerId &&
                sale.TotalAmount == totalAmount);

            if (exists)
            {
                return;
            }

            _context.Sales.Add(new Sale
            {
                CustomerId = customerId,
                Date = date,
                TotalAmount = totalAmount
            });
        }

        private async Task EnsureServiceHistoryAsync(
            int customerId,
            int vehicleId,
            string historyType,
            string title,
            string paymentStatus,
            decimal amount,
            string invoiceNumber,
            DateTime serviceDate)
        {
            var exists = await _context.ServiceHistories.AnyAsync(history =>
                history.CustomerId == customerId &&
                history.InvoiceNumber == invoiceNumber);

            if (exists)
            {
                return;
            }

            _context.ServiceHistories.Add(new ServiceHistory
            {
                CustomerId = customerId,
                VehicleId = vehicleId,
                HistoryType = historyType,
                Title = title,
                Description = "Demo report service history",
                PaymentStatus = paymentStatus,
                Amount = amount,
                InvoiceNumber = invoiceNumber,
                ServiceDate = serviceDate
            });
        }
    }
}
