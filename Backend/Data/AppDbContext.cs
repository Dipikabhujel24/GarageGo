using Microsoft.EntityFrameworkCore;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Sale> Sales { get; set; }
    public DbSet<SaleItem> SaleItems { get; set; }
    public DbSet<Staff> Staff { get; set; }
    public DbSet<Vendor> Vendors { get; set; }
    public DbSet<Part> Parts { get; set; }
    public DbSet<Customer> Customers { get; set; }
    public DbSet<CustomerVehicle> CustomerVehicles { get; set; }
    public DbSet<ServiceHistory> ServiceHistories { get; set; }
    public DbSet<Appointment> Appointments { get; set; }
    public DbSet<UnavailablePartRequest> UnavailablePartRequests { get; set; }
    public DbSet<ServiceReview> ServiceReviews { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Vendor>()
            .HasMany(vendor => vendor.Parts)
            .WithOne(part => part.Vendor)
            .HasForeignKey(part => part.VendorId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Part>()
            .Property(part => part.Price)
            .HasColumnType("numeric(18,2)");

        modelBuilder.Entity<Customer>()
            .HasMany(customer => customer.Vehicles)
            .WithOne(vehicle => vehicle.Customer)
            .HasForeignKey(vehicle => vehicle.CustomerId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Customer>()
            .HasMany(customer => customer.ServiceHistories)
            .WithOne(history => history.Customer)
            .HasForeignKey(history => history.CustomerId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ServiceHistory>()
            .HasOne(history => history.Vehicle)
            .WithMany(vehicle => vehicle.ServiceHistories)
            .HasForeignKey(history => history.CustomerVehicleId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<ServiceHistory>()
            .Property(history => history.TotalCost)
            .HasColumnType("numeric(18,2)");

        modelBuilder.Entity<Appointment>()
            .HasOne<Customer>()
            .WithMany(customer => customer.Appointments)
            .HasForeignKey(appointment => appointment.CustomerId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Appointment>()
            .HasOne<CustomerVehicle>()
            .WithMany(vehicle => vehicle.Appointments)
            .HasForeignKey(appointment => appointment.VehicleId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<UnavailablePartRequest>()
            .HasOne<Customer>()
            .WithMany(customer => customer.UnavailablePartRequests)
            .HasForeignKey(request => request.CustomerId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ServiceReview>()
            .HasOne<Customer>()
            .WithMany(customer => customer.ServiceReviews)
            .HasForeignKey(review => review.CustomerId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
