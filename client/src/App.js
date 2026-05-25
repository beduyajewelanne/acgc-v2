import React , { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './views/pages/Login'; // verify this matches your structure
import SignUpForm from './views/pages/SignUpForm'; 
import ForgotPassword from './views/pages/ForgotPassword';
import DashboardLayout from './components/layout/DashboardLayout';
import CustomerRoutes from './views/pages/customer/CustomerRoutes';
import BrowseProducts from './views/pages/customer/BrowseProducts';
import CustomerDashboard from './views/pages/customer/CustomerDashboard';

function App() {
      window.base_api =
    typeof process.env.REACT_APP_API !== "undefined"
      ? process.env.REACT_APP_API
      : `http://localhost:5000/api/`;

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUpForm />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        <Route path="/*" element={
          <DashboardLayout isLoggedIn={isLoggedIn}>
            <Routes>
              {/* Homepage */}
              <Route path="/" element={<CustomerDashboard isLoggedIn={isLoggedIn} />} />
              <Route path="/customer/products" element={<BrowseProducts />} />
              
              {/* Protected Routes */}
              <Route path="/customer/*" element={
                isLoggedIn ? <CustomerRoutes /> : <Navigate to="/login" />
              } />
            </Routes>
          </DashboardLayout>
        } />
      </Routes>
    </Router>
  );
}

export default App;

