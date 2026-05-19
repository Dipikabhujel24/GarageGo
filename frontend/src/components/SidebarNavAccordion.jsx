import React, { useEffect, useId, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { isChildRouteActive, isPathActive } from '../config/roleBasedNav';
import SidebarNavIcon from './SidebarNavIcon';

function SidebarNavAccordion({ id, label, icon, children, onNavigate }) {
  const location = useLocation();
  const panelId = useId();
  const childActive = isChildRouteActive(location.pathname, children);
  const [isOpen, setIsOpen] = useState(childActive);

  useEffect(() => {
    if (childActive) {
      setIsOpen(true);
    }
  }, [childActive, location.pathname]);

  return (
    <div
      className={`sidebar-accordion${isOpen ? ' is-open' : ''}${childActive ? ' has-active-child' : ''}`}
    >
      <button
        type="button"
        className="sidebar-accordion-trigger"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-expanded={isOpen}
        aria-controls={panelId}
      >
        {icon ? <SidebarNavIcon name={icon} /> : null}
        <span className="sidebar-accordion-label">{label}</span>
        <span className="sidebar-accordion-chevron" aria-hidden>
          ▼
        </span>
      </button>

      <div id={panelId} className="sidebar-accordion-panel" aria-hidden={!isOpen}>
        {children.map((child) => (
          <NavLink
            key={`${id}-${child.path}`}
            to={child.path}
            end={child.end ?? false}
            className={({ isActive }) => {
              const active = isActive || isPathActive(location.pathname, child.path, child.end);
              return active ? 'nav-item nav-item-sub nav-item-active' : 'nav-item nav-item-sub';
            }}
            onClick={onNavigate}
          >
            {child.icon ? <SidebarNavIcon name={child.icon} /> : null}
            <span className="nav-item-label">{child.label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}

export default SidebarNavAccordion;
