import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getParts, getVendors } from '../services/api';

function InventoryOverview() {
  const [vendors, setVendors] = useState([]);
  const [parts, setParts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

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
          setErrorMessage(
            error.message || 'Unable to load the inventory overview right now.'
          );
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

    return () => {
      isMounted = false;
    };
  }, []);

  const lowStockParts = useMemo(
    () => parts.filter((part) => Number(part.quantity) < 10).slice(0, 5),
    [parts]
  );

  const summaryCards = useMemo(
    () => [
      { label: 'Total Parts', value: parts.length.toLocaleString() },
      { label: 'Total Vendors', value: vendors.length.toLocaleString() },
      { label: 'Low Stock Items', value: lowStockParts.length.toLocaleString() },
    ],
    [lowStockParts.length, parts.length, vendors.length]
  );

  return (
    <section className="container">
      <div className="page-header-card card">
        <h2 className="section-title card-title">Inventory Overview</h2>
        <p className="section-copy">
          Review supplier coverage, watch low stock items, and jump into the vendor
          and parts workflows from one place.
        </p>
      </div>

      {errorMessage && <div className="message-banner error">{errorMessage}</div>}

      {isLoading ? (
        <p className="status-text">Loading inventory data...</p>
      ) : (
        <>
          <div className="stats-grid">
            {summaryCards.map((summaryCard) => (
              <article key={summaryCard.label} className="stat-card card">
                <p className="stat-label">{summaryCard.label}</p>
                <p className="stat-value">{summaryCard.value}</p>
              </article>
            ))}
          </div>

          <div className="inventory-layout">
            <article className="table-card card inventory-panel">
              <div className="table-card-header">
                <div>
                  <h3 className="staff-card-title card-title">Low Stock Watchlist</h3>
                  <p className="section-copy">
                    Parts with quantity below 10 are highlighted here for quick follow-up.
                  </p>
                </div>
                <Link
                  className="button button-primary inventory-link-button"
                  to="/admin/parts"
                >
                  Manage Parts
                </Link>
              </div>

              {lowStockParts.length === 0 ? (
                <p className="inventory-empty-state">
                  No low stock items right now.
                </p>
              ) : (
                <ul className="inventory-list">
                  {lowStockParts.map((part) => (
                    <li key={part.id} className="inventory-list-item">
                      <div>
                        <strong>{part.partName}</strong>
                        <p>
                          {part.category} with {part.vendor?.vendorName || 'Unknown vendor'}
                        </p>
                      </div>
                      <span className="inventory-stock-badge low">
                        {part.quantity}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className="table-card card inventory-panel">
              <div className="table-card-header">
                <div>
                  <h3 className="staff-card-title card-title">Inventory Actions</h3>
                  <p className="section-copy">
                    Open the detailed vendor and parts screens without leaving the
                    GarageGo workspace.
                  </p>
                </div>
              </div>

              <div className="inventory-action-row">
                <Link
                  className="button button-primary inventory-link-button"
                  to="/admin/vendors"
                >
                  Open Vendors
                </Link>
                <Link
                  className="button button-secondary inventory-link-button"
                  to="/admin/parts"
                >
                  Open Parts
                </Link>
                <Link
                  className="button button-secondary inventory-link-button"
                  to="/admin/reports"
                >
                  Open Reports
                </Link>
              </div>

              <ul className="inventory-list">
                {vendors.slice(0, 4).map((vendor) => (
                  <li key={vendor.id} className="inventory-list-item">
                    <div>
                      <strong>{vendor.vendorName}</strong>
                      <p>{vendor.companyName}</p>
                    </div>
                    <span className="inventory-stock-badge">
                      {Array.isArray(vendor.parts) ? vendor.parts.length : 0}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </>
      )}
    </section>
  );
}

export default InventoryOverview;
