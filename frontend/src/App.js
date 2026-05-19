import { useState } from "react";
import SalesPage from "./pages/SalesPage";
import InvoicePage from "./pages/InvoicePage";
import SalesHistory from "./pages/SalesHistory";

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

  return (
    <div>
      <header style={{padding: 12, borderBottom: '1px solid #eee', display: 'flex', gap: 12}}>
        <button onClick={() => setView('sales')} className="btn-secondary">Sales</button>
        <button onClick={() => setView('history')} className="btn-secondary">Sales History</button>
      </header>

      <main>
        {view === 'sales' && <SalesPage onInvoiceCreated={handleShowInvoice} />}
        {view === 'history' && <SalesHistory />}
      </main>
    </div>
  );
}

export default App;