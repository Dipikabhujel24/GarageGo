import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

function getPageTitle(pathname) {
  if (pathname.includes('staff-management')) {
    return 'Staff Management';
  }

  if (pathname.includes('reports')) {
    return 'Reports';
  }

  if (pathname.includes('customers')) {
    return 'Customer Lookup';
  }

  if (pathname.includes('customer-services')) {
    return 'Customer Services';
  }

  return 'Dashboard';
}

function AdminLayout() {
  const location = useLocation();
  const currentPageTitle = getPageTitle(location.pathname);

  return (
    <div className="admin-shell">
      <Sidebar />

      <div className="content-column">
        <header className="topbar">
          <div>
            <p className="topbar-label">GarageGo Administration</p>
            <h1 className="topbar-title">{currentPageTitle}</h1>
          </div>
          <button className="topbar-action" type="button">
            Admin User
          </button>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
