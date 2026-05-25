import React, { useContext, useEffect} from 'react';
import './CustomerDashboard.css'; 
import { useNavigate } from 'react-router-dom';
import FeatureCard from '../../../components/FeatureCard'; 
import ProductCard from '../../../components/ProductCard';
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
          <p>Professional fabrication and installation for your needs.</p>
          <div className="button-group">
            
            {/* 1. Browse Products Button */}
            <button 
              className="btn-primary" 
              onClick={() => navigate('/customer/products')}
            >
              Browse Products
            </button>

            {/* 2. Dynamic Button */}
            {isLoggedIn ? (
               <button 
                 className="btn-secondary" 
                 onClick={() => navigate('/customer/orders')}
               >
                 View My Orders
               </button>
            ) : (
               <button 
                 className="btn-secondary" 
                 onClick={() => navigate('/login')}
               >
                 Login/SignUp
               </button>
            )}
          </div>
        </div>
      </section>

      {/* 2. Info Cards (The 3-column section) */}
      <section className="features">
        <FeatureCard title="Quality Guaranteed" icon="🛡️" />
        <FeatureCard title="Fast Turnaround" icon="⏱️" />
        <FeatureCard title="Expert Installation" icon="🛠️" />
      </section>

      {/* 3. Product Preview */}
      <section className="product-preview">
        <h2>Our Products</h2>
        {/* Map your top 4 products here */}
      </section>
    </div>
  );
};

export default CustomerDashboard;