import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useParams } from "react-router-dom";

import AdminLayout from "./components/AdminLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import CustomerHistory from "./components/Customer/CustomerHistory";
import CustomerLogin from "./components/Customer/CustomerLogin";
import CustomerProfile from "./components/Customer/CustomerProfile";
import CombinedRegister from "./components/Customer/CombinedRegister";
import CustomerVehicles from "./components/Customer/CustomerVehicles";
import StaffAddCustomer from "./components/Customer/StaffAddCustomer";
import CustomerDashboard from "./components/Customer/customerDashboard";
import AppointmentsManagement from "./pages/AppointmentsManagement";
import AppInventoryOverview from "./pages/InventoryOverview";
import CustomerLookup from "./pages/CustomerLookup";
import CustomerReports from "./pages/CustomerReports";
import CustomerServiceRequests from "./pages/CustomerServiceRequests";
import Dashboard from "./pages/Dashboard";
import PartRequestsManagement from "./pages/PartRequestsManagement";
import PartsManagement from "./pages/PartsManagement";
import ServiceReviewsManagement from "./pages/ServiceReviewsManagement";
import StaffDashboard from "./pages/StaffDashboard";
import StaffInvoices from "./pages/StaffInvoices";
import StaffInvoiceDetails from "./pages/StaffInvoiceDetails";
import StaffSalesPage from "./pages/StaffSalesPage";
import Reports from "./pages/Reports";
import Notifications from "./pages/Notifications";
import StaffManagement from "./pages/StaffManagement";
import VendorManagement from "./pages/VendorManagement";
import PurchaseInvoices from "./pages/PurchaseInvoices";

import "./App.css";
import "./styles/theme.css";
import "./styles/layout.css";

function App() {
  function StaffInvoiceDetailsAlias() {
    const { id } = useParams();
    return <Navigate to={`/staff/invoices/${id}`} replace />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<CustomerLogin />} />
        <Route path="/register" element={<CombinedRegister />} />
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Navigate to="/login" replace />} />
          
          {/* Customer routes */}
          <Route 
            path="dashboard" 
            element={
              <ProtectedRoute allowedRoles={['Customer']}>
                <CustomerDashboard />
              </ProtectedRoute>
            } 
          />
          <Route
            path="requests"
            element={
              <ProtectedRoute allowedRoles={['Customer']}>
                <CustomerServiceRequests />
              </ProtectedRoute>
            }
          />
          <Route 
            path="profile" 
            element={
              <ProtectedRoute allowedRoles={['Customer']}>
                <CustomerProfile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="vehicles" 
            element={
              <ProtectedRoute allowedRoles={['Customer']}>
                <CustomerVehicles />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="history" 
            element={
              <ProtectedRoute allowedRoles={['Customer']}>
                <CustomerHistory />
              </ProtectedRoute>
            } 
          />
          
          {/* Staff routes */}
          <Route 
            path="staff/customers/new" 
            element={
              <ProtectedRoute allowedRoles={['Staff', 'Admin']}>
                <StaffAddCustomer />
              </ProtectedRoute>
            } 
          />
          <Route
            path="staff/customers"
            element={
              <ProtectedRoute allowedRoles={['Staff', 'Admin']}>
                <CustomerLookup />
              </ProtectedRoute>
            }
          />
          <Route
            path="staff/customer-reports"
            element={
              <ProtectedRoute allowedRoles={['Staff', 'Admin']}>
                <CustomerReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="staff/dashboard"
            element={
              <ProtectedRoute allowedRoles={['Staff', 'Admin']}>
                <StaffDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="staff/sales"
            element={
              <ProtectedRoute allowedRoles={['Staff', 'Admin']}>
                <StaffSalesPage />
              </ProtectedRoute>
            }
          />
          <Route path="staff/invoices/create" element={<Navigate to="/staff/sales" replace />} />
          <Route
            path="staff/invoices"
            element={
              <ProtectedRoute allowedRoles={['Staff', 'Admin']}>
                <StaffInvoices />
              </ProtectedRoute>
            }
          />
          <Route
            path="staff/invoices/:id"
            element={
              <ProtectedRoute allowedRoles={['Staff', 'Admin']}>
                <StaffInvoiceDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="staff/invoices/details/:id"
            element={
              <ProtectedRoute allowedRoles={['Staff', 'Admin']}>
                <StaffInvoiceDetailsAlias />
              </ProtectedRoute>
            }
          />
          <Route
            path="staff/inventory"
            element={
              <ProtectedRoute allowedRoles={['Staff', 'Admin']}>
                <AppInventoryOverview />
              </ProtectedRoute>
            }
          />
          <Route
            path="staff/reports"
            element={
              <ProtectedRoute allowedRoles={['Staff', 'Admin']}>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="staff/appointments-management"
            element={
              <ProtectedRoute allowedRoles={['Staff', 'Admin']}>
                <AppointmentsManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="staff/part-requests"
            element={
              <ProtectedRoute allowedRoles={['Staff', 'Admin']}>
                <PartRequestsManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="staff/service-reviews"
            element={
              <ProtectedRoute allowedRoles={['Staff', 'Admin']}>
                <ServiceReviewsManagement />
              </ProtectedRoute>
            }
          />

          {/* Legacy redirects */}
          <Route
            path="inventory"
            element={<Navigate to="/admin/inventory" replace />}
          />
          <Route
            path="vendors"
            element={<Navigate to="/admin/vendors" replace />}
          />
          <Route path="parts" element={<Navigate to="/admin/parts" replace />} />
          <Route
            path="staff-management"
            element={<Navigate to="/admin/staff-management" replace />}
          />
          <Route
            path="reports"
            element={<Navigate to="/admin/reports" replace />}
          />

          <Route path="admin" element={<Navigate to="/admin/dashboard" replace />} />

          {/* Admin routes */}
          <Route 
            path="admin/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="admin/notifications" 
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <Notifications />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="admin/staff-management" 
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <StaffManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="admin/customers" 
            element={<Navigate to="/admin/dashboard" replace />}
          />
          <Route
            path="admin/customer-services"
            element={<Navigate to="/admin/appointments-management" replace />}
          />
          <Route 
            path="admin/inventory" 
            element={
              <ProtectedRoute allowedRoles={['Staff', 'Admin']}>
                <AppInventoryOverview />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="admin/vendors" 
            element={
              <ProtectedRoute allowedRoles={['Staff', 'Admin']}>
                <VendorManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="admin/parts" 
            element={
              <ProtectedRoute allowedRoles={['Staff', 'Admin']}>
                <PartsManagement />
              </ProtectedRoute>
            } 
          />
          <Route
            path="admin/purchase-invoices"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <PurchaseInvoices />
              </ProtectedRoute>
            }
          />
          <Route 
            path="admin/reports" 
            element={
              <ProtectedRoute allowedRoles={['Staff', 'Admin']}>
                <Reports />
              </ProtectedRoute>
            } 
          />
          <Route
            path="admin/appointments-management"
            element={
              <ProtectedRoute allowedRoles={['Staff', 'Admin']}>
                <AppointmentsManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/part-requests"
            element={
              <ProtectedRoute allowedRoles={['Staff', 'Admin']}>
                <PartRequestsManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/service-reviews"
            element={
              <ProtectedRoute allowedRoles={['Staff', 'Admin']}>
                <ServiceReviewsManagement />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
