import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

const Header = ({ isLoggedIn }) => {
  return (
    <header className="dashboard-header">
      <div className="logo">
        <Link to="/"><h2>ACGC SYSTEM</h2></Link>
      </div>
      <nav className="nav-links">
        {isLoggedIn ? (
          // Logged In Navigation
          <>
            <Link to="/customer/products">Browse Products</Link>
            <Link to="/customer/orders">Your Orders</Link>
            <Link to="/customer/about">About</Link>
            <Link to="/customer/profile">Profile</Link>
            <button className="logout-btn">Log Out</button>
          </>
        ) : (
          // Guest Navigation (Not Logged In)
          <>
            <Link to="/customer/products">Browse Products</Link>
            <Link to="/track">Track Products</Link>
            <Link to="/about">About</Link>
            <Link to="/login" className="login-btn">Login</Link>
            <Link to="/signup" className="signup-btn">Sign Up</Link>
          </>
        )}
      </nav>
    </header>
  );
};

export default Header;