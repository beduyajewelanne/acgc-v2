import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, ChevronLeft, ChevronRight, ShoppingCart, Zap, Phone,
  Ruler, Calculator, Info, ArrowLeft, CheckCircle2,MessageSquareOff, Star
} from 'lucide-react';
import OrderRequestForm from './OrderRequestForm';
import {isEmpty, CRUD} from "services/data.services"

/* ─── Unit conversion helpers ────────────────────────────────────────────── */
const toFeet = (value, unit) => {
  const n = parseFloat(value) || 0;
  if (unit === 'ft') return n;
  if (unit === 'm')  return n * 3.28084;
  if (unit === 'in') return n / 12;
  if (unit === 'cm') return n / 30.48;
  return n;
};

/* ─── Price Estimator ────────────────────────────────────────────────────── */
const PriceEstimator = ({ product, measurements, onMeasurementsChange }) => {
  const { width, height, unit } = measurements;

  const wFt = toFeet(width, unit);
  const hFt = toFeet(height, unit);
  const area = wFt * hFt;
  const total = area * product.price;
  const downpayment = total * 0.5;

  const hasValues = parseFloat(width) > 0 && parseFloat(height) > 0;

  return (
    <div className="estimator-box">
      <div className="estimator-header">
        <Calculator size={16} />
        <span>Price Estimator</span>
      </div>

      <div className="estimator-inputs">
        <div className="input-group">
          <label className="input-label">Width</label>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={width}
            onChange={(e) => onMeasurementsChange({ ...measurements, width: e.target.value })}
            className="meas-input"
          />
        </div>
        <span className="times-sign">×</span>
        <div className="input-group">
          <label className="input-label">Height</label>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={height}
            onChange={(e) => onMeasurementsChange({ ...measurements, height: e.target.value })}
            className="meas-input"
          />
        </div>
        <div className="input-group unit-group">
          <label className="input-label">Unit</label>
          <select
            value={unit}
            onChange={(e) => onMeasurementsChange({ ...measurements, unit: e.target.value })}
            className="unit-select"
          >
            <option value="ft">ft</option>
            <option value="m">m</option>
            <option value="in">in</option>
            <option value="cm">cm</option>
          </select>
        </div>
      </div>

      {hasValues ? (
        <div className="estimator-results">
          <div className="result-row">
            <span className="result-label">
              <Ruler size={13} /> Area
            </span>
            <span className="result-value">{area.toFixed(2)} sq ft</span>
          </div>
          <div className="result-row">
            <span className="result-label">Base Rate</span>
            <span className="result-value">₱{product.price.toLocaleString()} / sq ft</span>
          </div>
          <div className="result-row total-row">
            <span className="result-label">Estimated Total</span>
            <span className="result-value result-total">
              ₱{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="result-row downpay-row">
            <span className="result-label">50% Downpayment</span>
            <span className="result-value result-downpay">
              ₱{downpayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      ) : (
        <div className="estimator-placeholder">
          <p>Enter width &amp; height to calculate your estimate.</p>
        </div>
      )}

      <div className="estimator-note">
        <Info size={12} />
        <span>
          Final pricing is subject to negotiation during shop discussion or on-site inspection.
        </span>
      </div>
    </div>
  );
};

const PrivateFeedbackForm = ({ product, user }) => {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!user || !user.token) {
      alert("Please login first to submit feedback.");
      return;
    }

    const payload = {
      token: user.token,
      productId: product._id || product.id,
      rating: rating,
      comment: comment,
      isApprovedByAdmin: 0 
    };

    CRUD(window.base_api + "submit_feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }, (res) => {
      setSubmitted(true);
      setOpen(false);
    });
  };

  if (submitted) {
    return (
      <p style={{ fontSize: '12px', color: '#16a34a', marginTop: '6px' }}>
        ✓ Thank you! Your feedback was sent privately to the admin.
      </p>
    );
  }

  return (
    <div style={{ marginTop: '8px' }}>
      {!open ? (
        <button 
          onClick={() => setOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#1d4ed8',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            padding: 0
          }}
        >
          + Leave private feedback for admin
        </button>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <span style={{ fontSize: '12px', fontWeight: '600' }}>Submit Private Feedback</span>
          
          {/* Star Rating Selector */}
          <div style={{ display: 'flex', gap: '4px', cursor: 'pointer' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={16}
                onClick={() => setRating(star)}
                fill={star <= rating ? '#f59e0b' : 'none'}
                color={star <= rating ? '#f59e0b' : '#cbd5e1'}
              />
            ))}
          </div>

          <textarea
            placeholder="Write your feedback here (visible to store owner only)..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
            rows={2}
            style={{ width: '100%', fontSize: '12px', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          />

          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setOpen(false)} style={{ fontSize: '12px', padding: '4px 8px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" style={{ fontSize: '12px', padding: '4px 8px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Submit</button>
          </div>
        </form>
      )}
    </div>
  );
};

/* ─── Product Modal ──────────────────────────────────────────────────────── */
const ProductModal = ({ product, initialIntent, onClose, onAddToCart, user, permissions }) => {
  const navigate = useNavigate();
  const [imgIndex, setImgIndex] = useState(0);
  const [measurements, setMeasurements] = useState({ width: '', height: '', unit: 'ft' });
  const [view, setView] = useState(initialIntent === 'order' ? 'order' : 'detail');
  const overlayRef = useRef(null);
  const [showEstimate, setShowEstimate] = useState(false);
  /* Close on overlay click */
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  useEffect(() => {
    if (initialIntent === 'order') {
      setMeasurements({
        width: product.width,
        height: product.height,
        unit: product.unit
      })
    }
  },[initialIntent])

  const clientPerms = permissions?.modules?.["Client"];
  const isFeedbackAllowed = clientPerms 
    ? (clientPerms["Can upload feedback"] === 1 || 
       clientPerms["Can Upload/View Feedback"] === 1 || 
       clientPerms["Customer Feedback"] === 1)
    : true; 

  const [modalFeedbacks, setModalFeedbacks] = useState([]);

  useEffect(() => {
    if (product) {
      if (product.feedbacks && Array.isArray(product.feedbacks)) {
        setModalFeedbacks(product.feedbacks);
        return;
      }

      const api_url = window.base_api + "get_products_client";
      CRUD(api_url, { method: "GET" }, (res) => {
        const list = res?.payload || [];
        const pId = String(product._id || product.id || '').trim();
        const pName = String(product.name || '').toLowerCase().trim();

        const matched = list.find(p => {
          const itemId = String(p._id || p.id || '').trim();
          const itemName = String(p.name || '').toLowerCase().trim();
          return (pId && itemId && pId === itemId) || (pName && itemName && pName === itemName);
        });

        if (matched?.feedbacks && Array.isArray(matched.feedbacks)) {
          setModalFeedbacks(matched.feedbacks);
        }
      });
    }
  }, [product]);

  useEffect(() => {
    console.log("=== PRODUCT MODAL DEBUG LOGS ===");
    console.log("1. Selected Product Payload:", product);
    console.log("2. Attached Feedbacks Array:", product?.feedbacks);
    console.log("3. User Context:", user);
    console.log("4. Permissions Context:", permissions);
    console.log("5. Is Feedback Allowed?:", isFeedbackAllowed);
  }, [permissions, product, user, isFeedbackAllowed]);


  /* Keyboard ESC */
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  /* Prevent body scroll */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const images = product.images || [];
  const prevImg = () => setImgIndex((i) => (i - 1 + images.length) % images.length);
  const nextImg = () => setImgIndex((i) => (i + 1) % images.length);

  const handleAddToCart = () => {
    const hasMeasurements = parseFloat(measurements.width) > 0 && parseFloat(measurements.height) > 0;
    onAddToCart(product, hasMeasurements ? measurements : null);
  };

  if (view === 'order') {
    return (
      <OrderRequestForm
        product={product}
        measurements={measurements}
        onBack={() => setView('detail')}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="modal-container" role="dialog" aria-modal="true">

        {/* Close */}
        <button className="modal-close" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        {/* Back */}
        <button className="modal-back" onClick={onClose}>
          <ArrowLeft size={15} /> Back to Products
        </button>

        <div className="modal-body">
          {/* ── Left: Image Carousel ── */}
          <div className="modal-gallery">
            <div className="gallery-main">
              <img
                src={images[imgIndex]}
                alt={`${product.name} view ${imgIndex + 1}`}
                className="gallery-image"
              />
              {images.length > 1 && (
                <>
                  <button className="gallery-prev" onClick={prevImg} aria-label="Previous image">
                    <ChevronLeft size={20} />
                  </button>
                  <button className="gallery-next" onClick={nextImg} aria-label="Next image">
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
              <div className="gallery-dots">
                {images.map((_, i) => (
                  <button
                    key={i}
                    className={`gallery-dot ${i === imgIndex ? 'active' : ''}`}
                    onClick={() => setImgIndex(i)}
                    aria-label={`View image ${i + 1}`}
                  />
                ))}
              </div>
            </div>
            <div className="gallery-thumbs">
              {images.map((src, i) => (
                <button
                  key={i}
                  className={`thumb-btn ${i === imgIndex ? 'active' : ''}`}
                  onClick={() => setImgIndex(i)}
                >
                  <img src={src} alt={`Thumbnail ${i + 1}`} />
                </button>
              ))}
            </div>
          </div>

          {/* ── Right: Details ── */}
          <div className="modal-details">
            <div className="detail-meta">
              <span className="detail-type">{product.type}</span>
              <span className="detail-category">{product.category}</span>
            </div>
            <h2 className="detail-name">{product.name}</h2>
            <p className="detail-rate">
              ₱{product.price.toLocaleString()}
              <span className="detail-unit"> / sq ft</span>
            </p>
            <p className="detail-description">{product.height} x {product.width} {product.unit}</p>
            <p className="detail-description">{product.description}</p>

            <hr className="detail-divider" />

            {/* Price Estimator */}
            {permissions?.modules?.[ "Client" ]?.["Estimate Pricing"] == 1 && (
              <PriceEstimator
                product={product}
                measurements={measurements}
                onMeasurementsChange={setMeasurements} 
              />
            )}

            {/* CTA Buttons */}
            <div className="modal-cta">
              <button 
                className="cta-order" 
                onClick={() => {
                  if (user && user.token) {
                    if (permissions?.modules?.["Client"]?.["Request Orders"] === 1) {
                      setView('order');
                    }
                  } else {
                    navigate('/login');
                  }
                }}
                hidden={user && user.token && permissions?.modules?.["Client"]?.["Request Orders"] !== 1}
              >
                <Zap size={16} /> Place Order Request
              </button>
              
              <button 
                className="cta-cart" 
                onClick={() => {
                  if (user && user.token) {
                    if (permissions?.modules?.["Client"]?.["Request Orders"] === 1) {
                      handleAddToCart();
                    }
                  } else {
                    navigate('/login');
                  }
                }}
                hidden={user && user.token && permissions?.modules?.["Client"]?.["Request Orders"] !== 1}
              >
                <ShoppingCart size={16} /> Add to Cart
              </button>
            </div>

            {/* Inquiry */}
            <div className="modal-inquiry">
              <Phone size={14} />
              <span>Call for inquiries: <strong>09123456789</strong></span>
            </div>

            {/* Feedback */}
            {!isFeedbackAllowed ? (
              <div style={{ marginTop: '12px' }}>
                <div className="cf-custom-container">
                  <CheckCircle2 size={14} />
                  <span>Customer feedback and reviews will be available soon.</span>
                </div>
              </div>
            ) : (
              (() => {
             
                const rawFeedbacks = (product?.feedbacks && product.feedbacks.length > 0) 
  ? product.feedbacks 
  : (product?.reviews || modalFeedbacks);

               
                const matchedFeedbacks = rawFeedbacks.filter(item => {
                  if (!item) return false;
                  
                  const pId = String(product._id || product.id || '').trim();
                  const pName = String(product.name || '').toLowerCase().trim();

                  const itemPId = String(item.productId || '').trim();
                  const itemPName = String(item.productName || item.product || '').toLowerCase().trim();

                  if (pId && itemPId && pId === itemPId) return true;
                  if (pName && itemPName && (itemPName.includes(pName) || pName.includes(itemPName))) return true;

                  return false;
                });

                if (matchedFeedbacks.length === 0) {
                  return (
                    <div style={{ marginTop: '12px' }}>
                      <div className="cf-custom-container">
                        <MessageSquareOff size={14} />
                        <span>No customer feedback for this product yet.</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="cf-custom-wrapper" style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                    <div className="cf-custom-title" style={{ fontWeight: '700', fontSize: '14px', marginBottom: '8px', color: '#1e293b' }}>
                      Customer Reviews ({matchedFeedbacks.length})
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                      {matchedFeedbacks.map((item, idx) => {
                        const rScore = parseInt(item.rating) || 5;
                        return (
                          <div key={item._id || item.id || idx} className="cf-custom-card" style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            <div className="cf-custom-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span className="cf-custom-author" style={{ fontWeight: '600', fontSize: '12px', color: '#0f172a' }}>
                                {item.userName || item.author || 'Verified Buyer'}
                              </span>
                              <div className="cf-custom-stars" style={{ display: 'flex', gap: '2px' }}>
                                {[...Array(5)].map((_, starIndex) => (
                                  <Star
                                    key={starIndex}
                                    size={12}
                                    fill={starIndex < rScore ? '#f59e0b' : 'none'}
                                    color={starIndex < rScore ? '#f59e0b' : '#cbd5e1'}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="cf-custom-comment" style={{ fontSize: '12px', color: '#334155', margin: 0, lineHeight: '1.4' }}>
                              {item.comment || item.feedback || 'No written review.'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;