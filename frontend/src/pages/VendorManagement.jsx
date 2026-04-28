import React, { useEffect, useState } from 'react';
import VendorForm from '../components/VendorForm';
import VendorList from '../components/VendorList';
import {
  createVendor,
  deleteVendor,
  getVendors,
  updateVendor,
} from '../services/api';

function VendorManagement() {
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

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

          {isLoading ? (
            <p className="status-text">Loading vendors...</p>
          ) : (
            <VendorList
              vendors={vendors}
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
