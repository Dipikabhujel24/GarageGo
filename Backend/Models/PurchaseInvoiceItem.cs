namespace Backend.Models
{
    public class PurchaseInvoiceItem
    {
        public int Id { get; set; }

        public int PurchaseInvoiceId { get; set; }

        public int PartId { get; set; }

        public int Quantity { get; set; }

        public decimal UnitPrice { get; set; }

        public decimal SubTotal { get; set; }

        public PurchaseInvoice? PurchaseInvoice { get; set; }

        public Part? Part { get; set; }
    }
}
