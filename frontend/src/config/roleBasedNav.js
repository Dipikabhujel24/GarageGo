/**
 * Role-based navigation configuration for GarageGo
 * Each menu item specifies which roles can access it
 */

export const navigationConfig = [
  {
    title: 'Workspace',
    items: [
      { label: 'Customer Dashboard', path: '/dashboard', allowedRoles: ['Customer'] },
      { label: 'Admin Dashboard', path: '/admin/dashboard', allowedRoles: ['Admin'] },
    ],
  },
  {
    title: 'Staff',
    items: [
      { label: 'Dashboard', path: '/staff/dashboard', allowedRoles: ['Staff', 'Admin'] },
      { label: 'Customers', path: '/staff/customers', allowedRoles: ['Staff', 'Admin'] },
      { label: 'Sales', path: '/staff/sales', allowedRoles: ['Staff', 'Admin'] },
      { label: 'Invoices', path: '/staff/invoices', allowedRoles: ['Staff', 'Admin'] },
      { label: 'Inventory', path: '/staff/inventory', allowedRoles: ['Staff', 'Admin'] },
      { label: 'Reports', path: '/staff/reports', allowedRoles: ['Staff', 'Admin'] },
      { label: 'Customer Reports', path: '/staff/customer-reports', allowedRoles: ['Staff', 'Admin'] },
    ],
  },
  {
    title: 'Customers',
    items: [
      { label: 'Profile', path: '/profile', allowedRoles: ['Customer'] },
      { label: 'Vehicles', path: '/vehicles', allowedRoles: ['Customer'] },
      { label: 'History', path: '/history', allowedRoles: ['Customer'] },
      { label: 'Requests', path: '/requests', allowedRoles: ['Customer'] },
      { label: 'Customer Lookup', path: '/staff/customers', allowedRoles: ['Staff', 'Admin'] },
      { label: 'Add Customer', path: '/staff/customers/new', allowedRoles: ['Staff', 'Admin'] },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Inventory Overview', path: '/admin/inventory', allowedRoles: ['Admin'] },
      { label: 'Vendors', path: '/admin/vendors', allowedRoles: ['Admin'] },
      { label: 'Parts', path: '/admin/parts', allowedRoles: ['Admin'] },
      { label: 'Staff Management', path: '/admin/staff-management', allowedRoles: ['Admin'] },
      { label: 'Reports', path: '/admin/reports', allowedRoles: ['Admin'] },
    ],
  },
];

/**
 * Get filtered nav items for a specific role
 */
export const getFilteredNav = (role) => {
  if (!role) return [];
  
  return navigationConfig.map(group => ({
    title: group.title,
    items: group.items.filter(item => 
      item.allowedRoles && item.allowedRoles.includes(role)
    ),
  })).filter(group => group.items.length > 0);
};

/**
 * Get dashboard path for a role
 */
export const getDashboardPathForRole = (role) => {
  switch (role) {
    case 'Admin':
      return '/admin/dashboard';
    case 'Staff':
      return '/staff/dashboard';
    case 'Customer':
    default:
      return '/dashboard';
  }
};
