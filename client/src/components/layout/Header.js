import React, { useContext, useEffect, useState } from 'react'; // Added useContext
import { Link, useNavigate } from 'react-router-dom'; // Added useNavigate
import { UserContext } from '../../App'; // Import UserContext (adjust path if needed)
import { CartContext } from '../../context/CartContext';
import './Header.css';
import { FaShoppingCart } from 'react-icons/fa';
import { CRUD } from '../../services/data.services';
import NotificationBell from '../NotificationBell/NotificationBell';

const Header = ({ isLoggedIn }) => {
  const navigate = useNavigate(); // Initialize navigate
  const { user, setUser } = useContext(UserContext); 
  const { cartCount } = useContext(CartContext);
  const [canTrackProducts, setCanTrackProducts] = useState(false);
  useEffect(() => {
    if (isLoggedIn) return;
    CRUD(
      window.base_api + "get_global_client_template",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) },
      (res) => {
        if (res && res.remarks === "success" && res.payload) {
          setCanTrackProducts(res.payload["Can Track Products"] === 1);
        }
      }
    );
  }, [isLoggedIn]);

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
          <img className="logo-img" src="/images/acgc-logo.png" alt="ACGC Logo" />
          <h2>ACGC SYSTEM</h2>
        </Link>
      </div>
      <nav className="nav-links">
        {isLoggedIn ? (
          <>
            <Link to="/cart" className="cart-icon">
              <FaShoppingCart size={30} />
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </Link>
            <NotificationBell userId={user?._id} token={user?.token} role="customer" />
            <Link to="/customer/products">Browse Products</Link>
            <Link to="/orders">Your Orders</Link>
            <Link to="/about">About</Link>
            <Link to="/profile">Profile</Link>
            <button className="logout-btn" onClick={handleLogout}>Log Out</button>
          </>
        ) : (
          <>
            <Link to="/customer/products">Browse Products</Link>
            {canTrackProducts && <Link to="/track">Track Products</Link>}
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