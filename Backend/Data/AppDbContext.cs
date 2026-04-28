using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Customer> Customers { get; set; } = null!;
        public DbSet<CustomerVehicle> CustomerVehicles { get; set; } = null!;
        public DbSet<ServiceHistory> ServiceHistories { get; set; } = null!;
        public DbSet<Sale> Sales { get; set; } = null!;
        public DbSet<SaleItem> SaleItems { get; set; } = null!;
        public DbSet<Staff> Staff { get; set; } = null!;
        public DbSet<Vendor> Vendors { get; set; } = null!;
        public DbSet<Part> Parts { get; set; } = null!;
        public DbSet<Appointment> Appointments { get; set; } = null!;
        public DbSet<UnavailablePartRequest> UnavailablePartRequests { get; set; } = null!;
        public DbSet<ServiceReview> ServiceReviews { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Customer>()
                .HasIndex(customer => customer.Email)
                .IsUnique();

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

            modelBuilder.Entity<CustomerVehicle>()
                .HasMany(vehicle => vehicle.ServiceHistories)
                .WithOne(history => history.Vehicle)
                .HasForeignKey(history => history.VehicleId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<CustomerVehicle>()
                .HasMany(vehicle => vehicle.Appointments)
                .WithOne()
                .HasForeignKey(appointment => appointment.VehicleId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Customer>()
                .HasMany(customer => customer.Appointments)
                .WithOne()
                .HasForeignKey(appointment => appointment.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Customer>()
                .HasMany(customer => customer.UnavailablePartRequests)
                .WithOne()
                .HasForeignKey(request => request.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Customer>()
                .HasMany(customer => customer.ServiceReviews)
                .WithOne()
                .HasForeignKey(review => review.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ServiceHistory>(entity =>
            {
                entity.Property(history => history.HistoryType).HasMaxLength(20);
                entity.Property(history => history.Title).HasMaxLength(150);
                entity.Property(history => history.Description).HasMaxLength(1000);
                entity.Property(history => history.PaymentStatus).HasMaxLength(20);
                entity.Property(history => history.InvoiceNumber).HasMaxLength(50);
                entity.Property(history => history.Amount).HasColumnType("numeric(18,2)");
            });

            modelBuilder.Entity<Staff>()
                .HasIndex(staff => staff.Email)
                .IsUnique();

            modelBuilder.Entity<Vendor>()
                .HasMany(vendor => vendor.Parts)
                .WithOne(part => part.Vendor)
                .HasForeignKey(part => part.VendorId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Part>()
                .Property(part => part.Price)
                .HasColumnType("numeric(18,2)");

            modelBuilder.Entity<Sale>()
                .Property(sale => sale.TotalAmount)
                .HasColumnType("numeric(18,2)");

            modelBuilder.Entity<SaleItem>()
                .Property(item => item.Price)
                .HasColumnType("numeric(18,2)");
        }
    }
}
