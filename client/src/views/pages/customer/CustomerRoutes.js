import React from 'react';
import { Routes, Route } from 'react-router-dom';
import CustomerDashboard from './CustomerDashboard';
import BrowseProducts from './BrowseProducts';

const CustomerRoutes = () => {
  return (
    <Routes>
      {/* This maps /customer/home */}
      <Route path="home" element={<CustomerDashboard />} />
      
      {/* This maps /customer/products */}
      <Route path="products" element={<BrowseProducts />} /> 
      
      {/* This maps /customer/ (the default) */}
      <Route path="/" element={<CustomerDashboard />} />
    </Routes>
  );
};

export default CustomerRoutes;