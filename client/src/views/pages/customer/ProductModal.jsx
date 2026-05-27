import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, ChevronLeft, ChevronRight, ShoppingCart, Zap, Phone,
  Ruler, Calculator, Info, ArrowLeft, CheckCircle2
} from 'lucide-react';
import OrderRequestForm from './OrderRequestForm';
import {isEmpty} from "services/data.services"

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
    console.log(permissions)
  }, [permissions])

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
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
