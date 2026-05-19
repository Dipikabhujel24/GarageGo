import React, { useEffect, useState } from "react";
import { getSales, extractApiError } from "../services/api";
import "./SalesPage.css";

function SalesHistory() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [queryCustomer, setQueryCustomer] = useState("");
  const [expandedSale, setExpandedSale] = useState(null);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const resp = await getSales();
      setSales(resp?.data ?? []);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (v) => `Rs. ${Number(v || 0).toFixed(2)}`;

  const filtered = sales.filter((s) => {
    if (!queryCustomer) return true;
    return String(s.customerId || "").includes(queryCustomer);
  });

  return (
    <div className="sales-history-container">
      <div className="sales-header">
        <div className="sales-header-content">
          <span className="sales-badge">SALES HISTORY</span>
          <h1>Staff Sales History</h1>
          <p>View previously recorded sales and loyalty usage.</p>
        </div>
      </div>

      <div className="sales-content" style={{padding: 20}}>
        <div style={{display: 'flex', gap: 12, marginBottom: 12}}>
          <input
            placeholder="Filter by Customer ID"
            value={queryCustomer}
            onChange={(e) => setQueryCustomer(e.target.value)}
            className="form-input"
            style={{width: 200}}
          />
          <button onClick={fetchSales} className="btn-secondary">Refresh</button>
        </div>

        {loading && <p>Loading sales…</p>}
        {error && <p style={{color: 'red'}}>Error: {error}</p>}

        {!loading && filtered.length === 0 && <p>No sales found.</p>}

        {!loading && filtered.length > 0 && (
          <div className="sales-history-table">
            <table style={{width: '100%', borderCollapse: 'collapse'}}>
              <thead>
                <tr style={{textAlign: 'left', borderBottom: '1px solid #ddd'}}>
                  <th>Sale ID</th>
                  <th>Date</th>
                  <th>Customer ID</th>
                  <th>Total</th>
                  <th>Discount</th>
                  <th>Final Amount</th>
                  <th>Loyalty Applied</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{sale.id}</td>
                    <td>{sale.date}</td>
                    <td>{sale.customerId}</td>
                    <td>Rs. {sale.totalAmount}</td>
                    <td>Rs. {sale.discountAmount}</td>
                    <td>Rs. {sale.finalAmount}</td>
                    <td>
                      {sale.loyaltyDiscountApplied ? "Yes" : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default SalesHistory;
