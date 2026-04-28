import React from "react";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";

import AdminLayout from "./components/AdminLayout";
import CustomerHistory from "./components/Customer/CustomerHistory";
import CustomerLogin from "./components/Customer/CustomerLogin";
import CustomerProfile from "./components/Customer/CustomerProfile";
import CustomerRegister from "./components/Customer/CustomerRegister";
import CustomerVehicles from "./components/Customer/CustomerVehicles";
import StaffAddCustomer from "./components/Customer/StaffAddCustomer";
import CustomerDashboard from "./components/Customer/customerDashboard";
import AppInventoryOverview from "./pages/InventoryOverview";
import CustomerLookup from "./pages/CustomerLookup";
import CustomerServiceRequests from "./pages/CustomerServiceRequests";
import Dashboard from "./pages/Dashboard";
import PartsManagement from "./pages/PartsManagement";
import Reports from "./pages/Reports";
import StaffManagement from "./pages/StaffManagement";
import VendorManagement from "./pages/VendorManagement";

import "./App.css";
import "./styles/theme.css";
import "./styles/layout.css";

function PortalHome() {
  return (
    <div className="App portal-home">
      <div className="portal-shell">
        <div className="portal-hero">
          <p className="portal-eyebrow">Merged Workspace</p>
          <h1>GarageGo</h1>
          <p className="portal-copy">
            All merged branches are available here. Open Nirjala&apos;s customer
            portal, Khushi&apos;s admin pages, the customer-features workflow,
            or Nisha&apos;s inventory tools from one shared workspace.
          </p>
        </div>

        <div className="portal-grid">
          <section className="portal-card">
            <span className="portal-badge">Nirjala Branch</span>
            <h2>Customer Portal</h2>
            <p>
              Login, register, manage profile, vehicles, and customer history.
            </p>
            <div className="portal-actions">
              <Link to="/login" className="portal-button primary">
                Open Customer Login
              </Link>
              <Link to="/register" className="portal-button secondary">
                Register Customer
              </Link>
              <Link to="/dashboard" className="portal-button secondary">
                Customer Dashboard
              </Link>
              <Link to="/history" className="portal-button secondary">
                Service &amp; Purchase History
              </Link>
            </div>
          </section>

          <section className="portal-card">
            <span className="portal-badge">Khushi Branch</span>
            <h2>Admin Pages</h2>
            <p>
              Open the merged dashboard, staff management, and reports pages.
            </p>
            <div className="portal-actions">
              <Link to="/admin/dashboard" className="portal-button primary">
                Open Admin Dashboard
              </Link>
              <Link
                to="/admin/staff-management"
                className="portal-button secondary"
              >
                Staff Management
              </Link>
              <Link to="/admin/reports" className="portal-button secondary">
                Reports
              </Link>
            </div>
          </section>

          <section className="portal-card">
            <span className="portal-badge">customer-features Branch</span>
            <h2>Customer Features</h2>
            <p>
              Open the merged customer lookup and service-request pages from the
              customer-features branch.
            </p>
            <div className="portal-actions">
              <Link to="/admin/customers" className="portal-button primary">
                Customer Lookup
              </Link>
              <Link
                to="/admin/customer-services"
                className="portal-button secondary"
              >
                Customer Services
              </Link>
            </div>
          </section>

          <section className="portal-card">
            <span className="portal-badge">Nisha Branch</span>
            <h2>Inventory Tools</h2>
            <p>
              Manage inventory metrics, vendors, and parts inside the admin
              workspace.
            </p>
            <div className="portal-actions">
              <Link to="/admin/inventory" className="portal-button primary">
                Inventory Overview
              </Link>
              <Link to="/admin/vendors" className="portal-button secondary">
                Vendors
              </Link>
              <Link to="/admin/parts" className="portal-button secondary">
                Parts
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PortalHome />} />
        <Route path="/login" element={<CustomerLogin />} />
        <Route path="/register" element={<CustomerRegister />} />
        <Route path="/dashboard" element={<CustomerDashboard />} />
        <Route path="/profile" element={<CustomerProfile />} />
        <Route path="/vehicles" element={<CustomerVehicles />} />
        <Route path="/history" element={<CustomerHistory />} />
        <Route path="/staff/customers/new" element={<StaffAddCustomer />} />

        <Route
          path="/inventory"
          element={<Navigate to="/admin/inventory" replace />}
        />
        <Route
          path="/vendors"
          element={<Navigate to="/admin/vendors" replace />}
        />
        <Route path="/parts" element={<Navigate to="/admin/parts" replace />} />
        <Route
          path="/staff-management"
          element={<Navigate to="/admin/staff-management" replace />}
        />
        <Route
          path="/reports"
          element={<Navigate to="/admin/reports" replace />}
        />

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="staff-management" element={<StaffManagement />} />
          <Route path="customers" element={<CustomerLookup />} />
          <Route
            path="customer-services"
            element={<CustomerServiceRequests />}
          />
          <Route path="inventory" element={<AppInventoryOverview />} />
          <Route path="vendors" element={<VendorManagement />} />
          <Route path="parts" element={<PartsManagement />} />
          <Route path="reports" element={<Reports />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
