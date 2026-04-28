import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Staff Management', path: '/staff-management' },
  { label: 'Customers', path: '/customers' },
  { label: 'Customer Services', path: '/customer-services' },
  { label: 'Reports', path: '/reports' },
];

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-dot" />
        <div>
          <p className="brand-title">GarageGo</p>
          <p className="brand-subtitle">Admin Console</p>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {navItems.map((navItem) => (
          <NavLink
            key={navItem.path}
            to={navItem.path}
            className={({ isActive }) =>
              isActive ? 'nav-item nav-item-active' : 'nav-item'
            }
          >
            {navItem.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
