using Microsoft.EntityFrameworkCore;

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
            .WithOrigins("http://localhost:3000")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddScoped<EmailService>();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

var app = builder.Build();

try
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.Migrate();
}
catch (Exception ex)
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    logger.LogError(ex, "An error occurred while attempting to apply migrations.");
}

app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();
app.UseCors(FrontendCorsPolicy); 
app.UseAuthorization();

app.MapControllers();

app.Run();