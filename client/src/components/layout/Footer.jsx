
import React from 'react';
import './Footer.css';

const Footer = () => {
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
            <li><a href="/track">Track Order</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
};

export default Footer;