namespace Backend.DTOs
{
    public class MaintenancePredictionResponseDto
    {
        public int CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public bool AiAvailable { get; set; }
        public string? Message { get; set; }
        public List<string> PredictedFailures { get; set; } = new();
        public List<string> MaintenanceAlerts { get; set; } = new();
        public List<string> Recommendations { get; set; } = new();
        public List<string> PartReplacementSuggestions { get; set; } = new();
    }
}
