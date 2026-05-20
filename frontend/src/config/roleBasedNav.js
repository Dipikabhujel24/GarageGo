/**
 * Role-based sidebar navigation for GarageGo
 */

export const garageStaffRoles = [
  'Staff',
  'Sales Staff',
  'Inventory Staff',
  'Store Keeper',
  'Cashier',
  'Service Advisor',
  'Mechanic / Technician',
  'Purchase Officer',
  'Accountant',
  'Customer Support',
  'Branch Manager',
  'Receptionist',
];

export const isRoleAllowed = (role, allowedRoles = []) => {
  if (!role || allowedRoles.length === 0) {
    return false;
  }

  return allowedRoles.includes(role) ||
    (allowedRoles.includes('Staff') && garageStaffRoles.includes(role));
};

/**
 * Sidebar structure: sections, direct links, and accordion groups.
 * Routes are unchanged from the original navigation.
 */
export const sidebarNavigation = [
  { type: 'section', title: 'Workspace' },
  {
    type: 'link',
    label: 'Customer Dashboard',
    path: '/dashboard',
    icon: 'dashboard',
    allowedRoles: ['Customer'],
    end: true,
  },
  {
    type: 'link',
    label: 'Dashboard',
    path: '/admin/dashboard',
    icon: 'dashboard',
    allowedRoles: ['Admin'],
    end: true,
  },
  {
    type: 'link',
    label: 'Dashboard',
    path: '/staff/dashboard',
    icon: 'dashboard',
    allowedRoles: ['Staff'],
    end: true,
  },

  { type: 'section', title: 'Customers' },
  {
    type: 'link',
    label: 'Profile',
    path: '/profile',
    icon: 'profile',
    allowedRoles: ['Customer'],
    end: true,
  },
  {
    type: 'link',
    label: 'Vehicles',
    path: '/vehicles',
    icon: 'vehicles',
    allowedRoles: ['Customer'],
    end: true,
  },
  {
    type: 'link',
    label: 'History',
    path: '/history',
    icon: 'history',
    allowedRoles: ['Customer'],
    end: true,
  },
  {
    type: 'link',
    label: 'Appointments',
    path: '/appointments',
    icon: 'appointments',
    allowedRoles: ['Customer'],
    end: true,
  },
  {
    type: 'link',
    label: 'Part Requests',
    path: '/part-requests',
    icon: 'parts',
    allowedRoles: ['Customer'],
    end: true,
  },
  {
    type: 'link',
    label: 'Reviews',
    path: '/reviews',
    icon: 'reviews',
    allowedRoles: ['Customer'],
    end: true,
  },
  {
    type: 'link',
    label: 'Customer Lookup',
    path: '/staff/customers',
    icon: 'lookup',
    allowedRoles: ['Staff', 'Admin'],
  },
  {
    type: 'link',
    label: 'Add Customer',
    path: '/staff/customers/new',
    icon: 'addCustomer',
    allowedRoles: ['Staff', 'Admin'],
    end: true,
  },

  { type: 'section', title: 'Sales' },
  {
    type: 'accordion',
    id: 'sales',
    label: 'Sales',
    icon: 'sales',
    children: [
      { label: 'Sales', path: '/staff/sales', icon: 'sales', allowedRoles: ['Staff', 'Admin'], end: true },
      { label: 'Sales History', path: '/staff/sales-history', icon: 'history', allowedRoles: ['Staff', 'Admin'] },
      { label: 'Invoices', path: '/staff/invoices', icon: 'invoices', allowedRoles: ['Staff', 'Admin'] },
    ],
  },

  { type: 'section', title: 'Services' },
  {
    type: 'accordion',
    id: 'services',
    label: 'Services',
    icon: 'appointments',
    children: [
      {
        label: 'Appointments',
        path: '/staff/appointments-management',
        icon: 'appointments',
        allowedRoles: ['Staff'],
      },
      {
        label: 'Appointments',
        path: '/admin/appointments-management',
        icon: 'appointments',
        allowedRoles: ['Admin'],
      },
      {
        label: 'Part Requests',
        path: '/staff/part-requests',
        icon: 'parts',
        allowedRoles: ['Staff'],
      },
      {
        label: 'Part Requests',
        path: '/admin/part-requests',
        icon: 'parts',
        allowedRoles: ['Admin'],
      },
      {
        label: 'Service Reviews',
        path: '/staff/service-reviews',
        icon: 'reviews',
        allowedRoles: ['Staff'],
      },
      {
        label: 'Service Reviews',
        path: '/admin/service-reviews',
        icon: 'reviews',
        allowedRoles: ['Admin'],
      },
    ],
  },

  { type: 'section', title: 'Inventory' },
  {
    type: 'accordion',
    id: 'inventory',
    label: 'Inventory',
    icon: 'inventory',
    children: [
      {
        label: 'Inventory Overview',
        path: '/staff/inventory',
        icon: 'inventory',
        allowedRoles: ['Staff'],
        end: true,
      },
      {
        label: 'View Parts',
        path: '/staff/inventory/parts',
        icon: 'parts',
        allowedRoles: ['Staff'],
      },
      {
        label: 'Low Stock Alerts',
        path: '/staff/inventory/low-stock',
        icon: 'history',
        allowedRoles: ['Staff'],
      },
      {
        label: 'Inventory Overview',
        path: '/admin/inventory',
        icon: 'inventory',
        allowedRoles: ['Admin'],
        end: true,
      },
      { label: 'Vendors', path: '/admin/vendors', icon: 'vendors', allowedRoles: ['Admin'] },
      { label: 'Parts', path: '/admin/parts', icon: 'parts', allowedRoles: ['Admin'] },
      { label: 'Purchase Invoices', path: '/admin/purchase-invoices', icon: 'invoices', allowedRoles: ['Admin'] },
    ],
  },

  { type: 'section', title: 'Administration' },
  {
    type: 'accordion',
    id: 'administration',
    label: 'Administration',
    icon: 'staff',
    children: [
      { label: 'Staff Management', path: '/admin/staff-management', icon: 'staff', allowedRoles: ['Admin'] },
      { label: 'Reports', path: '/staff/reports', icon: 'reports', allowedRoles: ['Staff'] },
      { label: 'Customer Reports', path: '/staff/customer-reports', icon: 'reports', allowedRoles: ['Staff'] },
      { label: 'Reports', path: '/admin/reports', icon: 'reports', allowedRoles: ['Admin'] },
      { label: 'Notifications', path: '/admin/notifications', icon: 'notifications', allowedRoles: ['Admin'] },
    ],
  },
];

function filterChild(child, role) {
  return child.allowedRoles && isRoleAllowed(role, child.allowedRoles);
}

function isPathActive(pathname, path, end = false) {
  if (end) {
    return pathname === path;
  }

  return pathname === path || pathname.startsWith(`${path}/`);
}

function isChildRouteActive(pathname, children) {
  return children.some((child) => isPathActive(pathname, child.path, child.end));
}

/**
 * Build filtered sidebar blocks for the current role.
 */
export function getFilteredSidebarNav(role) {
  if (!role) {
    return [];
  }

  const blocks = [];
  let sectionTitle = null;
  let sectionUsed = false;

  const pushSection = () => {
    if (!sectionTitle || sectionUsed) {
      return;
    }

    blocks.push({ type: 'section', title: sectionTitle });
    sectionUsed = true;
  };

  sidebarNavigation.forEach((entry) => {
    if (entry.type === 'section') {
      sectionTitle = entry.title;
      sectionUsed = false;
      return;
    }

    if (entry.type === 'link') {
      if (!isRoleAllowed(role, entry.allowedRoles)) {
        return;
      }

      pushSection();
      blocks.push({
        type: 'link',
        label: entry.label,
        path: entry.path,
        icon: entry.icon,
        end: entry.end ?? false,
      });
      return;
    }

    if (entry.type === 'accordion') {
      const children = entry.children.filter((child) => filterChild(child, role));
      if (children.length === 0) {
        return;
      }

      pushSection();
      blocks.push({
        type: 'accordion',
        id: entry.id,
        label: entry.label,
        icon: entry.icon,
        children,
      });
    }
  });

  return blocks;
}

/** @deprecated Use getFilteredSidebarNav — kept for compatibility */
export const navigationConfig = [];

/** @deprecated Use getFilteredSidebarNav */
export function getFilteredNav(role) {
  const blocks = getFilteredSidebarNav(role);
  const groups = [];
  let current = null;

  blocks.forEach((block) => {
    if (block.type === 'section') {
      current = { title: block.title, items: [] };
      groups.push(current);
      return;
    }

    if (!current) {
      current = { title: 'Menu', items: [] };
      groups.push(current);
    }

    if (block.type === 'link') {
      current.items.push({ label: block.label, path: block.path });
      return;
    }

    if (block.type === 'accordion') {
      block.children.forEach((child) => {
        current.items.push({ label: child.label, path: child.path });
      });
    }
  });

  return groups.filter((group) => group.items.length > 0);
}

export function getDashboardPathForRole(role) {
  switch (role) {
    case 'Admin':
      return '/admin/dashboard';
    case 'Customer':
      return '/dashboard';
    default:
      return garageStaffRoles.includes(role) ? '/staff/dashboard' : '/dashboard';
  }
}

export { isPathActive, isChildRouteActive };
