import { useState } from "react";
import SalesPage from "./pages/SalesPage";
import InvoicePage from "./pages/InvoicePage";

function App() {
  const [view, setView] = useState("sales");
  const [invoiceData, setInvoiceData] = useState(null);

  const handleShowInvoice = (saleData) => {
    setInvoiceData(saleData);
    setView("invoice");
  };

  const handleStartNewSale = () => {
    setInvoiceData(null);
    setView("sales");
  };

  if (view === "invoice") {
    return <InvoicePage sale={invoiceData} onNewSale={handleStartNewSale} />;
  }

  return <SalesPage onInvoiceCreated={handleShowInvoice} />;
}

export default App;