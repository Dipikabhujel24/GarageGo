using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Backend.Data;
using Backend.DTOs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Backend.Services
{
    public class OpenRouterSettings
    {
        public string ApiKey { get; set; } = string.Empty;
        public string Model { get; set; } = "openai/gpt-4o-mini";
        public string BaseUrl { get; set; } = "https://openrouter.ai/api/v1";
    }

    public class PredictiveMaintenanceService
    {
        private readonly AppDbContext _context;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly OpenRouterSettings _settings;
        private readonly ILogger<PredictiveMaintenanceService> _logger;

        public PredictiveMaintenanceService(
            AppDbContext context,
            IHttpClientFactory httpClientFactory,
            IOptions<OpenRouterSettings> settings,
            ILogger<PredictiveMaintenanceService> logger)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
            _settings = settings.Value;
            _logger = logger;
        }

        public async Task<MaintenancePredictionResponseDto> PredictAsync(int customerId, CancellationToken cancellationToken = default)
        {
            var customer = await _context.CustomerProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(profile => profile.Id == customerId, cancellationToken);

            if (customer == null)
            {
                return new MaintenancePredictionResponseDto
                {
                    CustomerId = customerId,
                    AiAvailable = false,
                    Message = "Customer not found."
                };
            }

            var contextText = await BuildCustomerContextAsync(customerId, customer.Name, cancellationToken);

            if (string.IsNullOrWhiteSpace(_settings.ApiKey))
            {
                return BuildFallbackResponse(customerId, customer.Name,
                    "AI maintenance predictions are not configured. Add your OpenRouter API key to OpenRouter:ApiKey.");
            }

            try
            {
                var aiContent = await CallOpenRouterAsync(contextText, cancellationToken);
                if (string.IsNullOrWhiteSpace(aiContent))
                {
                    return BuildFallbackResponse(customerId, customer.Name,
                        "AI service returned an empty response. Please try again later.");
                }

                var parsed = TryParseAiJson(aiContent);
                if (parsed == null)
                {
                    return BuildFallbackResponse(customerId, customer.Name,
                        "Could not parse AI recommendations. Please try again later.");
                }

                return new MaintenancePredictionResponseDto
                {
                    CustomerId = customerId,
                    CustomerName = customer.Name,
                    AiAvailable = true,
                    Message = "Predictions generated from your vehicle and service data.",
                    PredictedFailures = parsed.PredictedFailures,
                    MaintenanceAlerts = parsed.MaintenanceAlerts,
                    Recommendations = parsed.Recommendations,
                    PartReplacementSuggestions = parsed.PartReplacementSuggestions
                };
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "OpenRouter maintenance prediction failed for customer {CustomerId}", customerId);
                return BuildFallbackResponse(customerId, customer.Name,
                    "AI maintenance predictions are temporarily unavailable. Please try again later.");
            }
        }

        private async Task<string> BuildCustomerContextAsync(int customerId, string customerName, CancellationToken cancellationToken)
        {
            var vehicles = await _context.CustomerVehicles
                .AsNoTracking()
                .Where(vehicle => vehicle.CustomerId == customerId)
                .OrderBy(vehicle => vehicle.Year)
                .ToListAsync(cancellationToken);

            var serviceHistory = await _context.ServiceHistories
                .AsNoTracking()
                .Where(history => history.CustomerId == customerId)
                .OrderByDescending(history => history.ServiceDate)
                .Take(25)
                .ToListAsync(cancellationToken);

            var sales = await _context.Sales
                .AsNoTracking()
                .Where(sale => sale.CustomerId == customerId)
                .OrderByDescending(sale => sale.Date)
                .Take(15)
                .ToListAsync(cancellationToken);

            var saleIds = sales.Select(sale => sale.Id).ToList();
            List<(int PartId, int Quantity, decimal Price, DateTime SaleDate)> saleItems;
            if (saleIds.Count == 0)
            {
                saleItems = new List<(int PartId, int Quantity, decimal Price, DateTime SaleDate)>();
            }
            else
            {
                var saleItemRows = await (
                    from item in _context.SaleItems.AsNoTracking()
                    join sale in _context.Sales.AsNoTracking() on item.SaleId equals sale.Id
                    where saleIds.Contains(item.SaleId)
                    select new { item.PartId, item.Quantity, item.Price, sale.Date })
                    .ToListAsync(cancellationToken);

                saleItems = saleItemRows
                    .Select(row => (row.PartId, row.Quantity, row.Price, row.Date))
                    .ToList();
            }

            var partIds = saleItems.Select(item => item.PartId).Distinct().ToList();
            var partsById = partIds.Count == 0
                ? new Dictionary<int, string>()
                : await _context.Parts
                    .AsNoTracking()
                    .Where(part => partIds.Contains(part.Id))
                    .ToDictionaryAsync(part => part.Id, part => part.PartName, cancellationToken);

            var appointments = await _context.Appointments
                .AsNoTracking()
                .Where(appointment => appointment.CustomerId == customerId)
                .OrderByDescending(appointment => appointment.AppointmentDate)
                .Take(10)
                .ToListAsync(cancellationToken);

            var partRequests = await _context.UnavailablePartRequests
                .AsNoTracking()
                .Where(request => request.CustomerId == customerId)
                .OrderByDescending(request => request.CreatedAt)
                .Take(10)
                .ToListAsync(cancellationToken);

            var reviews = await _context.ServiceReviews
                .AsNoTracking()
                .Where(review => review.CustomerId == customerId)
                .OrderByDescending(review => review.CreatedAt)
                .Take(5)
                .ToListAsync(cancellationToken);

            var loyaltyPoints = await _context.CustomerProfiles
                .AsNoTracking()
                .Where(profile => profile.Id == customerId)
                .Select(profile => profile.LoyaltyPoints)
                .FirstOrDefaultAsync(cancellationToken);

            var builder = new StringBuilder();
            builder.AppendLine($"Customer: {customerName} (ID {customerId})");
            builder.AppendLine($"Loyalty points: {loyaltyPoints}");
            builder.AppendLine($"Analysis date (UTC): {DateTime.UtcNow:yyyy-MM-dd}");
            builder.AppendLine();

            builder.AppendLine("=== Vehicles (mileage not stored; use age-based estimates in your analysis) ===");
            if (vehicles.Count == 0)
            {
                builder.AppendLine("- No vehicles registered.");
            }
            else
            {
                foreach (var vehicle in vehicles)
                {
                    var vehicleAgeYears = Math.Max(0, DateTime.UtcNow.Year - vehicle.Year);
                    var estimatedKm = vehicleAgeYears * 15000;
                    builder.AppendLine(
                        $"- {vehicle.Year} {vehicle.Make} {vehicle.Model} ({vehicle.VehicleType}), plate {vehicle.LicensePlate}, color {vehicle.Color}, registered {vehicle.CreatedAt:yyyy-MM-dd}, estimated mileage ~{estimatedKm:N0} km (not recorded in system)");
                }
            }

            builder.AppendLine();
            builder.AppendLine("=== Service history (most recent first) ===");
            if (serviceHistory.Count == 0)
            {
                builder.AppendLine("- No service history on file.");
            }
            else
            {
                foreach (var entry in serviceHistory)
                {
                    builder.AppendLine(
                        $"- {entry.ServiceDate:yyyy-MM-dd} [{entry.HistoryType}] {entry.Title}: {entry.Description} (status: {entry.PaymentStatus}, amount: {entry.Amount:N2})");
                }
            }

            builder.AppendLine();
            builder.AppendLine("=== Purchased parts (from sales) ===");
            if (saleItems.Count == 0)
            {
                builder.AppendLine("- No parts purchase history.");
            }
            else
            {
                foreach (var item in saleItems.OrderByDescending(row => row.SaleDate))
                {
                    var partName = partsById.TryGetValue(item.PartId, out var name) ? name : $"Part #{item.PartId}";
                    builder.AppendLine(
                        $"- {item.SaleDate:yyyy-MM-dd}: {partName} x{item.Quantity} @ {item.Price:N2}");
                }
            }

            builder.AppendLine();
            builder.AppendLine("=== Appointments ===");
            if (appointments.Count == 0)
            {
                builder.AppendLine("- No appointments on file.");
            }
            else
            {
                foreach (var appointment in appointments)
                {
                    builder.AppendLine(
                        $"- {appointment.AppointmentDate:yyyy-MM-dd HH:mm} {appointment.ServiceType} ({appointment.Status}): {appointment.Description}");
                }
            }

            builder.AppendLine();
            builder.AppendLine("=== Part requests (possible known issues) ===");
            if (partRequests.Count == 0)
            {
                builder.AppendLine("- None.");
            }
            else
            {
                foreach (var request in partRequests)
                {
                    builder.AppendLine(
                        $"- {request.CreatedAt:yyyy-MM-dd} {request.PartName} for {request.VehicleModel} ({request.Status}): {request.Description}");
                }
            }

            builder.AppendLine();
            builder.AppendLine("=== Service reviews ===");
            if (reviews.Count == 0)
            {
                builder.AppendLine("- None.");
            }
            else
            {
                foreach (var review in reviews)
                {
                    builder.AppendLine($"- {review.CreatedAt:yyyy-MM-dd} rating {review.Rating}/5: {review.Comment}");
                }
            }

            return builder.ToString();
        }

        private async Task<string?> CallOpenRouterAsync(string customerContext, CancellationToken cancellationToken)
        {
            var baseUrl = (_settings.BaseUrl ?? "https://openrouter.ai/api/v1").TrimEnd('/');
            var model = string.IsNullOrWhiteSpace(_settings.Model) ? "openai/gpt-4o-mini" : _settings.Model;

            var systemPrompt = """
                You are an automotive predictive maintenance assistant for GarageGo, a vehicle service garage.
                Analyze the customer data provided and predict likely part failures, maintenance alerts, service recommendations, and part replacement suggestions.
                Base conclusions on vehicle age, service intervals, purchased parts, appointment patterns, and any reported issues.
                Be practical and concise. Use plain language suitable for vehicle owners.
                Respond with ONLY valid JSON (no markdown fences) using this exact shape:
                {
                  "predictedFailures": ["string"],
                  "maintenanceAlerts": ["string"],
                  "recommendations": ["string"],
                  "partReplacementSuggestions": ["string"]
                }
                Each array should have 2-5 short items when data supports it; use fewer items if data is sparse.
                """;

            var userPrompt = $"""
                Analyze this GarageGo customer record and produce maintenance predictions:

                {customerContext}
                """;

            var payload = new
            {
                model,
                messages = new object[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user", content = userPrompt }
                },
                temperature = 0.35,
                max_tokens = 900
            };

            var client = _httpClientFactory.CreateClient("OpenRouter");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey);

            using var request = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/chat/completions")
            {
                Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
            };

            using var response = await client.SendAsync(request, cancellationToken);
            var body = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "OpenRouter API returned {StatusCode}: {Body}",
                    (int)response.StatusCode,
                    Truncate(body, 500));
                throw new InvalidOperationException($"OpenRouter API error {(int)response.StatusCode}");
            }

            using var document = JsonDocument.Parse(body);
            return document.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();
        }

        private static MaintenancePredictionResponseDto? TryParseAiJson(string rawContent)
        {
            var json = ExtractJsonObject(rawContent);
            if (string.IsNullOrWhiteSpace(json))
            {
                return null;
            }

            try
            {
                using var document = JsonDocument.Parse(json);
                var root = document.RootElement;

                return new MaintenancePredictionResponseDto
                {
                    PredictedFailures = ReadStringArray(root, "predictedFailures"),
                    MaintenanceAlerts = ReadStringArray(root, "maintenanceAlerts"),
                    Recommendations = ReadStringArray(root, "recommendations"),
                    PartReplacementSuggestions = ReadStringArray(root, "partReplacementSuggestions")
                };
            }
            catch
            {
                return null;
            }
        }

        private static List<string> ReadStringArray(JsonElement root, string propertyName)
        {
            if (!root.TryGetProperty(propertyName, out var array) || array.ValueKind != JsonValueKind.Array)
            {
                return new List<string>();
            }

            return array.EnumerateArray()
                .Select(element => element.GetString()?.Trim())
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Select(value => value!)
                .ToList();
        }

        private static string ExtractJsonObject(string content)
        {
            var trimmed = content.Trim();
            if (trimmed.StartsWith("```", StringComparison.Ordinal))
            {
                var firstBrace = trimmed.IndexOf('{');
                var lastBrace = trimmed.LastIndexOf('}');
                if (firstBrace >= 0 && lastBrace > firstBrace)
                {
                    return trimmed.Substring(firstBrace, lastBrace - firstBrace + 1);
                }
            }

            var start = trimmed.IndexOf('{');
            var end = trimmed.LastIndexOf('}');
            if (start >= 0 && end > start)
            {
                return trimmed.Substring(start, end - start + 1);
            }

            return trimmed;
        }

        private static MaintenancePredictionResponseDto BuildFallbackResponse(int customerId, string customerName, string message) =>
            new()
            {
                CustomerId = customerId,
                CustomerName = customerName,
                AiAvailable = false,
                Message = message,
                PredictedFailures = new List<string>(),
                MaintenanceAlerts = new List<string>(),
                Recommendations = new List<string>(),
                PartReplacementSuggestions = new List<string>()
            };

        private static string Truncate(string value, int maxLength) =>
            value.Length <= maxLength ? value : value[..maxLength];
    }
}
