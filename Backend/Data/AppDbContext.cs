using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<AppUser> Users { get; set; } = null!;
        public DbSet<CustomerProfile> CustomerProfiles { get; set; } = null!;
        public DbSet<CustomerVehicle> CustomerVehicles { get; set; } = null!;
        public DbSet<ServiceHistory> ServiceHistories { get; set; } = null!;
        public DbSet<Sale> Sales { get; set; } = null!;
        public DbSet<SaleItem> SaleItems { get; set; } = null!;
        public DbSet<StaffProfile> StaffProfiles { get; set; } = null!;
        public DbSet<Vendor> Vendors { get; set; } = null!;
        public DbSet<Part> Parts { get; set; } = null!;
        public DbSet<Appointment> Appointments { get; set; } = null!;
        public DbSet<UnavailablePartRequest> UnavailablePartRequests { get; set; } = null!;
        public DbSet<ServiceReview> ServiceReviews { get; set; } = null!;
        public DbSet<PurchaseInvoice> PurchaseInvoices { get; set; } = null!;
        public DbSet<PurchaseInvoiceItem> PurchaseInvoiceItems { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<AppUser>()
                .HasIndex(user => user.Email)
                .IsUnique();

            modelBuilder.Entity<CustomerProfile>()
                .HasIndex(customer => customer.LegacyEmail)
                .IsUnique();

            modelBuilder.Entity<StaffProfile>()
                .HasIndex(staff => staff.LegacyEmail)
                .IsUnique();

            modelBuilder.Entity<CustomerProfile>()
                .HasOne(customer => customer.User)
                .WithOne(user => user.CustomerProfile)
                .HasForeignKey<CustomerProfile>(customer => customer.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<StaffProfile>()
                .HasOne(staff => staff.User)
                .WithOne(user => user.StaffProfile)
                .HasForeignKey<StaffProfile>(staff => staff.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<CustomerProfile>()
                .HasMany(customer => customer.Vehicles)
                .WithOne(vehicle => vehicle.Customer)
                .HasForeignKey(vehicle => vehicle.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<CustomerProfile>()
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

            modelBuilder.Entity<CustomerProfile>()
                .HasMany(customer => customer.Appointments)
                .WithOne()
                .HasForeignKey(appointment => appointment.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<CustomerProfile>()
                .HasMany(customer => customer.UnavailablePartRequests)
                .WithOne()
                .HasForeignKey(request => request.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<CustomerProfile>()
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

            modelBuilder.Entity<Vendor>()
                .HasMany(vendor => vendor.Parts)
                .WithOne(part => part.Vendor)
                .HasForeignKey(part => part.VendorId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Vendor>()
                .Property(vendor => vendor.Status)
                .HasMaxLength(30);

            modelBuilder.Entity<Part>()
                .Property(part => part.Price)
                .HasColumnType("numeric(18,2)");

            modelBuilder.Entity<PurchaseInvoice>(entity =>
            {
                entity.HasIndex(invoice => invoice.InvoiceNumber).IsUnique();
                entity.Property(invoice => invoice.InvoiceNumber).HasMaxLength(50);
                entity.Property(invoice => invoice.TotalAmount).HasColumnType("numeric(18,2)");

                entity.HasOne(invoice => invoice.Vendor)
                    .WithMany()
                    .HasForeignKey(invoice => invoice.VendorId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<PurchaseInvoiceItem>(entity =>
            {
                entity.Property(item => item.UnitPrice).HasColumnType("numeric(18,2)");
                entity.Property(item => item.SubTotal).HasColumnType("numeric(18,2)");

                entity.HasOne(item => item.PurchaseInvoice)
                    .WithMany(invoice => invoice.Items)
                    .HasForeignKey(item => item.PurchaseInvoiceId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(item => item.Part)
                    .WithMany()
                    .HasForeignKey(item => item.PartId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<Sale>()
                .Property(sale => sale.TotalAmount)
                .HasColumnType("numeric(18,2)");

            modelBuilder.Entity<SaleItem>()
                .Property(item => item.Price)
                .HasColumnType("numeric(18,2)");
        }
    }
}
