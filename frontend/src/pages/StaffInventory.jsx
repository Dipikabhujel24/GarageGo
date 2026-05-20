import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getParts, getVendors } from '../services/api';
import { searchInputAutofillProps } from '../utils/formAutofill';
import './StaffInventory.css';

const LOW_STOCK_THRESHOLD = 10;

function getViewFromPath(pathname) {
  if (pathname.includes('/staff/inventory/parts')) {
    return 'parts';
  }

  if (pathname.includes('/staff/inventory/low-stock')) {
    return 'low-stock';
  }

  return 'overview';
}

function getStockStatus(quantity) {
  const qty = Number(quantity) || 0;

  if (qty <= 0) {
    return { key: 'out', label: 'Out of stock', className: 'staff-inventory-status staff-inventory-status--out' };
  }

  if (qty < LOW_STOCK_THRESHOLD) {
    return { key: 'low', label: 'Low stock', className: 'staff-inventory-status staff-inventory-status--low' };
  }

  return { key: 'available', label: 'Available', className: 'staff-inventory-status staff-inventory-status--ok' };
}

function getAvailabilityLabel(quantity) {
  const qty = Number(quantity) || 0;

  if (qty <= 0) {
    return 'Unavailable';
  }

  if (qty < LOW_STOCK_THRESHOLD) {
    return 'Limited';
  }

  return 'In stock';
}

function StaffInventory() {
  const location = useLocation();
  const view = getViewFromPath(location.pathname);

  const [vendors, setVendors] = useState([]);
  const [parts, setParts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [searchName, setSearchName] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [searchVendor, setSearchVendor] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    let isMounted = true;

    const loadInventory = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const [vendorsResponse, partsResponse] = await Promise.all([
          getVendors(),
          getParts(),
        ]);

        if (!isMounted) {
          return;
        }

        setVendors(vendorsResponse.data || []);
        setParts(partsResponse.data || []);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || 'Unable to load inventory data right now.');
          setVendors([]);
          setParts([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadInventory();
  }, []);

  const categories = useMemo(() => {
    const values = parts
      .map((part) => (part.category || '').trim())
      .filter(Boolean);

    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  }, [parts]);

  const filteredParts = useMemo(() => {
    const nameQuery = searchName.trim().toLowerCase();
    const categoryQuery = searchCategory.trim().toLowerCase();
    const vendorQuery = searchVendor.trim().toLowerCase();

    return parts.filter((part) => {
      const quantity = Number(part.quantity) || 0;
      const status = getStockStatus(quantity).key;
      const vendorName = (part.vendor?.vendorName || '').toLowerCase();
      const partName = (part.partName || '').toLowerCase();
      const category = (part.category || '').toLowerCase();

      if (nameQuery && !partName.includes(nameQuery)) {
        return false;
      }

      if (categoryQuery && !category.includes(categoryQuery)) {
        return false;
      }

      if (vendorQuery && !vendorName.includes(vendorQuery)) {
        return false;
      }

      if (categoryFilter !== 'all' && part.category !== categoryFilter) {
        return false;
      }

      if (stockFilter === 'low' && status !== 'low') {
        return false;
      }

      if (stockFilter === 'available' && status !== 'available') {
        return false;
      }

      if (stockFilter === 'out' && status !== 'out') {
        return false;
      }

      return true;
    });
  }, [parts, searchName, searchCategory, searchVendor, stockFilter, categoryFilter]);

  const lowStockParts = useMemo(
    () => parts.filter((part) => {
      const quantity = Number(part.quantity) || 0;
      return quantity > 0 && quantity < LOW_STOCK_THRESHOLD;
    }),
    [parts]
  );

  const outOfStockCount = useMemo(
    () => parts.filter((part) => Number(part.quantity) <= 0).length,
    [parts]
  );

  const availableCount = useMemo(
    () => parts.filter((part) => Number(part.quantity) >= LOW_STOCK_THRESHOLD).length,
    [parts]
  );

  const summaryCards = useMemo(
    () => [
      { label: 'Total Parts', value: parts.length.toLocaleString() },
      { label: 'Available Stock', value: availableCount.toLocaleString() },
      { label: 'Low Stock Alerts', value: lowStockParts.length.toLocaleString() },
      { label: 'Out of Stock', value: outOfStockCount.toLocaleString() },
    ],
    [availableCount, lowStockParts.length, outOfStockCount, parts.length]
  );

  const pageMeta = {
    overview: {
      title: 'Inventory Overview',
      copy: 'Operational read-only view of stock levels, suppliers, and alerts for daily garage work.',
    },
    parts: {
      title: 'View Parts',
      copy: 'Search and filter parts to check availability before sales and invoices.',
    },
    'low-stock': {
      title: 'Low Stock Alerts',
      copy: 'Informational watchlist for parts below the low-stock threshold. No inventory changes can be made here.',
    },
  }[view];

  const resetFilters = () => {
    setSearchName('');
    setSearchCategory('');
    setSearchVendor('');
    setStockFilter('all');
    setCategoryFilter('all');
  };

  const renderFilters = () => (
    <div className="staff-inventory-filters card">
      <div className="staff-inventory-filters__grid">
        <label className="staff-inventory-field">
          <span>Search part name</span>
          <input
            type="search"
            value={searchName}
            onChange={(event) => setSearchName(event.target.value)}
            placeholder="e.g. brake pad"
            {...searchInputAutofillProps}
          />
        </label>
        <label className="staff-inventory-field">
          <span>Search category</span>
          <input
            type="search"
            value={searchCategory}
            onChange={(event) => setSearchCategory(event.target.value)}
            placeholder="e.g. Engine"
            {...searchInputAutofillProps}
          />
        </label>
        <label className="staff-inventory-field">
          <span>Search vendor</span>
          <input
            type="search"
            value={searchVendor}
            onChange={(event) => setSearchVendor(event.target.value)}
            placeholder="Supplier name"
            {...searchInputAutofillProps}
          />
        </label>
        <label className="staff-inventory-field">
          <span>Stock filter</span>
          <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}>
            <option value="all">All stock levels</option>
            <option value="low">Low stock</option>
            <option value="available">Available stock</option>
            <option value="out">Out of stock</option>
          </select>
        </label>
        <label className="staff-inventory-field">
          <span>Category</span>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <div className="staff-inventory-field staff-inventory-field--actions">
          <button type="button" className="button button-secondary" onClick={resetFilters}>
            Clear filters
          </button>
        </div>
      </div>
      <p className="staff-inventory-filters__hint">
        Showing {filteredParts.length} of {parts.length} parts
        {stockFilter !== 'all' || categoryFilter !== 'all' || searchName || searchCategory || searchVendor
          ? ' (filtered)'
          : ''}
      </p>
    </div>
  );

  const renderPartsTable = (rows) => {
    if (rows.length === 0) {
      return (
        <p className="inventory-empty-state">
          No parts match your search and filters.
        </p>
      );
    }

    return (
      <div className="table-container staff-inventory-table-wrap">
        <table className="table staff-inventory-table">
          <thead>
            <tr>
              <th>Part Name</th>
              <th>Category</th>
              <th>Vendor</th>
              <th>Quantity</th>
              <th>Stock Status</th>
              <th>Price</th>
              <th>Availability</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((part) => {
              const status = getStockStatus(part.quantity);

              return (
                <tr key={part.id}>
                  <td><strong>{part.partName}</strong></td>
                  <td>{part.category || '—'}</td>
                  <td>{part.vendor?.vendorName || '—'}</td>
                  <td>
                    <span className={`inventory-stock-badge${status.key === 'low' ? ' low' : ''}${status.key === 'out' ? ' staff-inventory-qty-out' : ''}`}>
                      {part.quantity}
                    </span>
                  </td>
                  <td><span className={status.className}>{status.label}</span></td>
                  <td>Rs {Number(part.price || 0).toFixed(2)}</td>
                  <td>{getAvailabilityLabel(part.quantity)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <section className="container staff-inventory-page">
      <div className="page-header-card card staff-inventory-hero">
        <div>
          <p className="staff-inventory-hero__eyebrow">Staff · Operational inventory</p>
          <h2 className="section-title card-title">{pageMeta.title}</h2>
          <p className="section-copy">{pageMeta.copy}</p>
        </div>
        <nav className="staff-inventory-tabs" aria-label="Staff inventory views">
          <Link
            className={`staff-inventory-tab${view === 'overview' ? ' is-active' : ''}`}
            to="/staff/inventory"
          >
            Overview
          </Link>
          <Link
            className={`staff-inventory-tab${view === 'parts' ? ' is-active' : ''}`}
            to="/staff/inventory/parts"
          >
            View Parts
          </Link>
          <Link
            className={`staff-inventory-tab${view === 'low-stock' ? ' is-active' : ''}`}
            to="/staff/inventory/low-stock"
          >
            Low Stock Alerts
          </Link>
        </nav>
      </div>

      {errorMessage ? <div className="message-banner error">{errorMessage}</div> : null}

      {isLoading ? (
        <p className="status-text">Loading inventory data...</p>
      ) : (
        <>
          {view === 'overview' && (
            <>
              <div className="stats-grid staff-inventory-stats">
                {summaryCards.map((card) => (
                  <article key={card.label} className="stat-card card staff-inventory-stat">
                    <p className="stat-label">{card.label}</p>
                    <p className="stat-value">{card.value}</p>
                  </article>
                ))}
              </div>

              <div className="inventory-layout staff-inventory-panels">
                <article className="table-card card inventory-panel">
                  <div className="table-card-header">
                    <div>
                      <h3 className="staff-card-title card-title">Low Stock Watchlist</h3>
                      <p className="section-copy">
                        Parts below {LOW_STOCK_THRESHOLD} units — informational only.
                      </p>
                    </div>
                    <Link className="button button-secondary inventory-link-button" to="/staff/inventory/low-stock">
                      View all alerts
                    </Link>
                  </div>

                  {lowStockParts.length === 0 ? (
                    <p className="inventory-empty-state">No low stock items right now.</p>
                  ) : (
                    <ul className="inventory-list">
                      {lowStockParts.slice(0, 5).map((part) => (
                        <li key={part.id} className="inventory-list-item">
                          <div>
                            <strong>{part.partName}</strong>
                            <p>
                              {part.category || 'Uncategorized'} · {part.vendor?.vendorName || 'Unknown vendor'}
                            </p>
                          </div>
                          <span className="inventory-stock-badge low">{part.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>

                <article className="table-card card inventory-panel">
                  <div className="table-card-header">
                    <div>
                      <h3 className="staff-card-title card-title">Supplier Snapshot</h3>
                      <p className="section-copy">
                        Read-only vendor names linked to inventory (no vendor management).
                      </p>
                    </div>
                  </div>

                  <ul className="inventory-list">
                    {vendors.length === 0 ? (
                      <li className="inventory-empty-state">No vendors on record.</li>
                    ) : (
                      vendors.slice(0, 6).map((vendor) => (
                        <li key={vendor.id} className="inventory-list-item">
                          <div>
                            <strong>{vendor.vendorName}</strong>
                            <p>{vendor.companyName || vendor.email || '—'}</p>
                          </div>
                          <span className="inventory-stock-badge">
                            {Array.isArray(vendor.parts) ? vendor.parts.length : 0} parts
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                </article>
              </div>

              <article className="table-card card staff-inventory-preview">
                <div className="table-card-header">
                  <div>
                    <h3 className="staff-card-title card-title">Parts Preview</h3>
                    <p className="section-copy">Quick read-only glance at current stock.</p>
                  </div>
                  <Link className="button button-primary inventory-link-button" to="/staff/inventory/parts">
                    Open full parts list
                  </Link>
                </div>
                {renderPartsTable(parts.slice(0, 8))}
              </article>
            </>
          )}

          {view === 'parts' && (
            <article className="table-card card staff-inventory-table-card">
              <div className="table-card-header">
                <div>
                  <h3 className="staff-card-title card-title">Parts inventory</h3>
                  <p className="section-copy">Read-only table for operational checks during sales and service.</p>
                </div>
              </div>
              {renderFilters()}
              {renderPartsTable(filteredParts)}
            </article>
          )}

          {view === 'low-stock' && (
            <article className="table-card card staff-inventory-table-card">
              <div className="table-card-header">
                <div>
                  <h3 className="staff-card-title card-title">Low stock alerts</h3>
                  <p className="section-copy">
                    Monitor items that need attention. Staff cannot modify stock from this screen.
                  </p>
                </div>
              </div>
              {renderFilters()}
              {lowStockParts.length === 0 ? (
                <p className="inventory-empty-state">No low stock alerts at the moment.</p>
              ) : (
                <ul className="inventory-list staff-inventory-alert-list">
                  {lowStockParts
                    .filter((part) => filteredParts.some((filtered) => filtered.id === part.id))
                    .map((part) => (
                      <li key={part.id} className="inventory-list-item staff-inventory-alert-item">
                        <div>
                          <strong>{part.partName}</strong>
                          <p>
                            {part.category || 'Uncategorized'} · {part.vendor?.vendorName || 'Unknown vendor'}
                          </p>
                        </div>
                        <span className="staff-inventory-status staff-inventory-status--low">
                          {part.quantity} left
                        </span>
                      </li>
                    ))}
                </ul>
              )}
              <div className="staff-inventory-low-stock-table">
                <h4 className="staff-inventory-subheading">Detailed list</h4>
                {renderPartsTable(
                  filteredParts.filter((part) => {
                    const quantity = Number(part.quantity) || 0;
                    return quantity > 0 && quantity < LOW_STOCK_THRESHOLD;
                  })
                )}
              </div>
            </article>
          )}
        </>
      )}
    </section>
  );
}

export default StaffInventory;
