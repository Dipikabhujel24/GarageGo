namespace Backend.Models;

public static class AppointmentStatuses
{
    public const string Pending = "Pending";
    public const string Approved = "Approved";
    public const string Rejected = "Rejected";
    public const string InProgress = "In Progress";
    public const string Completed = "Completed";
    public const string Cancelled = "Cancelled";

    public static readonly string[] All =
    [
        Pending,
        Approved,
        Rejected,
        InProgress,
        Completed,
        Cancelled
    ];

    public static bool TryNormalize(string? value, out string normalized)
    {
        normalized = Pending;

        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var match = All.FirstOrDefault(
            status => string.Equals(status, value.Trim(), StringComparison.OrdinalIgnoreCase));

        if (match is null)
        {
            return false;
        }

        normalized = match;
        return true;
    }
}

public static class PartRequestStatuses
{
    public const string Pending = "Pending";
    public const string Approved = "Approved";
    public const string Rejected = "Rejected";
    public const string Ordered = "Ordered";
    public const string Available = "Available";
    public const string Fulfilled = "Fulfilled";

    public static readonly string[] All =
    [
        Pending,
        Approved,
        Rejected,
        Ordered,
        Available,
        Fulfilled
    ];

    public static bool TryNormalize(string? value, out string normalized)
    {
        normalized = Pending;

        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var match = All.FirstOrDefault(
            status => string.Equals(status, value.Trim(), StringComparison.OrdinalIgnoreCase));

        if (match is null)
        {
            return false;
        }

        normalized = match;
        return true;
    }
}
