import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

import CustomerLogin from "./components/Customer/CustomerLogin";
import CustomerRegister from "./components/Customer/CustomerRegister";
import CustomerDashboard from "./components/Customer/customerDashboard";
import CustomerProfile from "./components/Customer/CustomerProfile";
import CustomerVehicles from "./components/Customer/CustomerVehicles";
import CustomerHistory from "./components/Customer/CustomerHistory";
import StaffAddCustomer from "./components/Customer/StaffAddCustomer";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<CustomerLogin />} />
          <Route path="/register" element={<CustomerRegister />} />
          <Route path="/dashboard" element={<CustomerDashboard />} />
          <Route path="/profile" element={<CustomerProfile />} />
          <Route path="/vehicles" element={<CustomerVehicles />} />
          <Route path="/history" element={<CustomerHistory />} />
          <Route path="/staff/customers/new" element={<StaffAddCustomer />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;