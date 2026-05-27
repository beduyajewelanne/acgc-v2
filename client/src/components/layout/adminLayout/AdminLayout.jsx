import React, { useContext, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { UserContext } from '../../../App'; // Adjust this import path to point to your App.js
import './AdminLayout.css'; 

const AdminLayout = () => {
  const location = useLocation();
  const { user, permissions, permissionsLoaded } = useContext(UserContext);
  useEffect(() => {
    console.log(permissions);
  }, [permissions]);
  // Fallback while system checks clearances
  if (!permissionsLoaded) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading navigation panel...</div>;
  }

  const roleNormalized = user?.role?.trim().toLowerCase();
  const assignedModules = permissions?.modules || user?.modules;

  // Helper function to check if a navigation item should be visible
  const hasViewAccess = (moduleKey) => {
    // Full Admins automatically see all sidebar links
    // if (roleNormalized === 'admin') return true;
    
    // Staff must have the module present and explicit View access set to 1
    return assignedModules?.[moduleKey] && assignedModules[moduleKey]["View"] == 1;
  };

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>ACGC<span>Glass & Aluminum Services</span></h2>
        </div>
        <nav className="nav-links">
          {hasViewAccess('Dashboard') && (
            <Link to="/admin" className={location.pathname === '/admin' || location.pathname === '/admin/dashboard' ? 'active' : ''}>Dashboard</Link>
          )}
          
          {hasViewAccess('Site Inspection') && (
            <Link to="/admin/site-inspections" className={location.pathname.includes('inspections') ? 'active' : ''}>Site Inspection</Link>
          )}
          
          {hasViewAccess('Progress Monitor') && (
            <Link to="/admin/monitor" className={location.pathname.includes('monitor') ? 'active' : ''}>Progress Monitor</Link>
          )}
          
          {hasViewAccess('Products') && (
            <Link to="/admin/products" className={location.pathname.includes('products') ? 'active' : ''}>Products</Link>
          )}
          
          {hasViewAccess('Transactions') && (
            <Link to="/admin/transactions" className={location.pathname.includes('transactions') ? 'active' : ''}>Transactions</Link>
          )}
          
          {hasViewAccess('Settings') && (
            <Link to="/admin/settings" className={location.pathname.includes('settings') ? 'active' : ''}>Settings</Link>
          )}
          
          {hasViewAccess('Profile') && (
            <Link to="/admin/profile" className={location.pathname.includes('profile') ? 'active' : ''}>Profile</Link>
          )}
        </nav>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;