using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations;

/// <summary>
/// Converts legacy TEXT date columns to timestamptz on PostgreSQL (Neon).
/// </summary>
public partial class RepairPostgresTextTimestampColumns : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        if (migrationBuilder.ActiveProvider is not null
            && !migrationBuilder.ActiveProvider.Contains("Npgsql", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var columns = new (string Table, string Column)[]
        {
            ("Sales", "Date"),
            ("Sales", "DueDate"),
            ("Sales", "LastReminderSentAt"),
            ("ServiceHistories", "ServiceDate"),
            ("ServiceHistories", "ReminderSentAt"),
            ("Customers", "CreatedAt"),
            ("Customers", "LastLoyaltyNotifiedAt"),
            ("CustomerVehicles", "CreatedAt"),
            ("Appointments", "AppointmentDate"),
            ("Appointments", "CreatedAt"),
            ("Parts", "CreatedAt"),
            ("Parts", "LastLowStockNotifiedAt"),
            ("Users", "CreatedAt"),
            ("Users", "VerificationExpiresAt"),
            ("Users", "PasswordResetExpiresAt"),
            ("AppNotifications", "CreatedAt"),
            ("PurchaseInvoices", "PurchaseDate"),
            ("PurchaseInvoices", "CreatedAt"),
            ("UnavailablePartRequests", "CreatedAt"),
            ("ServiceReviews", "CreatedAt"),
            ("Vendors", "CreatedAt"),
        };

        foreach (var (table, column) in columns)
        {
            migrationBuilder.Sql($"""
                DO $repair$
                DECLARE current_type text;
                BEGIN
                    SELECT t.typname INTO current_type
                    FROM pg_class c
                    INNER JOIN pg_namespace n ON n.oid = c.relnamespace
                    INNER JOIN pg_attribute a ON a.attrelid = c.oid
                    INNER JOIN pg_type t ON a.atttypid = t.oid
                    WHERE n.nspname = 'public'
                      AND c.relname = '{table}'
                      AND a.attname = '{column}'
                      AND a.attnum > 0
                      AND NOT a.attisdropped;

                    IF current_type IN ('text', 'varchar', 'bpchar') THEN
                        EXECUTE format(
                            'ALTER TABLE %I ALTER COLUMN %I TYPE timestamp with time zone USING (
                                CASE
                                    WHEN %I IS NULL THEN NULL
                                    WHEN btrim(%I::text) = '''' THEN NULL
                                    ELSE %I::timestamptz
                                END)',
                            '{table}', '{column}', '{column}', '{column}', '{column}');
                    END IF;
                END $repair$;
                """);
        }
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
    }
}
