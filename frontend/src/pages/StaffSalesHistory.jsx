import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { extractApiError, getSales, getSalesCatalog } from '../services/api';
import './StaffSalesPage.css';

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString();
}

function StaffSalesHistory() {
  const [sales, setSales] = useState([]);
  const [customerNames, setCustomerNames] = useState({});
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadHistory = async () => {
      setIsLoading(true);
      setFeedback({ type: '', message: '' });

      try {
        const [salesResponse, catalogResponse] = await Promise.all([
          getSales(),
          getSalesCatalog(),
        ]);

        if (!mounted) {
          return;
        }

        const customers = catalogResponse.data?.customers ?? [];
        const nameMap = customers.reduce((accumulator, customer) => {
          accumulator[customer.id] = customer.name;
          return accumulator;
        }, {});

        setCustomerNames(nameMap);
        setSales(salesResponse.data ?? []);
      } catch (error) {
        if (mounted) {
          setFeedback({ type: 'error', message: extractApiError(error) });
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      mounted = false;
    };
  }, []);

  const summary = useMemo(() => {
    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.finalAmount ?? sale.totalAmount ?? 0), 0);
    return {
      count: sales.length,
      totalRevenue,
    };
  }, [sales]);

  return (
    <section className="sales-page-shell">
      {feedback.message ? (
        <div className={`sales-banner sales-banner--${feedback.type || 'info'}`}>{feedback.message}</div>
      ) : null}

      <section className="sales-card sales-card--checkout">
        <div className="sales-card__intro sales-card__intro--single">
          <h2>Sales History</h2>
          <p>Review completed sales invoices, loyalty discounts, and line items.</p>
        </div>

        <div className="sales-card__form sales-card__form--single">
          <div className="sales-history-toolbar">
            <Link className="btn btn--secondary" to="/staff/sales">
              Create Invoice
            </Link>
            <p className="sales-field-hint">
              {summary.count} sale{summary.count === 1 ? '' : 's'} • Total revenue {formatCurrency(summary.totalRevenue)}
            </p>
          </div>

          {isLoading ? (
            <div className="sales-banner sales-banner--info">Loading sales history...</div>
          ) : (
            <div className="table-card card" style={{ width: '100%' }}>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Invoice ID</th>
                      <th>Customer ID</th>
                      <th>Customer Name</th>
                      <th>Date</th>
                      <th>Subtotal</th>
                      <th>Discount</th>
                      <th>Final</th>
                      <th>Loyalty</th>
                      <th>Items</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.length === 0 ? (
                      <tr>
                        <td className="empty-state" colSpan="10">
                          No sales recorded yet.
                        </td>
                      </tr>
                    ) : (
                      sales.map((sale) => (
                        <tr key={sale.id}>
                          <td>#{sale.id}</td>
                          <td>{sale.customerId}</td>
                          <td>{customerNames[sale.customerId] || '-'}</td>
                          <td>{formatDate(sale.date)}</td>
                          <td>{formatCurrency(sale.totalAmount)}</td>
                          <td>{formatCurrency(sale.discountAmount)}</td>
                          <td>{formatCurrency(sale.finalAmount)}</td>
                          <td>{sale.loyaltyDiscountApplied ? '10% applied' : '-'}</td>
                          <td>{sale.items?.length ?? 0}</td>
                          <td>
                            <Link className="button button-primary" to={`/staff/invoices/${sale.id}`}>
                              View
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </section>
  );
}

export default StaffSalesHistory;
