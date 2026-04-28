import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import AdminLayout from "./components/AdminLayout";
import Dashboard from "./pages/Dashboard";
import StaffManagement from "./pages/StaffManagement";
import Reports from "./pages/Reports";
import CustomerLookup from "./pages/CustomerLookup";
import CustomerServiceRequests from "./pages/CustomerServiceRequests";

import "./styles/theme.css";
import "./styles/layout.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="staff-management" element={<StaffManagement />} />
          <Route path="customers" element={<CustomerLookup />} />
          <Route path="customer-services" element={<CustomerServiceRequests />} />
          <Route path="reports" element={<Reports />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
