using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    public partial class AddCustomerRoleToCustomers : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Use conditional SQL to avoid failure if the column already exists in the target database
            migrationBuilder.Sql("ALTER TABLE \"Customers\" ADD COLUMN IF NOT EXISTS \"Role\" character varying(30) DEFAULT 'Customer' NOT NULL;");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE \"Customers\" DROP COLUMN IF EXISTS \"Role\";");
        }
    }
}
