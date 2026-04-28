using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    public partial class UpdateServiceHistoryFeature : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "ServiceType",
                table: "ServiceHistories",
                newName: "HistoryType");

            migrationBuilder.RenameColumn(
                name: "Cost",
                table: "ServiceHistories",
                newName: "Amount");

            migrationBuilder.AddColumn<string>(
                name: "InvoiceNumber",
                table: "ServiceHistories",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentStatus",
                table: "ServiceHistories",
                type: "TEXT",
                maxLength: 20,
                nullable: false,
                defaultValue: "Paid");

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "ServiceHistories",
                type: "TEXT",
                maxLength: 150,
                nullable: false,
                defaultValue: string.Empty);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "InvoiceNumber",
                table: "ServiceHistories");

            migrationBuilder.DropColumn(
                name: "PaymentStatus",
                table: "ServiceHistories");

            migrationBuilder.DropColumn(
                name: "Title",
                table: "ServiceHistories");

            migrationBuilder.RenameColumn(
                name: "HistoryType",
                table: "ServiceHistories",
                newName: "ServiceType");

            migrationBuilder.RenameColumn(
                name: "Amount",
                table: "ServiceHistories",
                newName: "Cost");
        }
    }
}