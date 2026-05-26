import React, { useContext, useEffect} from 'react';
import './CustomerDashboard.css'; 
import { useNavigate } from 'react-router-dom';
import FeatureCard from '../../../components/FeatureCard'; 
import ProductCard from '../../../components/ProductCard';
import { products } from '../../../data/productData';
import { UserContext } from 'App';
import { isEmpty } from 'services/data.services';
const CustomerDashboard = ({ isLoggedIn }) => {
  const navigate = useNavigate(); //
  const { user } = useContext(UserContext);
  useEffect(() => {
    if (user && !isEmpty(user.token)) {
      console.log("User is logged in:", user);
    }
  }, [user])

  return (
    <div className="homepage-container">
      <section className="hero-banner">
        <div className="hero-overlay">
          <h1>Custom Glass & Aluminum Solutions</h1>
          <p>Professional fabrication and installation of glass windows, doors, partitions, and aluminum works. Get a custom quote in seconds.</p>
          <div className="button-group">
            <button className="btn-primary" onClick={() => navigate('/customer/products')}>Browse Products</button>
            <button className="btn-secondary" onClick={() => navigate(isLoggedIn ? '/customer/orders' : '/login')}>
              {isLoggedIn ? "View My Orders" : "Login/SignUp"}
            </button>
          </div>
        </div>
      </section>

     <section className="features">
      <FeatureCard 
        title="Quality Guaranteed" 
        description="Premium materials..." 
        image="/images/shield.png" 
      />
      <FeatureCard 
        title="Fast Turnaround" 
        description="Efficient production..." 
        image="/images/clock.png" 
      />
      <FeatureCard 
        title="Expert Installation" 
        description="Professional site inspection..." 
        image="/images/tools.png" 
      />
    </section>

      <section className="product-preview">
      <div className="preview-header">
        <h2>Our Products</h2>
        <span className="view-all" onClick={() => navigate('/customer/products')}>View All &gt;</span>
      </div>
      <div className="product-grid">
        {products.slice(0, 3).map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>

      <section className="cta-section">
        <h2>Ready to Start Your Project?</h2>
        <p>Contact us today for a free consultation and site inspection.</p>
        <div className="cta-buttons">
          <button className="btn-primary" onClick={() => navigate('/customer/products')}>Browse & Order Now</button>
          <a href="tel:+639123456789" className="btn-secondary-dark">📞 Call +63 912 345 6789</a>
        </div>
      </section>
    </div>
  );
};

export default CustomerDashboard;