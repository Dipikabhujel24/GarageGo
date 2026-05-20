using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Backend.Services;

public class InvoicePdfItem
{
    public int PartId { get; set; }
    public string PartName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal Price { get; set; }
}

public class InvoicePdfModel
{
    public int SaleId { get; set; }
    public int CustomerId { get; set; }
    public DateTime Date { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal FinalAmount { get; set; }
    public bool LoyaltyDiscountApplied { get; set; }
    public List<InvoicePdfItem> Items { get; set; } = new();
}

public class InvoiceService
{
    public byte[] GenerateInvoicePdf(InvoicePdfModel invoice)
    {
        var loyaltyPoints = (int)(invoice.FinalAmount / 100m);

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Margin(40);

                page.Content().Column(col =>
                {
                    col.Item().AlignCenter().Text("Invoice")
                        .FontSize(28).Bold().FontColor(Colors.Blue.Darken3);

                    col.Item().AlignCenter().Text("GarageGo Sales Receipt")
                        .FontSize(14).FontColor(Colors.Grey.Darken1);

                    col.Item().PaddingVertical(20);

                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Text($"Customer ID: {invoice.CustomerId}");
                        row.ConstantItem(200).AlignRight()
                            .Text($"Date: {invoice.Date:yyyy-MM-dd}");
                    });

                    col.Item().Text($"Invoice ID: {invoice.SaleId}");
                    col.Item().LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
                    col.Item().PaddingVertical(15);

                    col.Item().AlignCenter().Text("Items Purchased")
                        .FontSize(16).Bold();

                    col.Item().PaddingVertical(10);

                    foreach (var item in invoice.Items)
                    {
                        col.Item().Row(row =>
                        {
                            row.RelativeItem().Text($"Part {item.PartId} — {item.PartName}");
                            row.RelativeItem().AlignCenter()
                                .Text($"{item.Quantity} x Rs{item.Price:0.00}");
                            row.RelativeItem().AlignRight()
                                .Text($"Rs{(item.Quantity * item.Price):0.00}");
                        });

                        col.Item().LineHorizontal(1).LineColor(Colors.Grey.Lighten3);
                    }

                    col.Item().PaddingVertical(20);

                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Text("Subtotal:").FontSize(14).Bold();
                        row.RelativeItem().AlignRight().Text($"Rs. {invoice.TotalAmount:0.00}").FontSize(14);
                    });

                    col.Item().PaddingVertical(5);

                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Text("Loyalty Discount (10%):").FontSize(14).Bold();
                        row.RelativeItem().AlignRight().Text($"-Rs. {invoice.DiscountAmount:0.00}").FontSize(14);
                    });

                    col.Item().PaddingVertical(5);
                    col.Item().LineHorizontal(2).LineColor(Colors.Blue.Darken3);

                    col.Item().PaddingVertical(10);

                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Text("Loyalty Points Earned:").FontSize(14).Bold();
                        row.RelativeItem().AlignRight().Text($"{loyaltyPoints}").FontSize(18).Bold();
                    });

                    col.Item().PaddingVertical(10);
                    col.Item().LineHorizontal(2).LineColor(Colors.Blue.Darken3);
                    col.Item().PaddingVertical(15);

                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Text("Total:").FontSize(18).Bold();
                        row.RelativeItem().AlignRight().Text($"Rs. {invoice.FinalAmount:0.00}").FontSize(18).Bold();
                    });

                    col.Item().LineHorizontal(2).LineColor(Colors.Black);
                });
            });
        }).GeneratePdf();
    }
}
