namespace Backend.Models;

/// <summary>Sale and purchase-history payment states.</summary>
public static class PaymentStatuses
{
    public const string Paid = "Paid";
    public const string Credit = "Credit";
    public const string Partial = "Partial";

    public static string Normalize(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return Paid;
        }

        var lower = raw.Trim().ToLowerInvariant();
        return lower switch
        {
            "paid" => Paid,
            "credit" => Credit,
            "partial" => Partial,
            "pending" => Credit,
            _ => char.ToUpper(raw.Trim()[0]) + raw.Trim()[1..].ToLowerInvariant()
        };
    }

    public static bool IsOpenCredit(string? status) =>
        status == Credit || status == Partial;
}
