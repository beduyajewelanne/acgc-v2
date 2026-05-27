// import React from 'react';
// import { Outlet, Link } from 'react-router-dom';
// import './AdminLayout.css'; 

// const AdminLayout = () => {
//   return (
//     <div className="admin-layout">
//       <aside className="sidebar">
//         <h2>ACGC Glass</h2>
//         <nav>
//           <Link to="/admin">Dashboard</Link>
//           <Link to="/admin/site-inspections">Site Inspection</Link>
//           <Link to="/admin/monitor">Progress Monitor</Link>
//           <Link to="/admin/products">Products</Link>
//           <Link to="/admin/transactions">Transactions</Link>
//           <Link to="/admin/settings">Settings</Link>
//           <Link to="/admin/profile">Profile</Link>
//         </nav>
//       </aside>
//       <main className="content">
//         <Outlet />
//       </main>
//     </div>
//   );
// };

// export default AdminLayout;

import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import './AdminLayout.css'; 

const AdminLayout = () => {
  const location = useLocation();

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>ACGC<span>Glass & Aluminum Services</span></h2>
        </div>
        <nav className="nav-links">
          <Link to="/admin" className={location.pathname === '/admin' ? 'active' : ''}>Dashboard</Link>
          <Link to="/admin/site-inspections" className={location.pathname.includes('inspections') ? 'active' : ''}>Site Inspection</Link>
          <Link to="/admin/monitor" className={location.pathname.includes('monitor') ? 'active' : ''}>Progress Monitor</Link>
          <Link to="/admin/products" className={location.pathname.includes('products') ? 'active' : ''}>Products</Link>
          <Link to="/admin/transactions" className={location.pathname.includes('transactions') ? 'active' : ''}>Transactions</Link>
          {/* <hr /> */}
          <Link to="/admin/settings" className={location.pathname.includes('settings') ? 'active' : ''}>Settings</Link>
          <Link to="/admin/profile" className={location.pathname.includes('profile') ? 'active' : ''}>Profile</Link>
        </nav>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;