import { useEffect, useState } from 'react';
import './App.css';
import PartsForm from './components/PartsForm';
import PartsList from './components/PartsList';
import VendorForm from './components/VendorForm';
import VendorList from './components/VendorList';
import {
  createPart,
  createVendor,
  deletePart,
  deleteVendor,
  getParts,
  getVendors,
  updatePart,
  updateVendor,
} from './services/api';

function App() {
  const [vendors, setVendors] = useState([]);
  const [parts, setParts] = useState([]);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [activePage, setActivePage] = useState('dashboard');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [selectedPart, setSelectedPart] = useState(null);

  const fetchVendors = async () => {
    try {
      const response = await getVendors();
      setVendors(response.data);
    } catch (error) {
      console.log('Error fetching vendors:', error);
    }
  };

  const fetchParts = async () => {
    try {
      const response = await getParts();
      setParts(response.data);
    } catch (error) {
      console.log('Error fetching parts:', error);
    }
  };

  useEffect(() => {
    fetchVendors();
    fetchParts();
  }, []);

  const handleCreateVendor = async (data) => {
    try {
      await createVendor(data);
      setMessage('Vendor added successfully.');
      setErrorMessage('');
      setSelectedVendor(null);
      await fetchVendors();
    } catch (error) {
      console.error('Error creating vendor:', error);
      setMessage('');
      setErrorMessage(error.message || 'Unable to add vendor.');
      throw error;
    }
  };

  const handleUpdateVendor = async (id, data) => {
    try {
      await updateVendor(id, data);
      setMessage('Vendor updated successfully.');
      setErrorMessage('');
      setSelectedVendor(null);
      await fetchVendors();
    } catch (error) {
      console.error('Error updating vendor:', error);
      setMessage('');
      setErrorMessage(error.message || 'Unable to update vendor.');
      throw error;
    }
  };

  const handleDeleteVendor = async (vendor) => {
    const confirmed = window.confirm(`Delete vendor "${vendor.vendorName}"?`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteVendor(vendor.id);
      setMessage('Vendor deleted successfully.');
      setErrorMessage('');
      if (selectedVendor?.id === vendor.id) {
        setSelectedVendor(null);
      }
      await fetchVendors();
      await fetchParts();
    } catch (error) {
      console.error('Error deleting vendor:', error);
      setMessage('');
      setErrorMessage(error.message || 'Unable to delete vendor.');
    }
  };

  const handleCreatePart = async (data) => {
    try {
      await createPart(data);
      setMessage('Part added successfully.');
      setErrorMessage('');
      setSelectedPart(null);
      await fetchParts();
    } catch (error) {
      console.error('Error creating part:', error);
      setMessage('');
      setErrorMessage(error.message || 'Unable to add part.');
      throw error;
    }
  };

  const handleUpdatePart = async (id, data) => {
    try {
      await updatePart(id, data);
      setMessage('Part updated successfully.');
      setErrorMessage('');
      setSelectedPart(null);
      await fetchParts();
    } catch (error) {
      console.error('Error updating part:', error);
      setMessage('');
      setErrorMessage(error.message || 'Unable to update part.');
      throw error;
    }
  };

  const handleDeletePart = async (part) => {
    const confirmed = window.confirm(`Delete part "${part.partName}"?`);
    if (!confirmed) {
      return;
    }

    try {
      await deletePart(part.id);
      setMessage('Part deleted successfully.');
      setErrorMessage('');
      if (selectedPart?.id === part.id) {
        setSelectedPart(null);
      }
      await fetchParts();
    } catch (error) {
      console.error('Error deleting part:', error);
      setMessage('');
      setErrorMessage(error.message || 'Unable to delete part.');
    }
  };

  const lowStockItems = parts.filter((part) => Number(part.quantity) < 10).length;
  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'vendors', label: 'Vendors' },
    { id: 'parts', label: 'Parts' },
  ];

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">GG</div>
          <div>
            <h1>GarageGo</h1>
            <span>Admin Panel</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={activePage === item.id ? 'nav-item active' : 'nav-item'}
              type="button"
              onClick={() => setActivePage(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-area">
        <section className="hero-panel">
          <div>
            <span className="eyebrow">Admin Panel</span>
            <h2>
              {activePage === 'dashboard'
                ? 'Dashboard'
                : activePage === 'vendors'
                  ? 'Vendors'
                  : 'Parts'}
            </h2>
            <p>Manage vendors, parts, stock levels, and supplier details from one admin workspace.</p>
          </div>
          <div className="hero-stat">
            <span>Total Items</span>
            <strong>{parts.length + vendors.length}</strong>
          </div>
        </section>

        {message && <div className="success-message">{message}</div>}
        {errorMessage && <div className="error-message">{errorMessage}</div>}

        {activePage === 'dashboard' && (
          <section className="metrics-grid" aria-label="Inventory summary">
            <article className="metric-card">
              <span>Total Parts</span>
              <strong>{parts.length}</strong>
              <p>Active inventory records</p>
            </article>
            <article className="metric-card">
              <span>Total Vendors</span>
              <strong>{vendors.length}</strong>
              <p>Supplier accounts</p>
            </article>
            <article className="metric-card">
              <span>Low Stock Items</span>
              <strong>{lowStockItems}</strong>
              <p>Quantity below 10 units</p>
            </article>
          </section>
        )}

        {activePage === 'vendors' && (
          <section className="panel" id="vendors">
            <div className="section-header">
              <div>
                <span className="section-kicker">Vendor Management</span>
                <h3>{selectedVendor ? 'Edit Vendor' : 'Add Vendor'}</h3>
              </div>
            </div>
            <VendorForm
              selectedVendor={selectedVendor}
              onCancelEdit={() => setSelectedVendor(null)}
              onCreate={handleCreateVendor}
              onUpdate={handleUpdateVendor}
            />
            <div className="section-header list-heading">
              <div>
                <span className="section-kicker">Vendor List</span>
                <h3>Registered Vendors</h3>
              </div>
            </div>
            <VendorList vendors={vendors} onEdit={setSelectedVendor} onDelete={handleDeleteVendor} />
          </section>
        )}

        {activePage === 'parts' && (
          <section className="panel" id="parts">
            <div className="section-header">
              <div>
                <span className="section-kicker">Parts Management</span>
                <h3>{selectedPart ? 'Edit Part' : 'Add Part'}</h3>
              </div>
            </div>
            <PartsForm
              vendors={vendors}
              selectedPart={selectedPart}
              onCancelEdit={() => setSelectedPart(null)}
              onCreate={handleCreatePart}
              onUpdate={handleUpdatePart}
            />
            <div className="section-header list-heading">
              <div>
                <span className="section-kicker">Parts List</span>
                <h3>Inventory Parts</h3>
              </div>
            </div>
            <PartsList parts={parts} onEdit={setSelectedPart} onDelete={handleDeletePart} />
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
