import React, { useEffect, useState } from 'react';
import PartsForm from '../components/PartsForm';
import PartsList from '../components/PartsList';
import {
  createPart,
  deletePart,
  getParts,
  getVendors,
  updatePart,
} from '../services/api';

function PartsManagement() {
  const [vendors, setVendors] = useState([]);
  const [parts, setParts] = useState([]);
  const [selectedPart, setSelectedPart] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

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

          {isLoading ? (
            <p className="status-text">Loading parts...</p>
          ) : (
            <PartsList
              parts={parts}
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
