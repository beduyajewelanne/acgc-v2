import React from 'react';
import { Routes, Route } from 'react-router-dom';
import CustomerDashboard from './CustomerDashboard';
import BrowseProducts from './BrowseProducts';

const CustomerRoutes = () => {
  return (
    <Routes>
      <Route path="home" element={<CustomerDashboard />} />
      
      <Route path="products" element={<BrowseProducts />} /> 
      
      <Route path="/" element={<CustomerDashboard />} />
    </Routes>
  );
};

export default CustomerRoutes;