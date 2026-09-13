import React, { useContext, useEffect, useState } from 'react';
import './Footer.css';
import { UserContext } from '../../App';
import { CRUD } from '../../services/data.services';

const Footer = () => {
  const { user } = useContext(UserContext);
  const isLoggedIn = !!user?.token;
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

  return (
    <footer className="main-footer">
      <div className="footer-content">
        <div>
          <h3>ACGC Glass & Aluminum Services</h3>
          <p>Premium glass and aluminum fabrication services in the Philippines.</p>
        </div>
        <div>
          <h3>Contact Us</h3>
          <p>📞 +63 912 345 6789</p>
          <p>📧 acgcglassandaluminum@email.com</p>
        </div>
        <div>
          <h3>Quick Links</h3>
          <ul>
            <li><a href="/customer/products">Browse Products</a></li>
            <li><a href="/about">About Us</a></li>
            {!isLoggedIn && canTrackProducts && <li><a href="/track">Track Order</a></li>}
          </ul>
        </div>
      </div>
    </footer>
  );
};

export default Footer;