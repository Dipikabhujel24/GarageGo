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
    }
}