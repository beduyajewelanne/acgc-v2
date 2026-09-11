import React, { useContext } from 'react'; // Added useContext
import { Link, useNavigate } from 'react-router-dom'; // Added useNavigate
import { UserContext } from '../../App'; // Import UserContext (adjust path if needed)
import './Header.css';
import { FaShoppingCart } from 'react-icons/fa';

const Header = ({ isLoggedIn }) => {
  const navigate = useNavigate(); // Initialize navigate
  const { setUser } = useContext(UserContext); // Access setUser from Context

  const handleLogout = () => {
    // 1. Clear local storage
    localStorage.removeItem("userData");

    // 2. Reset user state to initial empty values
    setUser({
      firstName: "", lastName: "", email: "", role: "",
      token: "", address: "", barangay: "", city: "",
      phone: "", _id: "",
    });

    // 3. Redirect to login page
    navigate("/login");
  };

  return (
    <header className="dashboard-header">
      <div className="logo">
        <Link to="/">
          <img src="/images/acgc-logo.png" alt="ACGC Logo" className="logo-img" />
          <h2>ACGC SYSTEM</h2>
        </Link>
      </div>
      <nav className="nav-links">
        {isLoggedIn ? (
          <>
            <Link to="/cart" className="cart-icon" ><FaShoppingCart size={30} /></Link>
            <Link to="/customer/products">Browse Products</Link>
            <Link to="/orders">Your Orders</Link>
            <Link to="/about">About</Link>
            <Link to="/profile">Profile</Link>
            <button className="logout-btn" onClick={handleLogout}>Log Out</button>
          </>
        ) : (
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