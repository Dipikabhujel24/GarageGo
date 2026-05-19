import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminDataToolbar from '../components/admin/AdminDataToolbar';
import { extractApiError, getSales, getSalesCatalog } from '../services/api';
import {
  includesText,
  isThisMonth,
  isThisWeek,
  isToday,
  isWithinDateRange,
  sortItems,
} from '../utils/adminFilters';
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

  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [amountFilter, setAmountFilter] = useState('all');
  const [sortValue, setSortValue] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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

  const filteredSales = useMemo(() => {
    const query = searchQuery.trim();

    let list = sales.filter((sale) => {
      const customerName = customerNames[sale.customerId] || '';
      const invoiceId = String(sale.id ?? '');
      const saleDate = sale.date;

      if (dateFilter === 'today' && !isToday(saleDate)) {
        return false;
      }

      if (dateFilter === 'week' && !isThisWeek(saleDate)) {
        return false;
      }

      if (dateFilter === 'month' && !isThisMonth(saleDate)) {
        return false;
      }

      if (dateFilter === 'custom' && !isWithinDateRange(saleDate, dateFrom, dateTo)) {
        return false;
      }

      if (query) {
        if (searchField === 'invoice') {
          if (!includesText(invoiceId, query)) {
            return false;
          }
        } else if (searchField === 'customer') {
          if (!includesText(customerName, query)) {
            return false;
          }
        } else if (searchField === 'staff') {
          if (!includesText(sale.staffName || sale.createdBy || '', query)) {
            return false;
          }
        } else if (
          !includesText(invoiceId, query) &&
          !includesText(customerName, query) &&
          !includesText(sale.staffName || sale.createdBy || '', query)
        ) {
          return false;
        }
      }

      return true;
    });

    if (amountFilter === 'highest') {
      list = sortItems(list, 'desc-amount', (sale) => Number(sale.finalAmount ?? sale.totalAmount ?? 0));
    } else if (amountFilter === 'lowest') {
      list = sortItems(list, 'asc-amount', (sale) => Number(sale.finalAmount ?? sale.totalAmount ?? 0));
    }

    if (sortValue === 'revenue-desc') {
      list = sortItems(list, 'desc-revenue', (sale) => Number(sale.finalAmount ?? sale.totalAmount ?? 0));
    } else if (sortValue === 'revenue-asc') {
      list = sortItems(list, 'asc-revenue', (sale) => Number(sale.finalAmount ?? sale.totalAmount ?? 0));
    } else if (sortValue === 'date-desc') {
      list = sortItems(list, 'desc-date', (sale) => new Date(sale.date || 0).getTime());
    } else if (sortValue === 'date-asc') {
      list = sortItems(list, 'asc-date', (sale) => new Date(sale.date || 0).getTime());
    }

    return list;
  }, [
    sales,
    customerNames,
    searchQuery,
    searchField,
    dateFilter,
    amountFilter,
    sortValue,
    dateFrom,
    dateTo,
  ]);

  const summary = useMemo(() => {
    const totalRevenue = filteredSales.reduce(
      (sum, sale) => sum + Number(sale.finalAmount ?? sale.totalAmount ?? 0),
      0
    );
    return {
      count: filteredSales.length,
      totalRevenue,
    };
  }, [filteredSales]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSearchField('all');
    setDateFilter('all');
    setAmountFilter('all');
    setSortValue('');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <section className="sales-page-shell sales-page-shell--workspace">
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
            <Link className="btn btn--primary" to="/staff/sales">
              + Create Invoice
            </Link>
            <p className="sales-field-hint">
              Browse past checkouts and open invoice details.
            </p>
          </div>

          <AdminDataToolbar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search sales..."
            searchField={searchField}
            onSearchFieldChange={setSearchField}
            searchFields={[
              { value: 'all', label: 'All fields' },
              { value: 'invoice', label: 'Invoice ID' },
              { value: 'customer', label: 'Customer name' },
              { value: 'staff', label: 'Staff name' },
            ]}
            selects={[
              {
                id: 'date',
                label: 'Date',
                value: dateFilter,
                onChange: setDateFilter,
                options: [
                  { value: 'all', label: 'All dates' },
                  { value: 'today', label: 'Today' },
                  { value: 'week', label: 'This week' },
                  { value: 'month', label: 'This month' },
                  { value: 'custom', label: 'Custom range' },
                ],
              },
              {
                id: 'amount',
                label: 'Sales',
                value: amountFilter,
                onChange: setAmountFilter,
                options: [
                  { value: 'all', label: 'All amounts' },
                  { value: 'highest', label: 'Highest sales' },
                  { value: 'lowest', label: 'Lowest sales' },
                ],
              },
            ]}
            sortValue={sortValue}
            onSortChange={setSortValue}
            sortOptions={[
              { value: '', label: 'Default order' },
              { value: 'revenue-desc', label: 'Revenue (high to low)' },
              { value: 'revenue-asc', label: 'Revenue (low to high)' },
              { value: 'date-desc', label: 'Newest first' },
              { value: 'date-asc', label: 'Oldest first' },
            ]}
            showDateRange={dateFilter === 'custom'}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onClear={handleClearFilters}
            resultText={`Showing ${filteredSales.length} of ${sales.length} sales`}
          />

          <p className="admin-export-table-hint">
            Table is export-ready: filter results, then copy or print from your browser.
          </p>

          <div className="sales-history-stats">
            <div className="sales-stat-pill">
              <span className="sales-stat-pill__label">Filtered sales</span>
              <span className="sales-stat-pill__value">{summary.count}</span>
            </div>
            <div className="sales-stat-pill">
              <span className="sales-stat-pill__label">Filtered revenue</span>
              <span className="sales-stat-pill__value">{formatCurrency(summary.totalRevenue)}</span>
            </div>
          </div>

          {isLoading ? (
            <div className="sales-banner sales-banner--info">Loading sales history...</div>
          ) : (
            <div className="sales-history-table-wrap">
              <div className="table-container">
                <table className="table sales-export-table">
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
                    {filteredSales.length === 0 ? (
                      <tr>
                        <td className="empty-state" colSpan="10">
                          No sales match your search or filters.
                        </td>
                      </tr>
                    ) : (
                      filteredSales.map((sale) => (
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
