import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import './AdminLayout.css'; 

const AdminLayout = () => {
  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <h2>ACGC Glass</h2>
        <nav>
          <Link to="/admin">Dashboard</Link>
          <Link to="/admin/site-inspections">Site Inspection</Link>
          <Link to="/admin/monitor">Progress Monitor</Link>
          <Link to="/admin/products">Products</Link>
          <Link to="/admin/transactions">Transactions</Link>
          <Link to="/admin/settings">Settings</Link>
        </nav>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;