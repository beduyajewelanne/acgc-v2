import React, { useState, useContext, useEffect } from 'react';
import './CustomerDashboard.css'; 
import { useNavigate } from 'react-router-dom';
import FeatureCard from '../../../components/FeatureCard'; 
import ProductCard from '../../../components/ProductCard';
import { UserContext } from 'App';
import { isEmpty, CRUD } from 'services/data.services';

const CustomerDashboard = ({ isLoggedIn }) => {
  const navigate = useNavigate();
  const { user, permissions } = useContext(UserContext);

  const [featuredProducts, setFeaturedProducts] = useState([]);

  const [ratingData, setRatingData] = useState({
    averageRating: 0,
    breakdown: []
  });
  const clientPerms = permissions?.modules?.["Client"];
  const [globalRatingEnabled, setGlobalRatingEnabled] = useState(false);

  useEffect(() => {
    if (user && !isEmpty(user.token)) return; // may sarili nang permissions ang naka-login na user

    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: user?.token || "", _id: user?._id || "" })
    };

    CRUD(window.base_api + "get_global_client_template", requestOptions, (res) => {
      if (res && res.remarks === "success" && res.payload) {
        setGlobalRatingEnabled(res.payload["Show Ratings Homepage"] === 1);
      } else {
        setGlobalRatingEnabled(false); // safe default: itago kapag hindi matukoy
      }
    });
  }, [user]);

  const isHomepageRatingEnabled = clientPerms
    ? clientPerms["Show Ratings Homepage"] === 1
    : globalRatingEnabled;

  useEffect(() => {
    console.log("=== CUSTOMER DASHBOARD DEBUG ===");
    console.log("User Context:", user);
    console.log("Permissions Context:", permissions);
    console.log("Is Homepage Rating Enabled?:", isHomepageRatingEnabled);
  }, [user, permissions, isHomepageRatingEnabled]);

  useEffect(() => {
    const requestOptions = {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    };

    CRUD(window.base_api + "featured_products", requestOptions, (res) => {
      if (res && res.remarks === "success") {
        setFeaturedProducts(res.payload || []);
      } else if (Array.isArray(res)) {
        setFeaturedProducts(res);
      } else if (res && Array.isArray(res.payload)) {
        setFeaturedProducts(res.payload);
      } else {
        console.error("Dashboard: Error fetching featured products payload:", res);
      }
    });
  }, []);

    /* Fetch Dynamic Ratings Data */
  useEffect(() => {
    const requestOptions = {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    };

    CRUD(window.base_api + "customer_ratings", requestOptions, (res) => {
      console.log("Dashboard: Ratings API response:", res);
      if (res && res.remarks === "success" && res.payload) {
        setRatingData(res.payload);
      } else if (res && res.averageRating !== undefined) {
        setRatingData(res);
      } else {
        console.error("Dashboard: Error fetching ratings data:", res);
      }
    });
  }, []);

  useEffect(() => {
    if (user && !isEmpty(user.token)) {
      if (user.role === "admin" || user.role === "staff") {
        navigate("/admin");
      }
      console.log("User is logged in:", user);
    }
  }, [user]);

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (rating >= i) {
        stars.push(<span key={i} className="star full">★</span>);
      } else if (rating >= i - 0.5) {
        stars.push(<span key={i} className="star half">★</span>);
      } else {
        stars.push(<span key={i} className="star empty">☆</span>);
      }
    }
    return stars;
  };

  return (
    <div className="homepage-container">
      <section className="hero-banner">
        <div className="hero-overlay">
          <h1>Custom Glass & Aluminum Solutions</h1>
          <p>Professional fabrication and installation of glass windows, doors, partitions, and aluminum works. Get a custom quote in seconds.</p>
          <div className="button-group">
            <button className="btn-primary" onClick={() => navigate('/customer/products')}>Browse Products</button>
            <button className="btn-secondary" onClick={() => navigate(isLoggedIn ? '/orders' : '/login')}>
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
          {featuredProducts.length === 0 ? (
            <div className="pms-loading-shimmer" style={{ padding: "2rem", gridColumn: "1/-1", textAlign: "center", color: "var(--text-muted)" }}>
              Loading featured selections...
            </div>
          ) : (
            [...featuredProducts]
              .sort((a, b) => (b.isTopProduct ? 1 : 0) - (a.isTopProduct ? 1 : 0))
              .slice(0, 3)
              .map((p) => (
                <ProductCard key={p._id || p.id} product={p} />
              ))
          )}
        </div>
      </section>

      {isHomepageRatingEnabled && (
        <section className="rating-section">
          <h2>Customer Ratings</h2>

          <div className="rating-container">
            <div className="rating-score-box">
              <div className="rating-number">
                {Number(ratingData.averageRating).toFixed(1)}
              </div>
              <div className="stars-gold">
                {renderStars(ratingData.averageRating)}
              </div>
              <div className="rating-label">Average Rating</div>
            </div>

            <div className="rating-bars">
              {ratingData.breakdown.map((item) => (
                <div className="rating-bar-row" key={item.stars}>
                  <div className="bar-background">
                    <div
                      className="bar-fill"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
w
                  <div className="bar-meta">
                    <div className="stars-gold">
                      {renderStars(item.stars)}
                    </div>
                    <span className="percentage-text">{item.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default CustomerDashboard;