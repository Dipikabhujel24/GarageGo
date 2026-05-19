import React, { useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { getFilteredSidebarNav, isPathActive } from '../config/roleBasedNav';
import { getStoredAuthUser } from '../utils/authSession';
import SidebarNavAccordion from './SidebarNavAccordion';
import SidebarNavIcon from './SidebarNavIcon';

function Sidebar({ sidebarOpen, setSidebarOpen }) {
  const location = useLocation();
  const userRole = getStoredAuthUser()?.role;
  const navBlocks = useMemo(() => getFilteredSidebarNav(userRole), [userRole]);

  const closeMobileNav = () => {
    if (setSidebarOpen) {
      setSidebarOpen(false);
    }
  };

  return (
    <aside className={`app-sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
      <div className="brand-block">
        <div className="brand-lockup">
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
        onClick={closeMobileNav}
      >
        ✕
      </button>

      <nav className="sidebar-nav" aria-label="GarageGo navigation">
        {navBlocks.map((block) => {
          if (block.type === 'section') {
            return (
              <p key={`section-${block.title}`} className="sidebar-nav-title">
                {block.title}
              </p>
            );
          }

          if (block.type === 'link') {
            return (
              <NavLink
                key={block.path}
                to={block.path}
                end={block.end}
                className={({ isActive }) => {
                  const active = isActive || isPathActive(location.pathname, block.path, block.end);
                  return active ? 'nav-item nav-item-active' : 'nav-item';
                }}
                onClick={closeMobileNav}
              >
                {block.icon ? <SidebarNavIcon name={block.icon} /> : null}
                <span className="nav-item-label">{block.label}</span>
              </NavLink>
            );
          }

          if (block.type === 'accordion') {
            return (
              <SidebarNavAccordion
                key={block.id}
                id={block.id}
                label={block.label}
                icon={block.icon}
                children={block.children}
                onNavigate={closeMobileNav}
              />
            );
          }

          return null;
        })}
      </nav>

      <div className="sidebar-footer">
        <small>v1.0</small>
      </div>
    </aside>
  );
}

export default Sidebar;
