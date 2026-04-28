using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class UpdateCustomerFeatureEntityAttributes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Appointments_CustomerVehicles_CustomerVehicleId",
                table: "Appointments");

            migrationBuilder.DropForeignKey(
                name: "FK_ServiceReviews_ServiceHistories_ServiceHistoryId",
                table: "ServiceReviews");

            migrationBuilder.DropForeignKey(
                name: "FK_PartRequests_CustomerVehicles_CustomerVehicleId",
                table: "PartRequests");

            migrationBuilder.DropForeignKey(
                name: "FK_PartRequests_Customers_CustomerId",
                table: "PartRequests");

            migrationBuilder.DropPrimaryKey(
                name: "PK_PartRequests",
                table: "PartRequests");

            migrationBuilder.DropIndex(
                name: "IX_ServiceReviews_ServiceHistoryId",
                table: "ServiceReviews");

            migrationBuilder.DropIndex(
                name: "IX_PartRequests_CustomerVehicleId",
                table: "PartRequests");

            migrationBuilder.DropColumn(
                name: "ServiceHistoryId",
                table: "ServiceReviews");

            migrationBuilder.DropColumn(
                name: "CustomerVehicleId",
                table: "PartRequests");

            migrationBuilder.DropColumn(
                name: "Quantity",
                table: "PartRequests");

            migrationBuilder.DropColumn(
                name: "RequestedAt",
                table: "PartRequests");

            migrationBuilder.DropColumn(
                name: "StaffNote",
                table: "PartRequests");

            migrationBuilder.RenameColumn(
                name: "CustomerVehicleId",
                table: "Appointments",
                newName: "VehicleId");

            migrationBuilder.RenameIndex(
                name: "IX_Appointments_CustomerVehicleId",
                table: "Appointments",
                newName: "IX_Appointments_VehicleId");

            migrationBuilder.RenameTable(
                name: "PartRequests",
                newName: "UnavailablePartRequests");

            migrationBuilder.RenameIndex(
                name: "IX_PartRequests_CustomerId",
                table: "UnavailablePartRequests",
                newName: "IX_UnavailablePartRequests_CustomerId");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "UnavailablePartRequests",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()");

            migrationBuilder.AddColumn<string>(
                name: "VehicleModel",
                table: "UnavailablePartRequests",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddPrimaryKey(
                name: "PK_UnavailablePartRequests",
                table: "UnavailablePartRequests",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Appointments_CustomerVehicles_VehicleId",
                table: "Appointments",
                column: "VehicleId",
                principalTable: "CustomerVehicles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Appointments_CustomerVehicles_VehicleId",
                table: "Appointments");

            migrationBuilder.DropForeignKey(
                name: "FK_UnavailablePartRequests_Customers_CustomerId",
                table: "UnavailablePartRequests");

            migrationBuilder.DropPrimaryKey(
                name: "PK_UnavailablePartRequests",
                table: "UnavailablePartRequests");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "UnavailablePartRequests");

            migrationBuilder.DropColumn(
                name: "VehicleModel",
                table: "UnavailablePartRequests");

            migrationBuilder.RenameColumn(
                name: "VehicleId",
                table: "Appointments",
                newName: "CustomerVehicleId");

            migrationBuilder.RenameIndex(
                name: "IX_Appointments_VehicleId",
                table: "Appointments",
                newName: "IX_Appointments_CustomerVehicleId");

            migrationBuilder.RenameTable(
                name: "UnavailablePartRequests",
                newName: "PartRequests");

            migrationBuilder.RenameIndex(
                name: "IX_UnavailablePartRequests_CustomerId",
                table: "PartRequests",
                newName: "IX_PartRequests_CustomerId");

            migrationBuilder.AddColumn<int>(
                name: "ServiceHistoryId",
                table: "ServiceReviews",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "CustomerVehicleId",
                table: "PartRequests",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Quantity",
                table: "PartRequests",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<DateTime>(
                name: "RequestedAt",
                table: "PartRequests",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()");

            migrationBuilder.AddColumn<string>(
                name: "StaffNote",
                table: "PartRequests",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddPrimaryKey(
                name: "PK_PartRequests",
                table: "PartRequests",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceReviews_ServiceHistoryId",
                table: "ServiceReviews",
                column: "ServiceHistoryId");

            migrationBuilder.CreateIndex(
                name: "IX_PartRequests_CustomerId",
                table: "PartRequests",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_PartRequests_CustomerVehicleId",
                table: "PartRequests",
                column: "CustomerVehicleId");

            migrationBuilder.AddForeignKey(
                name: "FK_Appointments_CustomerVehicles_CustomerVehicleId",
                table: "Appointments",
                column: "CustomerVehicleId",
                principalTable: "CustomerVehicles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ServiceReviews_ServiceHistories_ServiceHistoryId",
                table: "ServiceReviews",
                column: "ServiceHistoryId",
                principalTable: "ServiceHistories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
