import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { clearAuthSession, getStoredAuthUser } from '../utils/authSession';

function getPageTitle(pathname) {
  if (pathname === '/dashboard') {
    return 'Customer Dashboard';
  }

  if (pathname === '/staff/dashboard') {
    return 'Staff Dashboard';
  }

  if (pathname === '/staff/sales' || pathname === '/staff/invoices/create') {
    return 'Sales';
  }

  if (pathname === '/staff/invoices') {
    return 'Invoices';
  }

  if (pathname.startsWith('/staff/invoices/')) {
    return 'Invoice Details';
  }

  if (pathname === '/staff/customers') {
    return 'Customers';
  }

  if (pathname === '/staff/inventory') {
    return 'Inventory';
  }

  if (pathname === '/staff/reports') {
    return 'Reports';
  }

  if (pathname.includes('/admin/dashboard')) {
    return 'Admin Dashboard';
  }

  if (pathname.includes('/admin/notifications')) {
    return 'Notifications';
  }

  if (pathname.includes('staff-management')) {
    return 'Staff Management';
  }

  if (pathname.includes('/requests')) {
    return 'Requests & Appointments';
  }

  if (pathname.includes('/appointments-management')) {
    return 'Appointments Management';
  }

  if (pathname.includes('/part-requests')) {
    return 'Part Requests';
  }

  if (pathname.includes('/service-reviews')) {
    return 'Service Reviews';
  }

  if (pathname.includes('customers')) {
    return 'Customer Lookup';
  }

  if (pathname.includes('inventory')) {
    return 'Inventory Overview';
  }

  if (pathname.includes('vendors')) {
    return 'Vendor Management';
  }

  if (pathname.includes('parts')) {
    return 'Parts Management';
  }

  if (pathname.includes('purchase-invoices')) {
    return 'Purchase Invoices';
  }

  if (pathname.includes('reports')) {
    return 'Reports';
  }

  return 'Dashboard';
}

function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPageTitle = getPageTitle(location.pathname);
  const user = getStoredAuthUser();
  const userLabel = user?.name || 'Guest user';

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login');
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="app-main">
        <header className="app-topbar">
          <div className="topbar-left">
            <button
              className="mobile-toggle"
              aria-label="Toggle navigation"
              onClick={() => setSidebarOpen((s) => !s)}
            >
              ☰
            </button>
            <div>
              <p className="app-topbar-label">GarageGo Garage Management System</p>
              <h1 className="app-topbar-title">{currentPageTitle}</h1>
            </div>
          </div>
          <div className="app-topbar-actions">
            <span className="app-topbar-user">Signed in as {userLabel}</span>
            <button className="app-topbar-action" type="button" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
