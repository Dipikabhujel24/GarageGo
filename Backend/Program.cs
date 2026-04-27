using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

const string FrontendCorsPolicy = "FrontendCorsPolicy";

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactFrontend", policy =>
    {
        policy
            .WithOrigins("http://localhost:3000")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

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

<<<<<<< HEAD
=======
app.Urls.Clear();
app.Urls.Add("http://localhost:5000");
>>>>>>> d679d7f63088af4efc9a8092bc7e06eb6c17aa78

app.UseSwagger();
app.UseSwaggerUI();

<<<<<<< HEAD
app.UseHttpsRedirection();
app.UseCors(FrontendCorsPolicy);
=======
app.UseCors("ReactFrontend");
>>>>>>> d679d7f63088af4efc9a8092bc7e06eb6c17aa78
app.UseAuthorization();
app.MapControllers();

app.Run();
