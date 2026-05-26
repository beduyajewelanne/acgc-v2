import React from 'react';
import Header from './Header';

const DashboardLayout = ({ children, isLoggedIn }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      <Header isLoggedIn={isLoggedIn} /> 


      <main style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;