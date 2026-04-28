using Backend.Data;
using Backend.Services;
using Microsoft.Data.Sqlite;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Data.Common;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddScoped<EmailService>();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();

var sqliteConnectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=garagego-local.db";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(sqliteConnectionString));

var jwtKey = builder.Configuration["Jwt:Key"] ?? "garagego_super_secret_key_123456789";

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:3000",
                "http://localhost:3001",
                "http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
    await EnsureServiceHistorySchemaAsync(db);
}

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

static async Task EnsureServiceHistorySchemaAsync(AppDbContext db)
{
    var connection = db.Database.GetDbConnection();

    if (connection.State != System.Data.ConnectionState.Open)
    {
        await connection.OpenAsync();
    }

    var existingColumns = await GetTableColumnsAsync(connection, "ServiceHistories");

    if (existingColumns.Count == 0)
    {
        return;
    }

    if (existingColumns.Contains("Cost") && !existingColumns.Contains("Amount"))
    {
        await ExecuteSqlAsync(db, "ALTER TABLE \"ServiceHistories\" RENAME COLUMN \"Cost\" TO \"Amount\";");
        existingColumns.Remove("Cost");
        existingColumns.Add("Amount");
    }

    if (existingColumns.Contains("ServiceType") && !existingColumns.Contains("HistoryType"))
    {
        await ExecuteSqlAsync(db, "ALTER TABLE \"ServiceHistories\" RENAME COLUMN \"ServiceType\" TO \"HistoryType\";");
        existingColumns.Remove("ServiceType");
        existingColumns.Add("HistoryType");
    }

    if (!existingColumns.Contains("Title"))
    {
        await ExecuteSqlAsync(db, "ALTER TABLE \"ServiceHistories\" ADD COLUMN \"Title\" TEXT NOT NULL DEFAULT '';" );
        existingColumns.Add("Title");
    }

    if (!existingColumns.Contains("PaymentStatus"))
    {
        await ExecuteSqlAsync(db, "ALTER TABLE \"ServiceHistories\" ADD COLUMN \"PaymentStatus\" TEXT NOT NULL DEFAULT 'Paid';" );
        existingColumns.Add("PaymentStatus");
    }

    if (!existingColumns.Contains("InvoiceNumber"))
    {
        await ExecuteSqlAsync(db, "ALTER TABLE \"ServiceHistories\" ADD COLUMN \"InvoiceNumber\" TEXT NULL;");
        existingColumns.Add("InvoiceNumber");
    }

    if (existingColumns.Contains("HistoryType") && existingColumns.Contains("Title"))
    {
        await ExecuteSqlAsync(db, @"UPDATE ""ServiceHistories""
SET ""Title"" = CASE
    WHEN COALESCE(TRIM(""Title""), '') = '' THEN COALESCE(""HistoryType"", 'History')
    ELSE ""Title""
END,
    ""PaymentStatus"" = COALESCE(NULLIF(TRIM(""PaymentStatus""), ''), 'Paid')");
    }
}

static async Task<HashSet<string>> GetTableColumnsAsync(DbConnection connection, string tableName)
{
    var columns = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

    await using var command = connection.CreateCommand();
    command.CommandText = $"PRAGMA table_info('{tableName.Replace("'", "''")}');";

    await using var reader = await command.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        columns.Add(reader.GetString(1));
    }

    return columns;
}

static async Task ExecuteSqlAsync(AppDbContext db, string sql)
{
    await db.Database.ExecuteSqlRawAsync(sql);
}