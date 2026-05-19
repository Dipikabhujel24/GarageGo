import React from 'react';
import { Navigate } from 'react-router-dom';
import { getDashboardPathForRole, isRoleAllowed } from '../config/roleBasedNav';
import { getStoredAuthUser } from '../utils/authSession';

/**
 * ProtectedRoute component that restricts access based on user role
 * If user is not logged in or role not allowed, redirects to login or access denied
 */
const ProtectedRoute = ({ 
  children, 
  allowedRoles = [], 
  redirectTo = '/login' 
}) => {
  const user = getStoredAuthUser();
  const userRole = user?.role;

  // Not logged in
  if (!user || !userRole) {
    return <Navigate to={redirectTo} replace />;
  }

  // Logged in but role not allowed
  if (allowedRoles.length > 0 && !isRoleAllowed(userRole, allowedRoles)) {
    // Redirect to their own role's dashboard
    return <Navigate to={getDashboardPathForRole(userRole)} replace />;
  }

  return children;
};

export default ProtectedRoute;
