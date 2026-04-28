namespace Backend.DTOs
{
    public class ServiceHistoryDto
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public int? VehicleId { get; set; }
        public string VehicleDetails { get; set; } = string.Empty;
        public string HistoryType { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string PaymentStatus { get; set; } = string.Empty;
        public string? InvoiceNumber { get; set; }
        public DateTime ServiceDate { get; set; }
    }
}