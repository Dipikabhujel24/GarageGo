import React, { useEffect, useMemo, useState } from 'react';
import AdminDataToolbar from '../components/admin/AdminDataToolbar';
import VendorForm from '../components/VendorForm';
import VendorList from '../components/VendorList';
import {
  createVendor,
  deleteVendor,
  getVendors,
  updateVendor,
} from '../services/api';
import { includesText, matchSearchFields } from '../utils/adminFilters';

const vendorSearchGetters = {
  name: (vendor) => vendor.vendorName,
  company: (vendor) => vendor.companyName,
  email: (vendor) => vendor.email,
  phone: (vendor) => vendor.phone,
};

function VendorManagement() {
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [recencyFilter, setRecencyFilter] = useState('all');

  const loadVendors = async () => {
    setIsLoading(true);
    try {
      const response = await getVendors();
      setVendors(response.data || []);
    } catch (error) {
      setMessage(error.message || 'Unable to load vendors right now.');
      setMessageType('error');
      setVendors([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  const filteredVendors = useMemo(() => {
    let list = [...vendors];

    if (statusFilter === 'active') {
      list = list.filter((vendor) => (vendor.status || 'Active').toLowerCase() === 'active');
    } else if (statusFilter === 'inactive') {
      list = list.filter((vendor) => (vendor.status || 'Active').toLowerCase() !== 'active');
    }

    if (recencyFilter === 'recent') {
      list = [...list].sort((left, right) => {
        const leftDate = new Date(left.createdAt || 0).getTime();
        const rightDate = new Date(right.createdAt || 0).getTime();
        return rightDate - leftDate || right.id - left.id;
      }).slice(0, 15);
    }

    if (searchQuery.trim()) {
      const fields = searchField === 'all' ? ['all'] : [searchField];
      list = list.filter((vendor) =>
        matchSearchFields(vendor, searchQuery, fields, vendorSearchGetters)
      );
    }

    return list;
  }, [vendors, searchQuery, searchField, statusFilter, recencyFilter]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSearchField('all');
    setStatusFilter('all');
    setRecencyFilter('all');
  };

  const handleCreateVendor = async (data) => {
    await createVendor(data);
    setMessage('Vendor added successfully.');
    setMessageType('success');
    setSelectedVendor(null);
    await loadVendors();
  };

  const handleUpdateVendor = async (id, data) => {
    await updateVendor(id, data);
    setMessage('Vendor updated successfully.');
    setMessageType('success');
    setSelectedVendor(null);
    await loadVendors();
  };

  const handleDeleteVendor = async (vendor) => {
    const confirmed = window.confirm(`Delete vendor "${vendor.vendorName}"?`);

    if (!confirmed) {
      return;
    }

    try {
      await deleteVendor(vendor.id);
      setMessage('Vendor deleted successfully.');
      setMessageType('success');
      if (selectedVendor?.id === vendor.id) {
        setSelectedVendor(null);
      }
      await loadVendors();
    } catch (error) {
      setMessage(error.message || 'Unable to delete vendor right now.');
      setMessageType('error');
    }
  };

  return (
    <section className="container">
      <div className="page-header-card card">
        <h2 className="section-title card-title">Vendor Management</h2>
        <p className="section-copy">
          Add supplier records, update contact details, and keep vendor information
          available for inventory operations.
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
                {selectedVendor ? 'Edit Vendor' : 'Add Vendor'}
              </h3>
              <p className="section-copy">
                Capture supplier details for the parts inventory module.
              </p>
            </div>
          </div>

          <VendorForm
            selectedVendor={selectedVendor}
            onCancelEdit={() => setSelectedVendor(null)}
            onCreate={handleCreateVendor}
            onUpdate={handleUpdateVendor}
          />
        </article>

        <article className="table-card card inventory-panel">
          <div className="table-card-header">
            <div>
              <h3 className="staff-card-title card-title">Vendor Directory</h3>
              <p className="section-copy">
                Review active suppliers and update records as needed.
              </p>
            </div>
          </div>

          <AdminDataToolbar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search vendors..."
            searchField={searchField}
            onSearchFieldChange={setSearchField}
            searchFields={[
              { value: 'all', label: 'All fields' },
              { value: 'name', label: 'Vendor name' },
              { value: 'company', label: 'Company name' },
              { value: 'email', label: 'Email' },
              { value: 'phone', label: 'Phone' },
            ]}
            selects={[
              {
                id: 'status',
                label: 'Status',
                value: statusFilter,
                onChange: setStatusFilter,
                options: [
                  { value: 'all', label: 'All vendors' },
                  { value: 'active', label: 'Active vendors' },
                  { value: 'inactive', label: 'Inactive vendors' },
                ],
              },
              {
                id: 'recency',
                label: 'Recency',
                value: recencyFilter,
                onChange: setRecencyFilter,
                options: [
                  { value: 'all', label: 'All time' },
                  { value: 'recent', label: 'Recently added' },
                ],
              },
            ]}
            onClear={handleClearFilters}
            resultText={`Showing ${filteredVendors.length} of ${vendors.length} vendors`}
          />

          {isLoading ? (
            <p className="status-text">Loading vendors...</p>
          ) : (
            <VendorList
              vendors={filteredVendors}
              onEdit={setSelectedVendor}
              onDelete={handleDeleteVendor}
            />
          )}
        </article>
      </div>
    </section>
  );
}

export default VendorManagement;
