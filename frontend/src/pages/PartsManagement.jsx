import React, { useEffect, useMemo, useState } from 'react';
import AdminDataToolbar from '../components/admin/AdminDataToolbar';
import PartsForm from '../components/PartsForm';
import PartsList from '../components/PartsList';
import {
  createPart,
  deletePart,
  getParts,
  getVendors,
  updatePart,
} from '../services/api';
import {
  getStockStatusKey,
  includesText,
  sortItems,
  LOW_STOCK_THRESHOLD,
} from '../utils/adminFilters';

function PartsManagement() {
  const [vendors, setVendors] = useState([]);
  const [parts, setParts] = useState([]);
  const [selectedPart, setSelectedPart] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [sortValue, setSortValue] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [vendorsResponse, partsResponse] = await Promise.all([
        getVendors(),
        getParts(),
      ]);

      setVendors(vendorsResponse.data || []);
      setParts(partsResponse.data || []);
    } catch (error) {
      setMessage(error.message || 'Unable to load parts right now.');
      setMessageType('error');
      setVendors([]);
      setParts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const categories = useMemo(() => {
    const values = parts.map((part) => (part.category || '').trim()).filter(Boolean);
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  }, [parts]);

  const filteredParts = useMemo(() => {
    const query = searchQuery.trim();

    let list = parts.filter((part) => {
      const vendorName = part.vendor?.vendorName || '';
      const partName = part.partName || '';
      const category = part.category || '';
      const stockKey = getStockStatusKey(part.quantity, LOW_STOCK_THRESHOLD);

      if (stockFilter !== 'all' && stockKey !== stockFilter) {
        return false;
      }

      if (categoryFilter !== 'all' && category !== categoryFilter) {
        return false;
      }

      if (vendorFilter !== 'all' && String(part.vendorId) !== vendorFilter) {
        return false;
      }

      const price = Number(part.price) || 0;
      if (priceMin && price < Number(priceMin)) {
        return false;
      }

      if (priceMax && price > Number(priceMax)) {
        return false;
      }

      if (!query) {
        return true;
      }

      if (searchField === 'name') {
        return includesText(partName, query);
      }

      if (searchField === 'category') {
        return includesText(category, query);
      }

      if (searchField === 'vendor') {
        return includesText(vendorName, query);
      }

      return (
        includesText(partName, query) ||
        includesText(category, query) ||
        includesText(vendorName, query)
      );
    });

    if (sortValue === 'qty-asc') {
      list = sortItems(list, 'asc-qty', (part) => Number(part.quantity) || 0);
    } else if (sortValue === 'qty-desc') {
      list = sortItems(list, 'desc-qty', (part) => Number(part.quantity) || 0);
    } else if (sortValue === 'price-asc') {
      list = sortItems(list, 'asc-price', (part) => Number(part.price) || 0);
    } else if (sortValue === 'price-desc') {
      list = sortItems(list, 'desc-price', (part) => Number(part.price) || 0);
    } else if (sortValue === 'newest') {
      list = sortItems(list, 'desc-id', (part) => Number(part.id) || 0);
    }

    return list;
  }, [
    parts,
    searchQuery,
    searchField,
    stockFilter,
    categoryFilter,
    vendorFilter,
    priceMin,
    priceMax,
    sortValue,
  ]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSearchField('all');
    setStockFilter('all');
    setCategoryFilter('all');
    setVendorFilter('all');
    setPriceMin('');
    setPriceMax('');
    setSortValue('');
  };

  const handleCreatePart = async (data) => {
    await createPart(data);
    setMessage('Part added successfully.');
    setMessageType('success');
    setSelectedPart(null);
    await loadData();
  };

  const handleUpdatePart = async (id, data) => {
    await updatePart(id, data);
    setMessage('Part updated successfully.');
    setMessageType('success');
    setSelectedPart(null);
    await loadData();
  };

  const handleDeletePart = async (part) => {
    const confirmed = window.confirm(`Delete part "${part.partName}"?`);

    if (!confirmed) {
      return;
    }

    try {
      await deletePart(part.id);
      setMessage('Part deleted successfully.');
      setMessageType('success');
      if (selectedPart?.id === part.id) {
        setSelectedPart(null);
      }
      await loadData();
    } catch (error) {
      setMessage(error.message || 'Unable to delete part right now.');
      setMessageType('error');
    }
  };

  return (
    <section className="container">
      <div className="page-header-card card">
        <h2 className="section-title card-title">Parts Management</h2>
        <p className="section-copy">
          Track inventory, assign parts to vendors, and monitor stock levels for
          GarageGo operations.
        </p>
      </div>

      {message && (
        <div className={messageType === 'error' ? 'message-banner error' : 'message-banner'}>
          {message}
        </div>
      )}

      <div className="inventory-layout">
        <article className="table-card card inventory-panel">
          <div className="table-card-header">
            <div>
              <h3 className="staff-card-title card-title">
                {selectedPart ? 'Edit Part' : 'Add Part'}
              </h3>
              <p className="section-copy">
                Maintain stock records and link each part to a vendor.
              </p>
            </div>
          </div>

          {vendors.length === 0 && !isLoading && (
            <div className="message-banner error">
              Add at least one vendor before creating parts.
            </div>
          )}

          <PartsForm
            vendors={vendors}
            selectedPart={selectedPart}
            onCancelEdit={() => setSelectedPart(null)}
            onCreate={handleCreatePart}
            onUpdate={handleUpdatePart}
          />
        </article>

        <article className="table-card card inventory-panel">
          <div className="table-card-header">
            <div>
              <h3 className="staff-card-title card-title">Parts Inventory</h3>
              <p className="section-copy">
                Review stock levels and update part records from the GarageGo
                operations workspace.
              </p>
            </div>
          </div>

          <AdminDataToolbar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search parts..."
            searchField={searchField}
            onSearchFieldChange={setSearchField}
            searchFields={[
              { value: 'all', label: 'All fields' },
              { value: 'name', label: 'Part name' },
              { value: 'category', label: 'Category' },
              { value: 'vendor', label: 'Vendor name' },
            ]}
            selects={[
              {
                id: 'stock',
                label: 'Stock',
                value: stockFilter,
                onChange: setStockFilter,
                options: [
                  { value: 'all', label: 'All stock levels' },
                  { value: 'low', label: 'Low stock' },
                  { value: 'out', label: 'Out of stock' },
                  { value: 'in', label: 'In stock' },
                ],
              },
              {
                id: 'category',
                label: 'Category',
                value: categoryFilter,
                onChange: setCategoryFilter,
                options: [
                  { value: 'all', label: 'All categories' },
                  ...categories.map((category) => ({ value: category, label: category })),
                ],
              },
              {
                id: 'vendor',
                label: 'Vendor',
                value: vendorFilter,
                onChange: setVendorFilter,
                options: [
                  { value: 'all', label: 'All vendors' },
                  ...vendors.map((vendor) => ({
                    value: String(vendor.id),
                    label: vendor.vendorName,
                  })),
                ],
              },
            ]}
            sortValue={sortValue}
            onSortChange={setSortValue}
            sortOptions={[
              { value: '', label: 'Default order' },
              { value: 'qty-asc', label: 'Quantity (low to high)' },
              { value: 'qty-desc', label: 'Quantity (high to low)' },
              { value: 'price-asc', label: 'Price (low to high)' },
              { value: 'price-desc', label: 'Price (high to low)' },
              { value: 'newest', label: 'Newest first' },
            ]}
            showPriceRange
            priceMin={priceMin}
            priceMax={priceMax}
            onPriceMinChange={setPriceMin}
            onPriceMaxChange={setPriceMax}
            onClear={handleClearFilters}
            resultText={`Showing ${filteredParts.length} of ${parts.length} parts`}
          />

          {isLoading ? (
            <p className="status-text">Loading parts...</p>
          ) : (
            <PartsList
              parts={filteredParts}
              onEdit={setSelectedPart}
              onDelete={handleDeletePart}
            />
          )}
        </article>
      </div>
    </section>
  );
}

export default PartsManagement;
