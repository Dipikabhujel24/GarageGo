namespace Backend.DTOs
{
    public class ServiceHistoryDto
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public int? VehicleId { get; set; }
        public string VehicleDetails { get; set; } = string.Empty;
        public DateTime ServiceDate { get; set; }
        public string ServiceType { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Cost { get; set; }
    }
}