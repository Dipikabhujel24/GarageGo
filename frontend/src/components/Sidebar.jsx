import React from 'react';
import { NavLink } from 'react-router-dom';
import { getFilteredNav } from '../config/roleBasedNav';
import { getStoredAuthUser } from '../utils/authSession';

function Sidebar({ sidebarOpen, setSidebarOpen }) {
  const userRole = getStoredAuthUser()?.role;

  const navGroups = getFilteredNav(userRole);
  return (
    <aside className={`app-sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
      <div className="brand-block">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div className="brand-dot" />
          <div>
            <p className="brand-title">GarageGo</p>
            <p className="brand-subtitle">Unified Workspace</p>
          </div>
        </div>

        <div className="brand-avatar" aria-hidden>
          <div className="avatar-placeholder">GG</div>
        </div>
      </div>

      <button
        className="mobile-close"
        aria-label="Close navigation"
        onClick={() => setSidebarOpen && setSidebarOpen(false)}
      >
        ✕
      </button>

      <nav className="sidebar-nav" aria-label="GarageGo navigation">
        {navGroups.map((group) => (
          <section key={group.title} className="sidebar-nav-group">
            <p className="sidebar-nav-title">{group.title}</p>
            <div className="sidebar-nav-items">
              {group.items.map((navItem) => (
                <NavLink
                  key={navItem.path}
                  to={navItem.path}
                  end={navItem.path === '/dashboard' || navItem.path === '/staff/dashboard' || navItem.path === '/admin/dashboard'}
                  className={({ isActive }) =>
                    isActive ? 'nav-item nav-item-active' : 'nav-item'
                  }
                >
                  {navItem.label}
                </NavLink>
              ))}
            </div>
          </section>
        ))}
      </nav>

      <div className="sidebar-footer">
        <small style={{ color: 'rgba(255,255,255,0.65)' }}>v1.0</small>
      </div>
    </aside>
  );
}

export default Sidebar;
