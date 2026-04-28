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

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Customer>()
                .HasIndex(c => c.Email)
                .IsUnique();

            modelBuilder.Entity<Customer>()
                .HasMany(c => c.Vehicles)
                .WithOne(v => v.Customer)
                .HasForeignKey(v => v.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Customer>()
                .HasMany(c => c.ServiceHistories)
                .WithOne(s => s.Customer)
                .HasForeignKey(s => s.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<CustomerVehicle>()
                .HasMany(v => v.ServiceHistories)
                .WithOne(s => s.Vehicle)
                .HasForeignKey(s => s.VehicleId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<ServiceHistory>(entity =>
            {
                entity.Property(s => s.HistoryType).HasMaxLength(20);
                entity.Property(s => s.Title).HasMaxLength(150);
                entity.Property(s => s.Description).HasMaxLength(1000);
                entity.Property(s => s.PaymentStatus).HasMaxLength(20);
                entity.Property(s => s.InvoiceNumber).HasMaxLength(50);
            });
        }
    }
}