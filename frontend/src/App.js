import React from "react";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";

import CustomerLogin from "./components/Customer/CustomerLogin";
import CustomerRegister from "./components/Customer/CustomerRegister";
import CustomerDashboard from "./components/Customer/customerDashboard";
import CustomerProfile from "./components/Customer/CustomerProfile";
import CustomerVehicles from "./components/Customer/CustomerVehicles";
import CustomerHistory from "./components/Customer/CustomerHistory";
import StaffAddCustomer from "./components/Customer/StaffAddCustomer";
import AdminLayout from "./components/AdminLayout";
import Dashboard from "./pages/Dashboard";
import StaffManagement from "./pages/StaffManagement";
import Reports from "./pages/Reports";

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
            Both merged branches are available here. Choose the customer flow from
            Nirjala's work or open the admin pages from Khushi's branch.
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
              <Link to="/admin/staff-management" className="portal-button secondary">
                Staff Management
              </Link>
              <Link to="/admin/reports" className="portal-button secondary">
                Reports
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

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="staff-management" element={<StaffManagement />} />
          <Route path="reports" element={<Reports />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
