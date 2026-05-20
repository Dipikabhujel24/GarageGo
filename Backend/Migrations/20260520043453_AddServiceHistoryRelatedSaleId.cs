using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceHistoryRelatedSaleId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "RelatedSaleId",
                table: "ServiceHistories",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ServiceHistories_RelatedSaleId",
                table: "ServiceHistories",
                column: "RelatedSaleId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_ServiceHistories_Sales_RelatedSaleId",
                table: "ServiceHistories",
                column: "RelatedSaleId",
                principalTable: "Sales",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ServiceHistories_Sales_RelatedSaleId",
                table: "ServiceHistories");

            migrationBuilder.DropIndex(
                name: "IX_ServiceHistories_RelatedSaleId",
                table: "ServiceHistories");

            migrationBuilder.DropColumn(
                name: "RelatedSaleId",
                table: "ServiceHistories");
        }
    }
}
