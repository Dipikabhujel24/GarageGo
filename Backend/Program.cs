using Backend.Data;
using Backend.Models;
using Backend.Services;
using QuestPDF.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using System.Data.Common;
using System.Text;

QuestPDF.Settings.License = LicenseType.Community;

var builder = WebApplication.CreateBuilder(args);

const string FrontendCorsPolicy = "FrontendCorsPolicy";

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3001"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddScoped<EmailService>();
builder.Services.AddScoped<InvoiceService>();
builder.Services.AddScoped<GoogleAuthService>();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.Configure<OpenRouterSettings>(builder.Configuration.GetSection("OpenRouter"));
builder.Services.AddHttpClient("OpenRouter", client =>
{
    client.Timeout = TimeSpan.FromSeconds(60);
});
builder.Services.AddScoped<PredictiveMaintenanceService>();
builder.Services.AddScoped<NotificationService>();
builder.Services.AddScoped<NotificationCheckRunner>();

var resolvedConnectionString =
    builder.Configuration.GetConnectionString("DefaultConnection") ??
    builder.Configuration.GetConnectionString("PostgresConnection") ??
    "Data Source=garagego-local.db";

var usePostgres = LooksLikePostgresConnectionString(resolvedConnectionString);
var normalizedConnectionString = usePostgres
    ? NormalizePostgresConnectionString(resolvedConnectionString)
    : resolvedConnectionString;

builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (usePostgres)
    {
        options.UseNpgsql(normalizedConnectionString);
        return;
    }

    options.UseSqlite(normalizedConnectionString);
});

// Background worker for low-stock notifications and overdue credit reminders
builder.Services.AddHostedService<Backend.Services.LowStockAndCreditReminderService>();

var jwtKey = builder.Configuration["Jwt:Key"] ?? "garagego_super_secret_key_123456789";
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = !string.IsNullOrWhiteSpace(jwtIssuer),
            ValidateAudience = !string.IsNullOrWhiteSpace(jwtAudience),
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

var app = builder.Build();
var startupLogger = app.Services.GetRequiredService<ILogger<Program>>();

try
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    await db.Database.EnsureCreatedAsync();
    await EnsureOperationalSchemaAsync(db);
    await MigrateLegacyAuthDataAsync(db, startupLogger);
    await EnsureInitialAdminAsync(db, builder.Configuration, startupLogger);
}
catch (Exception ex)
{
    startupLogger.LogError(ex, "An error occurred while preparing the database schema.");
}

app.UseSwagger();
app.UseSwaggerUI();

var httpsPort = app.Configuration["ASPNETCORE_HTTPS_PORT"] ?? app.Configuration["HTTPS_PORT"];
if (!string.IsNullOrWhiteSpace(httpsPort))
{
    app.UseHttpsRedirection();
}

app.UseCors(FrontendCorsPolicy);
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

static async Task EnsureOperationalSchemaAsync(AppDbContext db)
{
    var connection = db.Database.GetDbConnection();
    var providerName = db.Database.ProviderName ?? string.Empty;

    if (connection.State != System.Data.ConnectionState.Open)
    {
        await connection.OpenAsync();
    }

    var existingTables = await GetTableNamesAsync(connection, providerName);

    await EnsureTableAsync(
        db,
        existingTables,
        "Users",
        """
        CREATE TABLE IF NOT EXISTS "Users" (
            "Id" INTEGER NOT NULL CONSTRAINT "PK_Users" PRIMARY KEY AUTOINCREMENT,
            "Email" TEXT NOT NULL,
            "PasswordHash" TEXT NOT NULL,
            "Role" TEXT NOT NULL DEFAULT 'Customer',
            "Status" TEXT NOT NULL DEFAULT 'Active',
            "CreatedAt" TEXT NOT NULL
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS "Users" (
            "Id" integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            "Email" character varying(200) NOT NULL,
            "PasswordHash" character varying(255) NOT NULL,
            "Role" character varying(30) NOT NULL DEFAULT 'Customer',
            "Status" character varying(20) NOT NULL DEFAULT 'Active',
            "CreatedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        """);

    await EnsureSqlAsync(db, "CREATE UNIQUE INDEX IF NOT EXISTS \"IX_Users_Email\" ON \"Users\" (\"Email\");");

    var userColumns = await GetTableColumnsAsync(connection, providerName, "Users");

    if (!userColumns.Contains("Role"))
    {
        if (IsPostgresProvider(providerName))
        {
            await EnsureSqlAsync(db, "ALTER TABLE \"Users\" ADD COLUMN \"Role\" character varying(30) NOT NULL DEFAULT 'Customer';");
        }
        else
        {
            await EnsureSqlAsync(db, "ALTER TABLE \"Users\" ADD COLUMN \"Role\" TEXT NOT NULL DEFAULT 'Customer';");
        }

        userColumns.Add("Role");
    }

    if (!userColumns.Contains("Status"))
    {
        if (IsPostgresProvider(providerName))
        {
            await EnsureSqlAsync(db, "ALTER TABLE \"Users\" ADD COLUMN \"Status\" character varying(20) NOT NULL DEFAULT 'Active';");
        }
        else
        {
            await EnsureSqlAsync(db, "ALTER TABLE \"Users\" ADD COLUMN \"Status\" TEXT NOT NULL DEFAULT 'Active';");
        }

        userColumns.Add("Status");
    }

    if (!userColumns.Contains("CreatedAt"))
    {
        if (IsPostgresProvider(providerName))
        {
            await EnsureSqlAsync(db, "ALTER TABLE \"Users\" ADD COLUMN \"CreatedAt\" timestamp with time zone NULL;");
            await EnsureSqlAsync(db, "UPDATE \"Users\" SET \"CreatedAt\" = CURRENT_TIMESTAMP WHERE \"CreatedAt\" IS NULL;");
        }
        else
        {
            await EnsureSqlAsync(db, "ALTER TABLE \"Users\" ADD COLUMN \"CreatedAt\" TEXT NULL DEFAULT NULL;");
            await EnsureSqlAsync(db, "UPDATE \"Users\" SET \"CreatedAt\" = datetime('now') WHERE \"CreatedAt\" IS NULL;");
        }

        userColumns.Add("CreatedAt");
    }

    await EnsureSqlAsync(db, "UPDATE \"Users\" SET \"Status\" = 'Active' WHERE \"Status\" IS NULL OR TRIM(\"Status\") = '';");

    if (!userColumns.Contains("EmailVerified"))
    {
        if (IsPostgresProvider(providerName))
        {
            await EnsureSqlAsync(db, "ALTER TABLE \"Users\" ADD COLUMN \"EmailVerified\" boolean NOT NULL DEFAULT false;");
        }
        else
        {
            await EnsureSqlAsync(db, "ALTER TABLE \"Users\" ADD COLUMN \"EmailVerified\" INTEGER NOT NULL DEFAULT 0;");
        }

        userColumns.Add("EmailVerified");
    }

    if (!userColumns.Contains("VerificationCode"))
    {
        if (IsPostgresProvider(providerName))
        {
            await EnsureSqlAsync(db, "ALTER TABLE \"Users\" ADD COLUMN \"VerificationCode\" text NULL;");
        }
        else
        {
            await EnsureSqlAsync(db, "ALTER TABLE \"Users\" ADD COLUMN \"VerificationCode\" TEXT NULL;");
        }

        userColumns.Add("VerificationCode");
    }

    if (!userColumns.Contains("VerificationExpiresAt"))
    {
        if (IsPostgresProvider(providerName))
        {
            await EnsureSqlAsync(db, "ALTER TABLE \"Users\" ADD COLUMN \"VerificationExpiresAt\" timestamp with time zone NULL;");
        }
        else
        {
            await EnsureSqlAsync(db, "ALTER TABLE \"Users\" ADD COLUMN \"VerificationExpiresAt\" TEXT NULL;");
        }

        userColumns.Add("VerificationExpiresAt");
    }

    if (!userColumns.Contains("PasswordResetCode"))
    {
        if (IsPostgresProvider(providerName))
        {
            await EnsureSqlAsync(db, "ALTER TABLE \"Users\" ADD COLUMN \"PasswordResetCode\" text NULL;");
        }
        else
        {
            await EnsureSqlAsync(db, "ALTER TABLE \"Users\" ADD COLUMN \"PasswordResetCode\" TEXT NULL;");
        }

        userColumns.Add("PasswordResetCode");
    }

    if (!userColumns.Contains("PasswordResetExpiresAt"))
    {
        if (IsPostgresProvider(providerName))
        {
            await EnsureSqlAsync(db, "ALTER TABLE \"Users\" ADD COLUMN \"PasswordResetExpiresAt\" timestamp with time zone NULL;");
        }
        else
        {
            await EnsureSqlAsync(db, "ALTER TABLE \"Users\" ADD COLUMN \"PasswordResetExpiresAt\" TEXT NULL;");
        }

        userColumns.Add("PasswordResetExpiresAt");
    }

    if (!userColumns.Contains("GoogleId"))
    {
        if (IsPostgresProvider(providerName))
        {
            await EnsureSqlAsync(db, "ALTER TABLE \"Users\" ADD COLUMN \"GoogleId\" character varying(128) NULL;");
        }
        else
        {
            await EnsureSqlAsync(db, "ALTER TABLE \"Users\" ADD COLUMN \"GoogleId\" TEXT NULL;");
        }

        userColumns.Add("GoogleId");
    }

    await EnsureSqlAsync(
        db,
        "UPDATE \"Users\" SET \"EmailVerified\" = true WHERE \"EmailVerified\" = false AND (\"VerificationCode\" IS NULL OR TRIM(\"VerificationCode\") = '');");
    await EnsureSqlAsync(
        db,
        "UPDATE \"Users\" SET \"EmailVerified\" = true WHERE \"EmailVerified\" = false AND \"Role\" <> 'Customer';");

    await EnsureTableAsync(
        db,
        existingTables,
        "Staff",
        """
        CREATE TABLE IF NOT EXISTS "Staff" (
            "Id" INTEGER NOT NULL CONSTRAINT "PK_Staff" PRIMARY KEY AUTOINCREMENT,
            "UserId" INTEGER NULL,
            "Name" TEXT NOT NULL,
            "Email" TEXT NOT NULL,
            "Password" TEXT NOT NULL,
            "Role" TEXT NOT NULL
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS "Staff" (
            "Id" integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            "UserId" integer NULL,
            "Name" character varying(120) NOT NULL,
            "Email" character varying(200) NOT NULL,
            "Password" character varying(255) NOT NULL,
            "Role" character varying(30) NOT NULL
        );
        """);

    var staffColumns = await GetTableColumnsAsync(connection, providerName, "Staff");
    if (!staffColumns.Contains("UserId"))
    {
        await EnsureSqlAsync(db, "ALTER TABLE \"Staff\" ADD COLUMN \"UserId\" INTEGER NULL;");
        staffColumns.Add("UserId");
    }

    await EnsureSqlAsync(db, "CREATE UNIQUE INDEX IF NOT EXISTS \"IX_Staff_Email\" ON \"Staff\" (\"Email\");");
    await EnsureSqlAsync(db, "CREATE UNIQUE INDEX IF NOT EXISTS \"IX_Staff_UserId\" ON \"Staff\" (\"UserId\");");

    await EnsureTableAsync(
        db,
        existingTables,
        "Vendors",
        """
        CREATE TABLE IF NOT EXISTS "Vendors" (
            "Id" INTEGER NOT NULL CONSTRAINT "PK_Vendors" PRIMARY KEY AUTOINCREMENT,
            "VendorName" TEXT NOT NULL,
            "CompanyName" TEXT NOT NULL,
            "Phone" TEXT NOT NULL,
            "Email" TEXT NOT NULL,
            "Address" TEXT NOT NULL,
            "CreatedAt" TEXT NOT NULL
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS "Vendors" (
            "Id" integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            "VendorName" text NOT NULL,
            "CompanyName" text NOT NULL,
            "Phone" text NOT NULL,
            "Email" text NOT NULL,
            "Address" text NOT NULL,
            "CreatedAt" timestamp with time zone NOT NULL
        );
        """);

    var vendorColumns = await GetTableColumnsAsync(connection, providerName, "Vendors");

    if (!vendorColumns.Contains("Status"))
    {
        if (IsPostgresProvider(providerName))
        {
            await EnsureSqlAsync(db, "ALTER TABLE \"Vendors\" ADD COLUMN \"Status\" character varying(30) NOT NULL DEFAULT 'Active';");
        }
        else
        {
            await EnsureSqlAsync(db, "ALTER TABLE \"Vendors\" ADD COLUMN \"Status\" TEXT NOT NULL DEFAULT 'Active';");
        }

        vendorColumns.Add("Status");
    }

    await EnsureSqlAsync(db, "UPDATE \"Vendors\" SET \"Status\" = 'Active' WHERE \"Status\" IS NULL OR TRIM(\"Status\") = '';");

    await EnsureTableAsync(
        db,
        existingTables,
        "Parts",
        """
        CREATE TABLE IF NOT EXISTS "Parts" (
            "Id" INTEGER NOT NULL CONSTRAINT "PK_Parts" PRIMARY KEY AUTOINCREMENT,
            "PartName" TEXT NOT NULL,
            "Category" TEXT NOT NULL,
            "Price" numeric(18,2) NOT NULL,
            "Quantity" INTEGER NOT NULL,
            "Description" TEXT NOT NULL,
            "VendorId" INTEGER NOT NULL,
            "CreatedAt" TEXT NOT NULL,
            CONSTRAINT "FK_Parts_Vendors_VendorId" FOREIGN KEY ("VendorId") REFERENCES "Vendors" ("Id") ON DELETE RESTRICT
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS "Parts" (
            "Id" integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            "PartName" text NOT NULL,
            "Category" text NOT NULL,
            "Price" numeric(18,2) NOT NULL,
            "Quantity" integer NOT NULL,
            "Description" text NOT NULL,
            "VendorId" integer NOT NULL,
            "CreatedAt" timestamp with time zone NOT NULL,
            CONSTRAINT "FK_Parts_Vendors_VendorId" FOREIGN KEY ("VendorId") REFERENCES "Vendors" ("Id") ON DELETE RESTRICT
        );
        """);

    await EnsureSqlAsync(db, "CREATE INDEX IF NOT EXISTS \"IX_Parts_VendorId\" ON \"Parts\" (\"VendorId\");");

    var partsColumns = await GetTableColumnsAsync(connection, providerName, "Parts");
    if (!partsColumns.Contains("LastLowStockNotifiedAt"))
    {
        if (IsPostgresProvider(providerName))
        {
            await EnsureSqlAsync(db, "ALTER TABLE \"Parts\" ADD COLUMN \"LastLowStockNotifiedAt\" timestamp with time zone NULL;");
        }
        else
        {
            await EnsureSqlAsync(db, "ALTER TABLE \"Parts\" ADD COLUMN \"LastLowStockNotifiedAt\" TEXT NULL;");
        }

        partsColumns.Add("LastLowStockNotifiedAt");
    }

    await EnsureTableAsync(
        db,
        existingTables,
        "Sales",
        """
        CREATE TABLE IF NOT EXISTS "Sales" (
            "Id" INTEGER NOT NULL CONSTRAINT "PK_Sales" PRIMARY KEY AUTOINCREMENT,
            "CustomerId" INTEGER NOT NULL,
            "Date" TEXT NOT NULL,
            "TotalAmount" numeric(18,2) NOT NULL
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS "Sales" (
            "Id" integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            "CustomerId" integer NOT NULL,
            "Date" timestamp with time zone NOT NULL,
            "TotalAmount" numeric(18,2) NOT NULL,
            "DiscountAmount" numeric(18,2) NOT NULL DEFAULT 0,
            "FinalAmount" numeric(18,2) NOT NULL DEFAULT 0,
            "LoyaltyDiscountApplied" boolean NOT NULL DEFAULT false
        );
        """);

    var salesColumns = await GetTableColumnsAsync(connection, providerName, "Sales");
    if (!salesColumns.Contains("DiscountAmount"))
    {
        await EnsureSqlAsync(db, IsPostgresProvider(providerName)
            ? "ALTER TABLE \"Sales\" ADD COLUMN \"DiscountAmount\" numeric(18,2) NOT NULL DEFAULT 0;"
            : "ALTER TABLE \"Sales\" ADD COLUMN \"DiscountAmount\" numeric(18,2) NOT NULL DEFAULT 0;");
        salesColumns.Add("DiscountAmount");
    }

    if (!salesColumns.Contains("FinalAmount"))
    {
        await EnsureSqlAsync(db, IsPostgresProvider(providerName)
            ? "ALTER TABLE \"Sales\" ADD COLUMN \"FinalAmount\" numeric(18,2) NOT NULL DEFAULT 0;"
            : "ALTER TABLE \"Sales\" ADD COLUMN \"FinalAmount\" numeric(18,2) NOT NULL DEFAULT 0;");
        salesColumns.Add("FinalAmount");
    }

    if (!salesColumns.Contains("LoyaltyDiscountApplied"))
    {
        await EnsureSqlAsync(db, IsPostgresProvider(providerName)
            ? "ALTER TABLE \"Sales\" ADD COLUMN \"LoyaltyDiscountApplied\" boolean NOT NULL DEFAULT false;"
            : "ALTER TABLE \"Sales\" ADD COLUMN \"LoyaltyDiscountApplied\" INTEGER NOT NULL DEFAULT 0;");
        salesColumns.Add("LoyaltyDiscountApplied");
    }

    await EnsureSqlAsync(db, "UPDATE \"Sales\" SET \"FinalAmount\" = \"TotalAmount\" WHERE \"FinalAmount\" = 0 AND \"TotalAmount\" <> 0;");

    await EnsureTableAsync(
        db,
        existingTables,
        "SaleItems",
        """
        CREATE TABLE IF NOT EXISTS "SaleItems" (
            "Id" INTEGER NOT NULL CONSTRAINT "PK_SaleItems" PRIMARY KEY AUTOINCREMENT,
            "PartId" INTEGER NOT NULL,
            "Quantity" INTEGER NOT NULL,
            "Price" numeric(18,2) NOT NULL,
            "SaleId" INTEGER NOT NULL,
            CONSTRAINT "FK_SaleItems_Sales_SaleId" FOREIGN KEY ("SaleId") REFERENCES "Sales" ("Id") ON DELETE CASCADE
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS "SaleItems" (
            "Id" integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            "PartId" integer NOT NULL,
            "Quantity" integer NOT NULL,
            "Price" numeric(18,2) NOT NULL,
            "SaleId" integer NOT NULL,
            CONSTRAINT "FK_SaleItems_Sales_SaleId" FOREIGN KEY ("SaleId") REFERENCES "Sales" ("Id") ON DELETE CASCADE
        );
        """);

    await EnsureSqlAsync(db, "CREATE INDEX IF NOT EXISTS \"IX_SaleItems_SaleId\" ON \"SaleItems\" (\"SaleId\");");

    await EnsureTableAsync(
        db,
        existingTables,
        "PurchaseInvoices",
        """
        CREATE TABLE IF NOT EXISTS "PurchaseInvoices" (
            "Id" INTEGER NOT NULL CONSTRAINT "PK_PurchaseInvoices" PRIMARY KEY AUTOINCREMENT,
            "VendorId" INTEGER NOT NULL,
            "InvoiceNumber" TEXT NOT NULL,
            "PurchaseDate" TEXT NOT NULL,
            "TotalAmount" numeric(18,2) NOT NULL,
            "CreatedAt" TEXT NOT NULL,
            CONSTRAINT "FK_PurchaseInvoices_Vendors_VendorId" FOREIGN KEY ("VendorId") REFERENCES "Vendors" ("Id") ON DELETE RESTRICT
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS "PurchaseInvoices" (
            "Id" integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            "VendorId" integer NOT NULL,
            "InvoiceNumber" character varying(50) NOT NULL,
            "PurchaseDate" timestamp with time zone NOT NULL,
            "TotalAmount" numeric(18,2) NOT NULL,
            "CreatedAt" timestamp with time zone NOT NULL,
            CONSTRAINT "FK_PurchaseInvoices_Vendors_VendorId" FOREIGN KEY ("VendorId") REFERENCES "Vendors" ("Id") ON DELETE RESTRICT
        );
        """);

    await EnsureSqlAsync(db, "CREATE UNIQUE INDEX IF NOT EXISTS \"IX_PurchaseInvoices_InvoiceNumber\" ON \"PurchaseInvoices\" (\"InvoiceNumber\");");
    await EnsureSqlAsync(db, "CREATE INDEX IF NOT EXISTS \"IX_PurchaseInvoices_VendorId\" ON \"PurchaseInvoices\" (\"VendorId\");");

    await EnsureTableAsync(
        db,
        existingTables,
        "Appointments",
        """
        CREATE TABLE IF NOT EXISTS "Appointments" (
            "Id" INTEGER NOT NULL CONSTRAINT "PK_Appointments" PRIMARY KEY AUTOINCREMENT,
            "CustomerId" INTEGER NOT NULL,
            "VehicleId" INTEGER NOT NULL,
            "AppointmentDate" TEXT NOT NULL,
            "ServiceType" TEXT NOT NULL,
            "Description" TEXT NOT NULL,
            "Status" TEXT NOT NULL DEFAULT 'Pending',
            "CreatedAt" TEXT NOT NULL,
            CONSTRAINT "FK_Appointments_Customers_CustomerId" FOREIGN KEY ("CustomerId") REFERENCES "Customers" ("Id") ON DELETE CASCADE,
            CONSTRAINT "FK_Appointments_CustomerVehicles_VehicleId" FOREIGN KEY ("VehicleId") REFERENCES "CustomerVehicles" ("Id") ON DELETE RESTRICT
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS "Appointments" (
            "Id" integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            "CustomerId" integer NOT NULL,
            "VehicleId" integer NOT NULL,
            "AppointmentDate" timestamp with time zone NOT NULL,
            "ServiceType" character varying(120) NOT NULL,
            "Description" text NOT NULL,
            "Status" character varying(40) NOT NULL DEFAULT 'Pending',
            "CreatedAt" timestamp with time zone NOT NULL,
            CONSTRAINT "FK_Appointments_Customers_CustomerId" FOREIGN KEY ("CustomerId") REFERENCES "Customers" ("Id") ON DELETE CASCADE,
            CONSTRAINT "FK_Appointments_CustomerVehicles_VehicleId" FOREIGN KEY ("VehicleId") REFERENCES "CustomerVehicles" ("Id") ON DELETE RESTRICT
        );
        """);

    await EnsureSqlAsync(db, "CREATE INDEX IF NOT EXISTS \"IX_Appointments_CustomerId\" ON \"Appointments\" (\"CustomerId\");");
    await EnsureSqlAsync(db, "CREATE INDEX IF NOT EXISTS \"IX_Appointments_VehicleId\" ON \"Appointments\" (\"VehicleId\");");

    await EnsureTableAsync(
        db,
        existingTables,
        "PurchaseInvoiceItems",
        """
        CREATE TABLE IF NOT EXISTS "PurchaseInvoiceItems" (
            "Id" INTEGER NOT NULL CONSTRAINT "PK_PurchaseInvoiceItems" PRIMARY KEY AUTOINCREMENT,
            "PurchaseInvoiceId" INTEGER NOT NULL,
            "PartId" INTEGER NOT NULL,
            "Quantity" INTEGER NOT NULL,
            "UnitPrice" numeric(18,2) NOT NULL,
            "SubTotal" numeric(18,2) NOT NULL,
            CONSTRAINT "FK_PurchaseInvoiceItems_PurchaseInvoices_PurchaseInvoiceId" FOREIGN KEY ("PurchaseInvoiceId") REFERENCES "PurchaseInvoices" ("Id") ON DELETE CASCADE,
            CONSTRAINT "FK_PurchaseInvoiceItems_Parts_PartId" FOREIGN KEY ("PartId") REFERENCES "Parts" ("Id") ON DELETE RESTRICT
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS "PurchaseInvoiceItems" (
            "Id" integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            "PurchaseInvoiceId" integer NOT NULL,
            "PartId" integer NOT NULL,
            "Quantity" integer NOT NULL,
            "UnitPrice" numeric(18,2) NOT NULL,
            "SubTotal" numeric(18,2) NOT NULL,
            CONSTRAINT "FK_PurchaseInvoiceItems_PurchaseInvoices_PurchaseInvoiceId" FOREIGN KEY ("PurchaseInvoiceId") REFERENCES "PurchaseInvoices" ("Id") ON DELETE CASCADE,
            CONSTRAINT "FK_PurchaseInvoiceItems_Parts_PartId" FOREIGN KEY ("PartId") REFERENCES "Parts" ("Id") ON DELETE RESTRICT
        );
        """);

    await EnsureSqlAsync(db, "CREATE INDEX IF NOT EXISTS \"IX_PurchaseInvoiceItems_PurchaseInvoiceId\" ON \"PurchaseInvoiceItems\" (\"PurchaseInvoiceId\");");
    await EnsureSqlAsync(db, "CREATE INDEX IF NOT EXISTS \"IX_PurchaseInvoiceItems_PartId\" ON \"PurchaseInvoiceItems\" (\"PartId\");");

    await EnsureTableAsync(
        db,
        existingTables,
        "UnavailablePartRequests",
        """
        CREATE TABLE IF NOT EXISTS "UnavailablePartRequests" (
            "Id" INTEGER NOT NULL CONSTRAINT "PK_UnavailablePartRequests" PRIMARY KEY AUTOINCREMENT,
            "CustomerId" INTEGER NOT NULL,
            "PartName" TEXT NOT NULL,
            "VehicleModel" TEXT NOT NULL,
            "Description" TEXT NOT NULL,
            "Status" TEXT NOT NULL DEFAULT 'Pending',
            "CreatedAt" TEXT NOT NULL,
            CONSTRAINT "FK_UnavailablePartRequests_Customers_CustomerId" FOREIGN KEY ("CustomerId") REFERENCES "Customers" ("Id") ON DELETE CASCADE
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS "UnavailablePartRequests" (
            "Id" integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            "CustomerId" integer NOT NULL,
            "PartName" character varying(160) NOT NULL,
            "VehicleModel" character varying(120) NOT NULL,
            "Description" text NOT NULL,
            "Status" character varying(40) NOT NULL DEFAULT 'Pending',
            "CreatedAt" timestamp with time zone NOT NULL,
            CONSTRAINT "FK_UnavailablePartRequests_Customers_CustomerId" FOREIGN KEY ("CustomerId") REFERENCES "Customers" ("Id") ON DELETE CASCADE
        );
        """);

    await EnsureSqlAsync(db, "CREATE INDEX IF NOT EXISTS \"IX_UnavailablePartRequests_CustomerId\" ON \"UnavailablePartRequests\" (\"CustomerId\");");

    await EnsureRequestWorkflowColumnsAsync(db, connection, providerName, "Appointments");
    await EnsureRequestWorkflowColumnsAsync(db, connection, providerName, "UnavailablePartRequests");

    await EnsureTableAsync(
        db,
        existingTables,
        "ServiceReviews",
        """
        CREATE TABLE IF NOT EXISTS "ServiceReviews" (
            "Id" INTEGER NOT NULL CONSTRAINT "PK_ServiceReviews" PRIMARY KEY AUTOINCREMENT,
            "CustomerId" INTEGER NOT NULL,
            "Rating" INTEGER NOT NULL,
            "Comment" TEXT NOT NULL,
            "CreatedAt" TEXT NOT NULL,
            CONSTRAINT "FK_ServiceReviews_Customers_CustomerId" FOREIGN KEY ("CustomerId") REFERENCES "Customers" ("Id") ON DELETE CASCADE
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS "ServiceReviews" (
            "Id" integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            "CustomerId" integer NOT NULL,
            "Rating" integer NOT NULL,
            "Comment" character varying(1000) NOT NULL,
            "CreatedAt" timestamp with time zone NOT NULL,
            CONSTRAINT "FK_ServiceReviews_Customers_CustomerId" FOREIGN KEY ("CustomerId") REFERENCES "Customers" ("Id") ON DELETE CASCADE
        );
        """);

    await EnsureSqlAsync(db, "CREATE INDEX IF NOT EXISTS \"IX_ServiceReviews_CustomerId\" ON \"ServiceReviews\" (\"CustomerId\");");

    await EnsureTableAsync(
        db,
        existingTables,
        "AppNotifications",
        """
        CREATE TABLE IF NOT EXISTS "AppNotifications" (
            "Id" INTEGER NOT NULL CONSTRAINT "PK_AppNotifications" PRIMARY KEY AUTOINCREMENT,
            "Audience" TEXT NOT NULL,
            "UserId" INTEGER NULL,
            "Type" TEXT NOT NULL,
            "Title" TEXT NOT NULL,
            "Message" TEXT NOT NULL,
            "LinkUrl" TEXT NULL,
            "DedupeKey" TEXT NOT NULL,
            "IsRead" INTEGER NOT NULL DEFAULT 0,
            "IsDismissed" INTEGER NOT NULL DEFAULT 0,
            "CreatedAt" TEXT NOT NULL,
            "ReferenceId" INTEGER NULL,
            "ReferenceType" TEXT NULL
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS "AppNotifications" (
            "Id" integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            "Audience" character varying(20) NOT NULL,
            "UserId" integer NULL,
            "Type" character varying(40) NOT NULL,
            "Title" character varying(160) NOT NULL,
            "Message" character varying(1000) NOT NULL,
            "LinkUrl" character varying(200) NULL,
            "DedupeKey" character varying(120) NOT NULL,
            "IsRead" boolean NOT NULL DEFAULT false,
            "IsDismissed" boolean NOT NULL DEFAULT false,
            "CreatedAt" timestamp with time zone NOT NULL,
            "ReferenceId" integer NULL,
            "ReferenceType" character varying(40) NULL
        );
        """);

    await EnsureSqlAsync(db, "CREATE INDEX IF NOT EXISTS \"IX_AppNotifications_DedupeKey\" ON \"AppNotifications\" (\"DedupeKey\");");
    await EnsureSqlAsync(db, "CREATE INDEX IF NOT EXISTS \"IX_AppNotifications_Audience_UserId_IsDismissed\" ON \"AppNotifications\" (\"Audience\", \"UserId\", \"IsDismissed\");");

    var existingColumns = await GetTableColumnsAsync(connection, providerName, "ServiceHistories");

    if (existingColumns.Count == 0)
    {
        return;
    }

    if (existingColumns.Contains("Cost") && !existingColumns.Contains("Amount"))
    {
        await EnsureSqlAsync(db, "ALTER TABLE \"ServiceHistories\" RENAME COLUMN \"Cost\" TO \"Amount\";");
        existingColumns.Remove("Cost");
        existingColumns.Add("Amount");
    }

    if (existingColumns.Contains("ServiceType") && !existingColumns.Contains("HistoryType"))
    {
        await EnsureSqlAsync(db, "ALTER TABLE \"ServiceHistories\" RENAME COLUMN \"ServiceType\" TO \"HistoryType\";");
        existingColumns.Remove("ServiceType");
        existingColumns.Add("HistoryType");
    }

    if (!existingColumns.Contains("Title"))
    {
        await EnsureSqlAsync(db, "ALTER TABLE \"ServiceHistories\" ADD COLUMN \"Title\" TEXT NOT NULL DEFAULT '';");
        existingColumns.Add("Title");
    }

    if (!existingColumns.Contains("PaymentStatus"))
    {
        await EnsureSqlAsync(db, "ALTER TABLE \"ServiceHistories\" ADD COLUMN \"PaymentStatus\" TEXT NOT NULL DEFAULT 'Paid';");
        existingColumns.Add("PaymentStatus");
    }

    if (!existingColumns.Contains("InvoiceNumber"))
    {
        await EnsureSqlAsync(db, "ALTER TABLE \"ServiceHistories\" ADD COLUMN \"InvoiceNumber\" TEXT NULL;");
        existingColumns.Add("InvoiceNumber");
    }

    if (!existingColumns.Contains("ReminderSentAt"))
    {
        if (IsPostgresProvider(providerName))
        {
            await EnsureSqlAsync(db, "ALTER TABLE \"ServiceHistories\" ADD COLUMN \"ReminderSentAt\" timestamp with time zone NULL;");
        }
        else
        {
            await EnsureSqlAsync(db, "ALTER TABLE \"ServiceHistories\" ADD COLUMN \"ReminderSentAt\" TEXT NULL;");
        }

        existingColumns.Add("ReminderSentAt");
    }

    if (existingColumns.Contains("HistoryType") && existingColumns.Contains("Title"))
    {
        await EnsureSqlAsync(
            db,
            """
            UPDATE "ServiceHistories"
            SET "Title" = CASE
                WHEN COALESCE(TRIM("Title"), '') = '' THEN COALESCE("HistoryType", 'History')
                ELSE "Title"
            END,
                "PaymentStatus" = COALESCE(NULLIF(TRIM("PaymentStatus"), ''), 'Paid');
            """);
    }

    // Ensure Customers has a role column for role-based UI and authorization.
    var customerColumns = await GetTableColumnsAsync(connection, providerName, "Customers");

    if (!customerColumns.Contains("Role"))
    {
        if (IsPostgresProvider(providerName))
        {
            await EnsureSqlAsync(db, "ALTER TABLE \"Customers\" ADD COLUMN \"Role\" character varying(30) NOT NULL DEFAULT 'Customer';");
        }
        else
        {
            await EnsureSqlAsync(db, "ALTER TABLE \"Customers\" ADD COLUMN \"Role\" TEXT NOT NULL DEFAULT 'Customer';");
        }

        customerColumns.Add("Role");
    }

    if (!customerColumns.Contains("UserId"))
    {
        await EnsureSqlAsync(db, "ALTER TABLE \"Customers\" ADD COLUMN \"UserId\" INTEGER NULL;");
        customerColumns.Add("UserId");
    }

    if (!customerColumns.Contains("LoyaltyPoints"))
    {
        if (IsPostgresProvider(providerName))
        {
            await EnsureSqlAsync(db, "ALTER TABLE \"Customers\" ADD COLUMN \"LoyaltyPoints\" integer NOT NULL DEFAULT 0;");
        }
        else
        {
            await EnsureSqlAsync(db, "ALTER TABLE \"Customers\" ADD COLUMN \"LoyaltyPoints\" INTEGER NOT NULL DEFAULT 0;");
        }

        customerColumns.Add("LoyaltyPoints");
    }

    if (!customerColumns.Contains("LastLoyaltyNotifiedAt"))
    {
        if (IsPostgresProvider(providerName))
        {
            await EnsureSqlAsync(db, "ALTER TABLE \"Customers\" ADD COLUMN \"LastLoyaltyNotifiedAt\" timestamp with time zone NULL;");
        }
        else
        {
            await EnsureSqlAsync(db, "ALTER TABLE \"Customers\" ADD COLUMN \"LastLoyaltyNotifiedAt\" TEXT NULL;");
        }

        customerColumns.Add("LastLoyaltyNotifiedAt");
    }

    await EnsureSqlAsync(db, "UPDATE \"Customers\" SET \"Role\" = 'Customer' WHERE \"Role\" IS NULL OR TRIM(\"Role\") = '';");
    await EnsureSqlAsync(db, "CREATE UNIQUE INDEX IF NOT EXISTS \"IX_Customers_UserId\" ON \"Customers\" (\"UserId\");");

    // Ensure CustomerVehicles has expected columns added by newer code
    var vehicleColumns = await GetTableColumnsAsync(connection, providerName, "CustomerVehicles");

    if (!vehicleColumns.Contains("VehicleNumber"))
    {
        await EnsureSqlAsync(db, "ALTER TABLE \"CustomerVehicles\" ADD COLUMN \"VehicleNumber\" TEXT NOT NULL DEFAULT '';"
        );
        vehicleColumns.Add("VehicleNumber");
    }

    if (!vehicleColumns.Contains("Color"))
    {
        await EnsureSqlAsync(db, "ALTER TABLE \"CustomerVehicles\" ADD COLUMN \"Color\" TEXT NOT NULL DEFAULT '';"
        );
        vehicleColumns.Add("Color");
    }

    if (!vehicleColumns.Contains("VehicleType"))
    {
        await EnsureSqlAsync(db, "ALTER TABLE \"CustomerVehicles\" ADD COLUMN \"VehicleType\" TEXT NOT NULL DEFAULT '';"
        );
        vehicleColumns.Add("VehicleType");
    }

    if (!vehicleColumns.Contains("CreatedAt"))
    {
        if (IsPostgresProvider(providerName))
        {
            await EnsureSqlAsync(db, "ALTER TABLE \"CustomerVehicles\" ADD COLUMN \"CreatedAt\" timestamp with time zone NULL;");
            await EnsureSqlAsync(db, "UPDATE \"CustomerVehicles\" SET \"CreatedAt\" = CURRENT_TIMESTAMP WHERE \"CreatedAt\" IS NULL;");
        }
        else
        {

            if (IsPostgresProvider(providerName))
            {
                await EnsureSqlAsync(db, "CREATE UNIQUE INDEX IF NOT EXISTS \"IX_CustomerVehicles_LicensePlate\" ON \"CustomerVehicles\" (LOWER(\"LicensePlate\"));");
            }
            else
            {
                await EnsureSqlAsync(db, "CREATE UNIQUE INDEX IF NOT EXISTS \"IX_CustomerVehicles_LicensePlate\" ON \"CustomerVehicles\" (\"LicensePlate\");");
            }
            // SQLite disallows adding a column with a non-constant default via ALTER TABLE.
            // Add a nullable column, then populate existing rows with the current timestamp.
            await EnsureSqlAsync(db, "ALTER TABLE \"CustomerVehicles\" ADD COLUMN \"CreatedAt\" TEXT NULL DEFAULT NULL;");
            await EnsureSqlAsync(db, "UPDATE \"CustomerVehicles\" SET \"CreatedAt\" = datetime('now') WHERE \"CreatedAt\" IS NULL;");
        }

        vehicleColumns.Add("CreatedAt");
    }
}

static async Task MigrateLegacyAuthDataAsync(AppDbContext db, ILogger logger)
{
    await MigrateMisfiledStaffFromCustomersAsync(db, logger);

    var usersByEmail = await db.Users
        .ToDictionaryAsync(user => NormalizeEmail(user.Email), StringComparer.OrdinalIgnoreCase);

    var staffProfiles = await db.StaffProfiles
        .Where(profile => profile.UserId == null)
        .ToListAsync();

    foreach (var staffProfile in staffProfiles)
    {
        var normalizedEmail = NormalizeEmail(staffProfile.LegacyEmail);
        if (string.IsNullOrWhiteSpace(normalizedEmail))
        {
            logger.LogWarning("Skipped staff profile {StaffProfileId} because it has no email.", staffProfile.Id);
            continue;
        }

        var role = NormalizeStaffRole(staffProfile.LegacyRole);
        if (!usersByEmail.TryGetValue(normalizedEmail, out var user))
        {
            user = new AppUser
            {
                Email = normalizedEmail,
                PasswordHash = string.IsNullOrWhiteSpace(staffProfile.LegacyPasswordHash)
                    ? BCrypt.Net.BCrypt.HashPassword("ChangeMe@123")
                    : staffProfile.LegacyPasswordHash,
                Role = role,
                Status = "Active"
            };

            usersByEmail[normalizedEmail] = user;
            db.Users.Add(user);
        }
        else
        {
            user.Email = normalizedEmail;
            user.Status = string.IsNullOrWhiteSpace(user.Status) ? "Active" : user.Status;

            if (string.Equals(user.Role, "Customer", StringComparison.OrdinalIgnoreCase))
            {
                user.Role = role;
            }

            if (string.IsNullOrWhiteSpace(user.PasswordHash)
                && !string.IsNullOrWhiteSpace(staffProfile.LegacyPasswordHash))
            {
                user.PasswordHash = staffProfile.LegacyPasswordHash;
            }
        }

        staffProfile.User = user;
        staffProfile.LegacyEmail = normalizedEmail;
        staffProfile.LegacyRole = role;
        if (string.IsNullOrWhiteSpace(staffProfile.LegacyPasswordHash))
        {
            staffProfile.LegacyPasswordHash = user.PasswordHash;
        }
    }

    var customerProfiles = await db.CustomerProfiles
        .Where(profile => profile.UserId == null)
        .ToListAsync();

    foreach (var customerProfile in customerProfiles)
    {
        var normalizedEmail = NormalizeEmail(customerProfile.LegacyEmail);
        if (string.IsNullOrWhiteSpace(normalizedEmail))
        {
            logger.LogWarning("Skipped customer profile {CustomerProfileId} because it has no email.", customerProfile.Id);
            continue;
        }

        if (!string.Equals(customerProfile.LegacyRole, "Customer", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning(
                "Customer profile {CustomerProfileId} had unexpected role {Role}; normalizing it to Customer.",
                customerProfile.Id,
                customerProfile.LegacyRole);
        }

        if (!usersByEmail.TryGetValue(normalizedEmail, out var user))
        {
            user = new AppUser
            {
                Email = normalizedEmail,
                PasswordHash = string.IsNullOrWhiteSpace(customerProfile.LegacyPasswordHash)
                    ? BCrypt.Net.BCrypt.HashPassword("ChangeMe@123")
                    : customerProfile.LegacyPasswordHash,
                Role = "Customer",
                Status = "Active"
            };

            usersByEmail[normalizedEmail] = user;
            db.Users.Add(user);
        }
        else if (!string.Equals(user.Role, "Customer", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning(
                "Customer profile {CustomerProfileId} uses email {Email} that is already assigned to a {Role} user. Leaving it unlinked to avoid corrupting roles.",
                customerProfile.Id,
                normalizedEmail,
                user.Role);
            customerProfile.LegacyEmail = normalizedEmail;
            customerProfile.LegacyRole = "Customer";
            continue;
        }

        customerProfile.User = user;
        customerProfile.LegacyEmail = normalizedEmail;
        customerProfile.LegacyRole = "Customer";
        if (string.IsNullOrWhiteSpace(customerProfile.LegacyPasswordHash))
        {
            customerProfile.LegacyPasswordHash = user.PasswordHash;
        }
    }

    await db.SaveChangesAsync();
}

static async Task EnsureInitialAdminAsync(
    AppDbContext db,
    IConfiguration configuration,
    ILogger logger)
{
    var adminName = configuration["InitialAdmin:Name"]?.Trim();
    var adminEmail = configuration["InitialAdmin:Email"]?.Trim().ToLowerInvariant();
    var adminPassword = configuration["InitialAdmin:Password"];

    adminName = string.IsNullOrWhiteSpace(adminName) ? "GarageGo Administrator" : adminName;
    adminEmail = string.IsNullOrWhiteSpace(adminEmail) ? "admin@garagego.local" : adminEmail;
    adminPassword = string.IsNullOrWhiteSpace(adminPassword) ? "Admin@123456" : adminPassword;

    var existingUser = await db.Users
        .Include(user => user.StaffProfile)
        .FirstOrDefaultAsync(user => user.Email == adminEmail);

    if (existingUser != null && !string.Equals(existingUser.Role, "Admin", StringComparison.OrdinalIgnoreCase))
    {
        logger.LogWarning(
            "Skipped initial admin seed because account {AdminEmail} already exists with role {ExistingRole}. Promote that account manually or change InitialAdmin:Email.",
            adminEmail,
            existingUser.Role);
        return;
    }

    if (existingUser != null)
    {
        existingUser.Role = "Admin";
        existingUser.Status = "Active";
        existingUser.EmailVerified = true;
        existingUser.VerificationCode = null;
        existingUser.VerificationExpiresAt = null;

        if (existingUser.StaffProfile == null)
        {
            db.StaffProfiles.Add(new StaffProfile
            {
                User = existingUser,
                Name = adminName,
                LegacyEmail = adminEmail,
                LegacyPasswordHash = existingUser.PasswordHash,
                LegacyRole = "Admin"
            });
        }
        else
        {
            existingUser.StaffProfile.Name = adminName;
            existingUser.StaffProfile.LegacyEmail = adminEmail;
            existingUser.StaffProfile.LegacyPasswordHash = existingUser.PasswordHash;
            existingUser.StaffProfile.LegacyRole = "Admin";
        }

        await db.SaveChangesAsync();
        logger.LogInformation("Promoted existing account {AdminEmail} to Admin.", adminEmail);
        return;
    }

    var repairedAdmin = await db.Users
        .Include(user => user.StaffProfile)
        .FirstOrDefaultAsync(user => user.Role == "Admin");

    if (repairedAdmin != null)
    {
        repairedAdmin.Status = "Active";
        repairedAdmin.EmailVerified = true;
        repairedAdmin.VerificationCode = null;
        repairedAdmin.VerificationExpiresAt = null;

        if (repairedAdmin.StaffProfile == null)
        {
            db.StaffProfiles.Add(new StaffProfile
            {
                User = repairedAdmin,
                Name = adminName,
                LegacyEmail = repairedAdmin.Email,
                LegacyPasswordHash = repairedAdmin.PasswordHash,
                LegacyRole = "Admin"
            });
        }
        else
        {
            repairedAdmin.StaffProfile.Name = adminName;
            repairedAdmin.StaffProfile.LegacyEmail = repairedAdmin.Email;
            repairedAdmin.StaffProfile.LegacyPasswordHash = repairedAdmin.PasswordHash;
            repairedAdmin.StaffProfile.LegacyRole = "Admin";
        }

        await db.SaveChangesAsync();
        logger.LogInformation("Repaired existing admin account {AdminEmail}.", repairedAdmin.Email);
        return;
    }

    var passwordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword);
    var adminUser = new AppUser
    {
        Email = adminEmail,
        PasswordHash = passwordHash,
        Role = "Admin",
        Status = "Active",
        EmailVerified = true
    };

    db.Users.Add(adminUser);
    db.StaffProfiles.Add(new StaffProfile
    {
        User = adminUser,
        Name = adminName,
        LegacyEmail = adminEmail,
        LegacyPasswordHash = passwordHash,
        LegacyRole = "Admin"
    });

    await db.SaveChangesAsync();

    logger.LogInformation("Seeded initial admin account for {AdminEmail}.", adminEmail);
}

static async Task MigrateMisfiledStaffFromCustomersAsync(AppDbContext db, ILogger logger)
{
    var misplacedProfiles = (await db.CustomerProfiles.ToListAsync())
        .Where(profile =>
            !string.Equals(profile.LegacyRole, "Customer", StringComparison.OrdinalIgnoreCase))
        .ToList();

    foreach (var customerProfile in misplacedProfiles)
    {
        var staffRole = NormalizeStaffRole(customerProfile.LegacyRole);
        var normalizedEmail = NormalizeEmail(customerProfile.LegacyEmail);

        if (string.IsNullOrWhiteSpace(normalizedEmail))
        {
            logger.LogWarning(
                "Cannot migrate customer profile {CustomerProfileId} with role {Role} because it has no email.",
                customerProfile.Id,
                customerProfile.LegacyRole);
            customerProfile.LegacyRole = "Customer";
            continue;
        }

        var hasCustomerOwnedData =
            await db.CustomerVehicles.AnyAsync(vehicle => vehicle.CustomerId == customerProfile.Id)
            || await db.ServiceHistories.AnyAsync(history => history.CustomerId == customerProfile.Id)
            || await db.Appointments.AnyAsync(appointment => appointment.CustomerId == customerProfile.Id)
            || await db.UnavailablePartRequests.AnyAsync(request => request.CustomerId == customerProfile.Id)
            || await db.ServiceReviews.AnyAsync(review => review.CustomerId == customerProfile.Id);

        if (hasCustomerOwnedData)
        {
            logger.LogWarning(
                "Customer profile {CustomerProfileId} had role {Role} but contains customer data. Leaving it in Customers and normalizing role to Customer.",
                customerProfile.Id,
                customerProfile.LegacyRole);
            customerProfile.LegacyRole = "Customer";
            customerProfile.LegacyEmail = normalizedEmail;
            continue;
        }

        var existingStaffProfile = await db.StaffProfiles
            .FirstOrDefaultAsync(profile => profile.LegacyEmail == normalizedEmail);

        if (existingStaffProfile == null)
        {
            db.StaffProfiles.Add(new StaffProfile
            {
                Name = string.IsNullOrWhiteSpace(customerProfile.Name) ? normalizedEmail : customerProfile.Name.Trim(),
                LegacyEmail = normalizedEmail,
                LegacyPasswordHash = customerProfile.LegacyPasswordHash,
                LegacyRole = staffRole
            });
        }
        else
        {
            existingStaffProfile.Name = string.IsNullOrWhiteSpace(existingStaffProfile.Name)
                ? customerProfile.Name.Trim()
                : existingStaffProfile.Name;
            existingStaffProfile.LegacyEmail = normalizedEmail;
            if (string.IsNullOrWhiteSpace(existingStaffProfile.LegacyPasswordHash))
            {
                existingStaffProfile.LegacyPasswordHash = customerProfile.LegacyPasswordHash;
            }

            if (string.Equals(staffRole, "Admin", StringComparison.OrdinalIgnoreCase))
            {
                existingStaffProfile.LegacyRole = "Admin";
            }
        }

        db.CustomerProfiles.Remove(customerProfile);
        logger.LogInformation(
            "Moved misplaced {Role} record {CustomerProfileId} from Customers to Staff.",
            staffRole,
            customerProfile.Id);
    }

    await db.SaveChangesAsync();
}

static async Task<HashSet<string>> GetTableNamesAsync(DbConnection connection, string providerName)
{
    var tables = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

    await using var command = connection.CreateCommand();
    command.CommandText = providerName.Contains("Npgsql", StringComparison.OrdinalIgnoreCase)
        ? "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
        : "SELECT name FROM sqlite_master WHERE type = 'table';";

    await using var reader = await command.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        tables.Add(reader.GetString(0));
    }

    return tables;
}

static async Task<HashSet<string>> GetTableColumnsAsync(DbConnection connection, string providerName, string tableName)
{
    var columns = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

    await using var command = connection.CreateCommand();

    if (providerName.Contains("Npgsql", StringComparison.OrdinalIgnoreCase))
    {
        command.CommandText = "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = @tableName;";
        var parameter = command.CreateParameter();
        parameter.ParameterName = "@tableName";
        parameter.Value = tableName;
        command.Parameters.Add(parameter);
    }
    else
    {
        command.CommandText = $"PRAGMA table_info('{tableName.Replace("'", "''")}');";
    }

    await using var reader = await command.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        columns.Add(providerName.Contains("Npgsql", StringComparison.OrdinalIgnoreCase)
            ? reader.GetString(0)
            : reader.GetString(1));
    }

    return columns;
}

static async Task EnsureTableAsync(
    AppDbContext db,
    HashSet<string> existingTables,
    string tableName,
    string sqliteSql,
    string postgresSql)
{
    if (existingTables.Contains(tableName))
    {
        return;
    }

    if (IsPostgresProvider(db.Database.ProviderName))
    {
        await EnsureSqlAsync(db, postgresSql);
        existingTables.Add(tableName);
        return;
    }

    await EnsureSqlAsync(db, sqliteSql);

    existingTables.Add(tableName);
}

static async Task EnsureSqlAsync(AppDbContext db, string sql)
{
    await db.Database.ExecuteSqlRawAsync(sql);
}

static bool LooksLikePostgresConnectionString(string connectionString)
{
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        return false;
    }

    return connectionString.StartsWith("Host=", StringComparison.OrdinalIgnoreCase)
        || connectionString.StartsWith("Server=", StringComparison.OrdinalIgnoreCase)
        || connectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
        || connectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase);
}

static string NormalizePostgresConnectionString(string connectionString)
{
    if (!connectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
        && !connectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
    {
        return connectionString;
    }

    if (!Uri.TryCreate(connectionString, UriKind.Absolute, out var uri))
    {
        return connectionString;
    }

    var userInfoParts = uri.UserInfo.Split(':', 2);
    var username = userInfoParts.Length > 0 ? Uri.UnescapeDataString(userInfoParts[0]) : string.Empty;
    var password = userInfoParts.Length > 1 ? Uri.UnescapeDataString(userInfoParts[1]) : string.Empty;
    var database = uri.AbsolutePath.Trim('/').Split('/', StringSplitOptions.RemoveEmptyEntries).LastOrDefault() ?? string.Empty;

    var builder = new NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.IsDefaultPort ? 5432 : uri.Port,
        Database = database,
        Username = username,
        Password = password
    };

    var query = ParseConnectionStringQuery(uri.Query);

    if (query.TryGetValue("sslmode", out var sslMode)
        && Enum.TryParse<SslMode>(sslMode, true, out var parsedSslMode))
    {
        builder.SslMode = parsedSslMode;
    }

    return builder.ConnectionString;
}

static Dictionary<string, string> ParseConnectionStringQuery(string queryString)
{
    var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

    if (string.IsNullOrWhiteSpace(queryString))
    {
        return values;
    }

    foreach (var segment in queryString.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
    {
        var parts = segment.Split('=', 2);
        var key = Uri.UnescapeDataString(parts[0]).Replace('+', ' ').Trim();
        var value = parts.Length > 1 ? Uri.UnescapeDataString(parts[1]).Replace('+', ' ').Trim() : string.Empty;

        if (!string.IsNullOrWhiteSpace(key))
        {
            values[key] = value;
        }
    }

    return values;
}

static bool IsPostgresProvider(string? providerName) =>
    !string.IsNullOrWhiteSpace(providerName)
    && providerName.Contains("Npgsql", StringComparison.OrdinalIgnoreCase);

static async Task EnsureRequestWorkflowColumnsAsync(
    AppDbContext db,
    System.Data.Common.DbConnection connection,
    string providerName,
    string tableName)
{
    var columns = await GetTableColumnsAsync(connection, providerName, tableName);

    if (!columns.Contains("AdminNotes"))
    {
        if (IsPostgresProvider(providerName))
        {
            await EnsureSqlAsync(db, $"ALTER TABLE \"{tableName}\" ADD COLUMN \"AdminNotes\" text NOT NULL DEFAULT '';");
        }
        else
        {
            await EnsureSqlAsync(db, $"ALTER TABLE \"{tableName}\" ADD COLUMN \"AdminNotes\" TEXT NOT NULL DEFAULT '';");
        }

        columns.Add("AdminNotes");
    }

    if (!columns.Contains("UpdatedAt"))
    {
        if (IsPostgresProvider(providerName))
        {
            await EnsureSqlAsync(db, $"ALTER TABLE \"{tableName}\" ADD COLUMN \"UpdatedAt\" timestamp with time zone NULL;");
        }
        else
        {
            await EnsureSqlAsync(db, $"ALTER TABLE \"{tableName}\" ADD COLUMN \"UpdatedAt\" TEXT NULL;");
        }

        columns.Add("UpdatedAt");
    }

    if (!columns.Contains("StatusUpdatedAt"))
    {
        if (IsPostgresProvider(providerName))
        {
            await EnsureSqlAsync(db, $"ALTER TABLE \"{tableName}\" ADD COLUMN \"StatusUpdatedAt\" timestamp with time zone NULL;");
        }
        else
        {
            await EnsureSqlAsync(db, $"ALTER TABLE \"{tableName}\" ADD COLUMN \"StatusUpdatedAt\" TEXT NULL;");
        }
    }
}

static string NormalizeEmail(string? email) =>
    (email ?? string.Empty).Trim().ToLowerInvariant();

static string NormalizeStaffRole(string? role) =>
    (role ?? string.Empty).Trim().ToLowerInvariant() switch
    {
        "admin" => "Admin",
        "sales staff" => "Sales Staff",
        "inventory staff" => "Inventory Staff",
        "receptionist" => "Receptionist",
        "accountant" => "Accountant",
        _ => "Sales Staff"
    };
