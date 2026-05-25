import React from 'react';
import Header from './Header'; // This looks in the same folder

const DashboardLayout = ({ children, isLoggedIn }) => {
  return (
    <div className="app-container">
      <Header isLoggedIn={isLoggedIn} />
      <main className="content">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;