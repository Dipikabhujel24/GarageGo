import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import CustomerRegister from './components/Customer/CustomerRegister';
import CustomerLogin from './components/Customer/CustomerLogin';
import CustomerDashboard from './components/Customer/customerDashboard';
import CustomerProfile from './components/Customer/CustomerProfile';
import CustomerVehicles from './components/Customer/CustomerVehicles';
import CustomerHistory from './components/Customer/CustomerHistory';

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
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;