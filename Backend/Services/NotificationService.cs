using Backend.Data;
using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Backend.Services;

public class NotificationService
{
    public static readonly string[] OverdueCreditStatuses =
    [
        "credit",
        "pending",
        "unpaid",
        "overdue",
        "partial"
    ];

    public static readonly string[] PaidCreditStatuses =
    [
        "paid",
        "settled",
        "complete",
        "completed"
    ];

    private readonly AppDbContext _db;
    private readonly IConfiguration _configuration;
    private readonly EmailService _emailService;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(
        AppDbContext db,
        IConfiguration configuration,
        EmailService emailService,
        ILogger<NotificationService> logger)
    {
        _db = db;
        _configuration = configuration;
        _emailService = emailService;
        _logger = logger;
    }

    public int GetLowStockThreshold()
    {
        if (int.TryParse(_configuration["Notifications:LowStockThreshold"], out var threshold))
        {
            return threshold;
        }

        return 10;
    }

    public async Task HandlePartStockChangedAsync(int partId, EmailService? email = null, CancellationToken ct = default)
    {
        var part = await _db.Parts.FirstOrDefaultAsync(p => p.Id == partId, ct);
        if (part == null)
        {
            return;
        }

        var threshold = GetLowStockThreshold();

        if (part.Quantity >= threshold)
        {
            if (part.LastLowStockNotifiedAt != null)
            {
                part.LastLowStockNotifiedAt = null;
            }

            await DismissByDedupePrefixAsync($"low-stock:{part.Id}", ct);
            await _db.SaveChangesAsync(ct);
            return;
        }

        await NotifyLowStockAsync(part, email ?? _emailService, ct);
    }

    public async Task NotifyLowStockAsync(Part part, EmailService? email, CancellationToken ct = default)
    {
        var threshold = GetLowStockThreshold();
        if (part.Quantity >= threshold)
        {
            return;
        }

        var dedupeKey = $"low-stock:{part.Id}";
        var created = await TryCreateAdminNotificationAsync(
            type: "low_stock",
            title: "Low stock alert",
            message: $"{part.PartName} is low on stock ({part.Quantity} remaining, threshold {threshold}).",
            linkUrl: "/admin/parts",
            dedupeKey,
            referenceType: "Part",
            referenceId: part.Id,
            ct);

        if (!created)
        {
            return;
        }

        var mailer = email ?? _emailService;
        var adminEmail = _configuration["Notifications:AdminEmail"]
            ?? _configuration["InitialAdmin:Email"];

        if (part.LastLowStockNotifiedAt != null)
        {
            await _db.SaveChangesAsync(ct);
            return;
        }

        if (string.IsNullOrWhiteSpace(adminEmail))
        {
            _logger.LogWarning("Low-stock in-app alert created for part {PartId}, but Notifications:AdminEmail is not set.", part.Id);
            await _db.SaveChangesAsync(ct);
            return;
        }

        if (!mailer.IsConfigured())
        {
            _logger.LogWarning(
                "Low-stock in-app alert created for part {PartId}, but SMTP is not configured (EmailSettings:SmtpUser/SmtpPass/FromEmail).",
                part.Id);
            await _db.SaveChangesAsync(ct);
            return;
        }

        try
        {
            var subject = $"Low stock alert: {part.PartName}";
            var body = $"Part <strong>{part.PartName}</strong> (ID {part.Id}) is low on stock ({part.Quantity} remaining, threshold {threshold}).";
            await mailer.SendEmailAsync(adminEmail.Trim(), subject, body);
            part.LastLowStockNotifiedAt = DateTime.UtcNow;
            _logger.LogInformation("Low-stock email sent to {AdminEmail} for part {PartId}.", adminEmail, part.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send low-stock email for part {PartId}", part.Id);
        }

        await _db.SaveChangesAsync(ct);
    }

    public async Task NotifyNewAppointmentAsync(Appointment appointment, int customerUserId, string customerName, CancellationToken ct = default)
    {
        await TryCreateAdminNotificationAsync(
            type: "appointment",
            title: "New appointment request",
            message: $"{customerName} booked {appointment.ServiceType} for {appointment.AppointmentDate:MMM d, yyyy HH:mm}.",
            linkUrl: "/admin/appointments-management",
            $"appointment-admin:{appointment.Id}",
            referenceType: "Appointment",
            referenceId: appointment.Id,
            ct);

        await TryCreateCustomerNotificationAsync(
            customerUserId,
            type: "appointment",
            title: "Appointment submitted",
            message: $"Your {appointment.ServiceType} appointment on {appointment.AppointmentDate:MMM d, yyyy HH:mm} is pending confirmation.",
            linkUrl: "/appointments",
            $"appointment-customer:{appointment.Id}",
            referenceType: "Appointment",
            referenceId: appointment.Id,
            ct);

        await _db.SaveChangesAsync(ct);
    }

    public async Task NotifyAppointmentStatusChangedAsync(
        Appointment appointment,
        int customerUserId,
        string customerName,
        string previousStatus,
        string newStatus,
        EmailService? email = null,
        string? customerEmail = null,
        CancellationToken ct = default)
    {
        var statusMessage = BuildAppointmentStatusMessage(appointment, newStatus);

        await TryCreateCustomerNotificationAsync(
            customerUserId,
            type: "appointment",
            title: $"Appointment {newStatus}",
            message: statusMessage,
            linkUrl: "/appointments",
            $"appointment-status:{appointment.Id}:{newStatus}:{DateTime.UtcNow:yyyyMMddHHmmss}",
            referenceType: "Appointment",
            referenceId: appointment.Id,
            ct);

        await _db.SaveChangesAsync(ct);

        if (email is not null && !string.IsNullOrWhiteSpace(customerEmail))
        {
            await TrySendStatusEmailAsync(
                email,
                customerEmail,
                $"GarageGo appointment update — {newStatus}",
                statusMessage);
        }
    }

    public async Task NotifyPartRequestStatusChangedAsync(
        UnavailablePartRequest request,
        int customerUserId,
        string customerName,
        string previousStatus,
        string newStatus,
        EmailService? email = null,
        string? customerEmail = null,
        CancellationToken ct = default)
    {
        var statusMessage = BuildPartRequestStatusMessage(request, newStatus);

        await TryCreateCustomerNotificationAsync(
            customerUserId,
            type: "part_request",
            title: $"Part request {newStatus}",
            message: statusMessage,
            linkUrl: "/part-requests",
            $"part-request-status:{request.Id}:{newStatus}:{DateTime.UtcNow:yyyyMMddHHmmss}",
            referenceType: "PartRequest",
            referenceId: request.Id,
            ct);

        await _db.SaveChangesAsync(ct);

        if (email is not null && !string.IsNullOrWhiteSpace(customerEmail))
        {
            await TrySendStatusEmailAsync(
                email,
                customerEmail,
                $"GarageGo part request update — {newStatus}",
                statusMessage);
        }
    }

    public async Task NotifyNewPartRequestAsync(UnavailablePartRequest request, int customerUserId, string customerName, CancellationToken ct = default)
    {
        await TryCreateAdminNotificationAsync(
            type: "part_request",
            title: "New part request",
            message: $"{customerName} requested {request.PartName} for {request.VehicleModel}.",
            linkUrl: "/admin/part-requests",
            $"part-request-admin:{request.Id}",
            referenceType: "PartRequest",
            referenceId: request.Id,
            ct);

        await TryCreateCustomerNotificationAsync(
            customerUserId,
            type: "part_request",
            title: "Part request received",
            message: $"We received your request for {request.PartName}.",
            linkUrl: "/part-requests",
            $"part-request-customer:{request.Id}",
            referenceType: "PartRequest",
            referenceId: request.Id,
            ct);

        await _db.SaveChangesAsync(ct);
    }

    public async Task NotifyCreditReminderAsync(
        ServiceHistory history,
        int? customerUserId,
        string customerName,
        EmailService email,
        CancellationToken ct = default)
    {
        if (customerUserId.HasValue)
        {
            await TryCreateCustomerNotificationAsync(
                customerUserId.Value,
                type: "credit_reminder",
                title: "Payment reminder",
                message: $"Outstanding balance of {history.Amount:C} from {history.ServiceDate:d} for \"{history.Title}\" is overdue.",
                linkUrl: "/history",
                $"credit-reminder:{history.Id}",
                referenceType: "ServiceHistory",
                referenceId: history.Id,
                ct);
        }

        await TryCreateAdminNotificationAsync(
            type: "overdue_credit",
            title: "Overdue customer credit",
            message: $"{customerName} has an overdue balance of {history.Amount:C} from {history.ServiceDate:d}.",
            linkUrl: "/admin/reports",
            $"overdue-credit-admin:{history.Id}",
            referenceType: "ServiceHistory",
            referenceId: history.Id,
            ct);

        await _db.SaveChangesAsync(ct);
    }

    public async Task NotifySalePaymentReminderAsync(
        Sale sale,
        int customerUserId,
        string customerName,
        CancellationToken ct = default)
    {
        var invoiceNumber = string.IsNullOrWhiteSpace(sale.InvoiceNumber)
            ? $"INV-{sale.Id:D4}"
            : sale.InvoiceNumber;

        await TryCreateCustomerNotificationAsync(
            customerUserId,
            type: "credit_reminder",
            title: "Payment Reminder",
            message: $"Invoice {invoiceNumber} has an overdue balance of Rs {sale.RemainingAmount:0.00}.",
            linkUrl: "/history",
            $"credit-reminder-sale:{sale.Id}",
            referenceType: "Sale",
            referenceId: sale.Id,
            ct);

        await TryCreateAdminNotificationAsync(
            type: "overdue_credit",
            title: "Overdue customer credit",
            message: $"{customerName} — invoice {invoiceNumber} overdue (Rs {sale.RemainingAmount:0.00}).",
            linkUrl: "/staff/customer-reports",
            $"overdue-credit-sale:{sale.Id}",
            referenceType: "Sale",
            referenceId: sale.Id,
            ct);

        await _db.SaveChangesAsync(ct);
    }

    public async Task NotifyNewCustomerRegistrationAsync(CustomerProfile customer, CancellationToken ct = default)
    {
        await TryCreateAdminNotificationAsync(
            type: "registration",
            title: "New customer registration",
            message: $"{customer.Name} ({customer.LegacyEmail}) registered on GarageGo.",
            linkUrl: "/staff/customers",
            $"registration:{customer.Id}",
            referenceType: "Customer",
            referenceId: customer.Id,
            ct);

        await _db.SaveChangesAsync(ct);
    }

    public static bool IsOverdueCreditStatus(string? paymentStatus)
    {
        if (string.IsNullOrWhiteSpace(paymentStatus))
        {
            return false;
        }

        return OverdueCreditStatuses.Contains(paymentStatus.Trim().ToLowerInvariant());
    }

    public static bool IsPaidCreditStatus(string? paymentStatus)
    {
        if (string.IsNullOrWhiteSpace(paymentStatus))
        {
            return false;
        }

        return PaidCreditStatuses.Contains(paymentStatus.Trim().ToLowerInvariant());
    }

    private async Task<bool> TryCreateAdminNotificationAsync(
        string type,
        string title,
        string message,
        string? linkUrl,
        string dedupeKey,
        string? referenceType,
        int? referenceId,
        CancellationToken ct)
    {
        var exists = await _db.AppNotifications.AnyAsync(
            n => n.Audience == "Admin"
                && n.DedupeKey == dedupeKey
                && !n.IsDismissed,
            ct);

        if (exists)
        {
            return false;
        }

        _db.AppNotifications.Add(new AppNotification
        {
            Audience = "Admin",
            Type = type,
            Title = title,
            Message = message,
            LinkUrl = linkUrl,
            DedupeKey = dedupeKey,
            ReferenceType = referenceType,
            ReferenceId = referenceId,
            CreatedAt = DateTime.UtcNow
        });

        return true;
    }

    private async Task<bool> TryCreateCustomerNotificationAsync(
        int userId,
        string type,
        string title,
        string message,
        string? linkUrl,
        string dedupeKey,
        string? referenceType,
        int? referenceId,
        CancellationToken ct)
    {
        var exists = await _db.AppNotifications.AnyAsync(
            n => n.Audience == "Customer"
                && n.UserId == userId
                && n.DedupeKey == dedupeKey
                && !n.IsDismissed,
            ct);

        if (exists)
        {
            return false;
        }

        _db.AppNotifications.Add(new AppNotification
        {
            Audience = "Customer",
            UserId = userId,
            Type = type,
            Title = title,
            Message = message,
            LinkUrl = linkUrl,
            DedupeKey = dedupeKey,
            ReferenceType = referenceType,
            ReferenceId = referenceId,
            CreatedAt = DateTime.UtcNow
        });

        return true;
    }

    private static string BuildAppointmentStatusMessage(Appointment appointment, string newStatus) =>
        newStatus switch
        {
            AppointmentStatuses.Approved =>
                $"Your {appointment.ServiceType} appointment on {appointment.AppointmentDate:MMM d, yyyy HH:mm} has been approved.",
            AppointmentStatuses.Rejected =>
                $"Your {appointment.ServiceType} appointment request was declined. Contact the garage for details.",
            AppointmentStatuses.InProgress =>
                $"Your {appointment.ServiceType} appointment is now in progress.",
            AppointmentStatuses.Completed =>
                $"Your {appointment.ServiceType} appointment has been marked completed. Thank you for visiting GarageGo.",
            AppointmentStatuses.Cancelled =>
                $"Your {appointment.ServiceType} appointment on {appointment.AppointmentDate:MMM d, yyyy HH:mm} was cancelled.",
            _ =>
                $"Your appointment status is now {newStatus}."
        };

    private static string BuildPartRequestStatusMessage(UnavailablePartRequest request, string newStatus) =>
        newStatus switch
        {
            PartRequestStatuses.Approved =>
                $"Your request for {request.PartName} ({request.VehicleModel}) has been approved.",
            PartRequestStatuses.Rejected =>
                $"Your request for {request.PartName} could not be fulfilled at this time.",
            PartRequestStatuses.Ordered =>
                $"We have ordered {request.PartName} for your {request.VehicleModel}.",
            PartRequestStatuses.Available =>
                $"Good news — {request.PartName} for your {request.VehicleModel} is now available.",
            PartRequestStatuses.Fulfilled =>
                $"Your part request for {request.PartName} has been fulfilled.",
            _ =>
                $"Your part request for {request.PartName} is now {newStatus}."
        };

    private async Task TrySendStatusEmailAsync(EmailService email, string to, string subject, string body)
    {
        try
        {
            await email.SendEmailAsync(to.Trim(), subject, body);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send status update email to {Recipient}", to);
        }
    }

    private async Task DismissByDedupePrefixAsync(string dedupePrefix, CancellationToken ct)
    {
        var notifications = await _db.AppNotifications
            .Where(n => !n.IsDismissed && n.DedupeKey.StartsWith(dedupePrefix))
            .ToListAsync(ct);

        foreach (var notification in notifications)
        {
            notification.IsDismissed = true;
            notification.IsRead = true;
        }
    }
}
