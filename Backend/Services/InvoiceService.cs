using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

public class InvoiceService
{
    public byte[] GenerateInvoicePdf(dynamic invoice)
    {
        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Margin(40);

                page.Content().Column(col =>
                {
                    // 🔥 TITLE
                    col.Item().AlignCenter().Text("Invoice")
                        .FontSize(28).Bold().FontColor(Colors.Blue.Darken3);

                    col.Item().AlignCenter().Text("GarageGo Sales Receipt")
                        .FontSize(14).FontColor(Colors.Grey.Darken1);

                    col.Item().PaddingVertical(20);

                    // 🔥 CUSTOMER + DATE
                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Text($"Customer ID: {invoice.saleId}");
                        row.ConstantItem(200).AlignRight()
                            .Text($"Date: {((DateTime)invoice.date).ToString("M/d/yyyy")}");
                    });

                    col.Item().LineHorizontal(1).LineColor(Colors.Grey.Lighten2);

                    col.Item().PaddingVertical(15);

                    // 🔥 ITEMS HEADER
                    col.Item().AlignCenter().Text("Items Purchased")
                        .FontSize(16).Bold();

                    col.Item().PaddingVertical(10);

                    // 🔥 ITEMS LIST
                    foreach (var item in invoice.items)
                    {
                        col.Item().Row(row =>
                        {
                            row.RelativeItem().Text($"Part {item.PartId}");

                            row.RelativeItem().AlignCenter()
                                .Text($"{item.Quantity} x Rs{item.Price:0.00}");

                            row.RelativeItem().AlignRight()
                                .Text($"Rs{(item.Quantity * item.Price):0.00}");
                        });

                        col.Item().LineHorizontal(1).LineColor(Colors.Grey.Lighten3);
                    }

                    col.Item().PaddingVertical(20);

                    // 🔥 LOYALTY POINTS LOGIC
                    int loyaltyPoints = (int)(invoice.finalAmount / 100);

                    // 🔥 SUBTOTAL
                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Text("Subtotal:")
                            .FontSize(14).Bold();

                        row.RelativeItem().AlignRight()
                            .Text($"Rs. {invoice.total:0.00}")
                            .FontSize(14);
                    });

                    col.Item().PaddingVertical(5);

                    // 🔥 DISCOUNT
                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Text("Loyalty Discount (10%):")
                            .FontSize(14).Bold();

                        row.RelativeItem().AlignRight()
                            .Text($"-Rs. {invoice.discount:0.00}")
                            .FontSize(14);
                    });

                    col.Item().PaddingVertical(5);

                    col.Item().LineHorizontal(2).LineColor(Colors.Blue.Darken3);

                    col.Item().PaddingVertical(10);

                    // 🔥 LOYALTY POINTS
                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Text("Loyalty Points Earned:")
                            .FontSize(14).Bold();

                        row.RelativeItem().AlignRight()
                            .Text($"{loyaltyPoints}")
                            .FontSize(18).Bold();
                    });

                    col.Item().PaddingVertical(10);

                    col.Item().LineHorizontal(2).LineColor(Colors.Blue.Darken3);

                    col.Item().PaddingVertical(15);

                    // 🔥 FINAL TOTAL
                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Text("Total:")
                            .FontSize(18).Bold();

                        row.RelativeItem().AlignRight()
                            .Text($"Rs. {invoice.finalAmount:0.00}")
                            .FontSize(18).Bold();
                    });

                    col.Item().LineHorizontal(2).LineColor(Colors.Black);
                });
            });
        }).GeneratePdf();
    }
}