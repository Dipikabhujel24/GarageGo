namespace Backend.Models;

/// <summary>
/// Canonical values for <see cref="ServiceHistory.HistoryType"/>.
/// Stored as strings in the database for compatibility with existing rows.
/// </summary>
public static class HistoryTypes
{
    public const string Service = "Service";
    public const string Purchase = "Purchase";
}
