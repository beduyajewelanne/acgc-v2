import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AboutUs.css';

const AboutUs = () => {
  const navigate = useNavigate();

  return (
    <div className="about-container">
      <header className="header-section">
        <span className="badge">EST. 2010</span>
        <h1>About GlassWork PH</h1>
        <p>
          Premier glass and aluminum fabrication services. Located in Maligaya 1, 
          Kataasan, Dinalupihan, Bataan. Dedicated to delivering high-quality custom 
          solutions for residential and commercial clients.
        </p>
      </header>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-value">14+</div><p>Years of Experience</p></div>
        <div className="stat-card"><div className="stat-value">500+</div><p>Happy Clients</p></div>
        <div className="stat-card"><div className="stat-value">1,200+</div><p>Projects Completed</p></div>
        <div className="stat-card"><div className="stat-value">7 Days</div><p>Avg. Turnaround</p></div>
      </div>

      <div className="content-grid">
        <section>
          <h2>Our Services</h2>
          <ul className="services-list">
            <li>Custom Glass Windows & Doors</li>
            <li>Aluminum Frames & Partitions</li>
            <li>Curtain Wall Systems</li>
            <li>Glass Railings & Balustrades</li>
            <li>Sliding Doors & Panels</li>
            <li>Storefront Systems</li>
            <li>Site Inspection & Consultation</li>
            <li>Professional Installation</li>
          </ul>
        </section>

        <section>
          <h2>Contact Information</h2>
          <div className="contact-info">
            <p><strong>Phone:</strong> +63 912 345 6789</p>
            <p><strong>Address:</strong> Maligaya 1, Kataasan, Dinalupihan, Bataan</p>
            <p><strong>Business Hours:</strong> Mon–Sat: 8:00 AM – 6:00 PM</p>
          </div>
        </section>
      </div>

      <section className="process-section">
        <h2>Our Process</h2>
        <div className="process-steps">
          <div className="step">
            <span>1</span>
            <h3>Order Request</h3>
            <p>Submit your custom order with dimensions.</p>
          </div>
          <div className="step">
            <span>2</span>
            <h3>Site Inspection</h3>
            <p>Our team visits to take precise measurements.</p>
          </div>
          <div className="step">
            <span>3</span>
            <h3>Fabrication</h3>
            <p>Your order is crafted in our workshop.</p>
          </div>
          <div className="step">
            <span>4</span>
            <h3>Installation</h3>
            <p>Professional installation at your location.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;