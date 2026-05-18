using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddUserVerificationFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE \"Vendors\" ADD COLUMN IF NOT EXISTS \"Status\" character varying(30) NOT NULL DEFAULT '';");

            migrationBuilder.Sql("ALTER TABLE \"Staff\" ADD COLUMN IF NOT EXISTS \"UserId\" integer NULL;");

            migrationBuilder.Sql("ALTER TABLE \"ServiceHistories\" ADD COLUMN IF NOT EXISTS \"ReminderSentAt\" timestamp with time zone NULL;");

            migrationBuilder.Sql("ALTER TABLE \"Parts\" ADD COLUMN IF NOT EXISTS \"LastLowStockNotifiedAt\" timestamp with time zone NULL;");

            // Role column alteration is safe to leave as-is; ensure it exists (previous migration handles it).

            migrationBuilder.Sql("ALTER TABLE \"Customers\" ADD COLUMN IF NOT EXISTS \"LastLoyaltyNotifiedAt\" timestamp with time zone NULL;");

            migrationBuilder.Sql("ALTER TABLE \"Customers\" ADD COLUMN IF NOT EXISTS \"LoyaltyPoints\" integer NOT NULL DEFAULT 0;");

            migrationBuilder.Sql("ALTER TABLE \"Customers\" ADD COLUMN IF NOT EXISTS \"UserId\" integer NULL;");

            migrationBuilder.Sql(@"CREATE TABLE IF NOT EXISTS ""Users"" (
    ""Id"" serial PRIMARY KEY,
    ""Email"" character varying(200) NOT NULL,
    ""PasswordHash"" character varying(255) NOT NULL,
    ""Role"" character varying(30) NOT NULL,
    ""Status"" character varying(20) NOT NULL,
    ""CreatedAt"" timestamp with time zone NOT NULL,
    ""EmailVerified"" boolean NOT NULL DEFAULT false,
    ""VerificationCode"" text,
    ""VerificationExpiresAt"" timestamp with time zone
);");

            migrationBuilder.Sql("CREATE UNIQUE INDEX IF NOT EXISTS \"IX_Staff_UserId\" ON \"Staff\" (\"UserId\");");

            migrationBuilder.Sql("CREATE UNIQUE INDEX IF NOT EXISTS \"IX_Customers_UserId\" ON \"Customers\" (\"UserId\");");

            migrationBuilder.Sql("CREATE UNIQUE INDEX IF NOT EXISTS \"IX_Users_Email\" ON \"Users\" (\"Email\");");

                        migrationBuilder.Sql(@"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'FK_Customers_Users_UserId'
    ) THEN
        ALTER TABLE ""Customers"" ADD CONSTRAINT ""FK_Customers_Users_UserId"" FOREIGN KEY (""UserId"") REFERENCES ""Users""(""Id"") ON DELETE CASCADE;
    END IF;
END$$;
");

                        migrationBuilder.Sql(@"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'FK_Staff_Users_UserId'
    ) THEN
        ALTER TABLE ""Staff"" ADD CONSTRAINT ""FK_Staff_Users_UserId"" FOREIGN KEY (""UserId"") REFERENCES ""Users""(""Id"") ON DELETE CASCADE;
    END IF;
END$$;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Customers_Users_UserId",
                table: "Customers");

            migrationBuilder.DropForeignKey(
                name: "FK_Staff_Users_UserId",
                table: "Staff");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Staff_UserId",
                table: "Staff");

            migrationBuilder.DropIndex(
                name: "IX_Customers_UserId",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Vendors");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Staff");

            migrationBuilder.DropColumn(
                name: "ReminderSentAt",
                table: "ServiceHistories");

            migrationBuilder.DropColumn(
                name: "LastLowStockNotifiedAt",
                table: "Parts");

            migrationBuilder.DropColumn(
                name: "LastLoyaltyNotifiedAt",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "LoyaltyPoints",
                table: "Customers");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Customers");

            migrationBuilder.AlterColumn<string>(
                name: "Role",
                table: "Customers",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Customer",
                oldClrType: typeof(string),
                oldType: "character varying(30)",
                oldMaxLength: 30);
        }
    }
}
