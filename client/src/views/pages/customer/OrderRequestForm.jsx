import React, { useState } from 'react';
import {
  ArrowLeft, X, User, Phone, Mail, MapPin,
  Package, Calculator, Zap, CheckCircle2, AlertCircle
} from 'lucide-react';

/* ─── Unit helpers (duplicated here for standalone use) ──────────────────── */
const toFeet = (value, unit) => {
  const n = parseFloat(value) || 0;
  if (unit === 'ft') return n;
  if (unit === 'm')  return n * 3.28084;
  if (unit === 'in') return n / 12;
  if (unit === 'cm') return n / 30.48;
  return n;
};

/* ─── Mock Customer Info ─────────────────────────────────────────────────── */
const MOCK_CUSTOMER = {
  fullName: 'Juan Dela Cruz',
  email: 'juan.delacruz@email.com',
  phone: '09123456789',
  address: '123 Rizal St., Olongapo City, Zambales',
};

/* ─── Order Summary Modal ────────────────────────────────────────────────── */
const OrderSummaryModal = ({ order, onCancel, onProceed }) => {
  const { product, measurements, customer } = order;

  const hasMeas = measurements && parseFloat(measurements.width) > 0 && parseFloat(measurements.height) > 0;
  const wFt = hasMeas ? toFeet(measurements.width, measurements.unit) : 0;
  const hFt = hasMeas ? toFeet(measurements.height, measurements.unit) : 0;
  const area = wFt * hFt;
  const total = hasMeas ? area * product.price : product.price;
  const downpay = total * 0.5;

  return (
    <div className="summary-overlay">
      <div className="summary-modal">
        <div className="summary-header">
          <CheckCircle2 size={22} className="summary-icon" />
          <h3 className="summary-title">Order Request Summary</h3>
        </div>

        <div className="summary-body">
          {/* Customer */}
          <div className="summary-section">
            <p className="summary-section-label">Customer Information</p>
            <div className="summary-row"><User size={13} /><span>{customer.fullName}</span></div>
            <div className="summary-row"><Mail size={13} /><span>{customer.email}</span></div>
            <div className="summary-row"><Phone size={13} /><span>{customer.phone}</span></div>
            <div className="summary-row"><MapPin size={13} /><span>{customer.address}</span></div>
          </div>

          {/* Product */}
          <div className="summary-section">
            <p className="summary-section-label">Product Details</p>
            <div className="summary-row"><Package size={13} /><span>{product.name}</span></div>
            <div className="summary-row-plain">
              <span className="sl">Type</span><span>{product.type}</span>
            </div>
            <div className="summary-row-plain">
              <span className="sl">Category</span><span>{product.category}</span>
            </div>
          </div>

          {/* Measurements & Pricing */}
          <div className="summary-section">
            <p className="summary-section-label">
              <Calculator size={13} style={{ display: 'inline', marginRight: 4 }} />
              Pricing Estimate
            </p>
            {hasMeas ? (
              <>
                <div className="summary-row-plain">
                  <span className="sl">Dimensions</span>
                  <span>{measurements.width} × {measurements.height} {measurements.unit}</span>
                </div>
                <div className="summary-row-plain">
                  <span className="sl">Area</span>
                  <span>{area.toFixed(2)} sq ft</span>
                </div>
              </>
            ) : (
              <div className="summary-row-plain">
                <span className="sl">Measurements</span>
                <span className="text-muted">Not provided (base rate applied)</span>
              </div>
            )}
            <div className="summary-row-plain">
              <span className="sl">Rate</span>
              <span>₱{product.price.toLocaleString()} / sq ft</span>
            </div>
            <div className="summary-row-plain total">
              <span className="sl">Est. Total</span>
              <span>
                ₱{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {!hasMeas && ' (base rate)'}
              </span>
            </div>
            <div className="summary-row-plain downpay">
              <span className="sl">50% Downpayment</span>
              <span>
                ₱{downpay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="summary-note">
            <AlertCircle size={13} />
            <span>Final pricing will be confirmed during shop discussion or site inspection. Contact: <strong>09123456789</strong></span>
          </div>
        </div>

        <div className="summary-actions">
          <button className="sum-cancel" onClick={onCancel}>Cancel</button>
          <button className="sum-proceed" onClick={onProceed}>
            <Zap size={15} /> Proceed
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Order Success Page ─────────────────────────────────────────────────── */
const OrderSuccessPage = ({ onClose }) => (
  <div className="success-overlay">
    <div className="success-card">
      <div className="success-icon-wrap">
        <CheckCircle2 size={48} />
      </div>
      <h2 className="success-title">Order Request Submitted!</h2>
      <p className="success-sub">
        Thank you! Your order request has been received. Our team will contact you
        shortly to confirm the details and discuss final pricing.
      </p>
      <p className="success-contact">
        <Phone size={14} /> Questions? Call us at <strong>09123456789</strong>
      </p>
      <div className="success-actions">
        <button className="btn-your-orders" onClick={onClose}>
          View Your Orders
        </button>
        <button className="btn-back-browse" onClick={onClose}>
          Continue Browsing
        </button>
      </div>
    </div>
  </div>
);

/* ─── Order Request Form ─────────────────────────────────────────────────── */
const OrderRequestForm = ({ product, measurements, onBack, onClose }) => {
  const hasMeas =
    measurements && parseFloat(measurements.width) > 0 && parseFloat(measurements.height) > 0;

  const wFt = hasMeas ? toFeet(measurements.width, measurements.unit) : 0;
  const hFt = hasMeas ? toFeet(measurements.height, measurements.unit) : 0;
  const area = wFt * hFt;
  const total = hasMeas ? area * product.price : product.price;
  const downpay = total * 0.5;

  const [customer, setCustomer] = useState({ ...MOCK_CUSTOMER });
  const [showSummary, setShowSummary] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!customer.phone.trim()) e.phone = 'Phone number is required.';
    if (!customer.address.trim()) e.address = 'Address is required.';
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setShowSummary(true);
  };

  const handleProceed = () => {
    setShowSummary(false);
    setShowSuccess(true);
  };

  if (showSuccess) {
    return <OrderSuccessPage onClose={onClose} />;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-container order-form-container" role="dialog" aria-modal="true">

        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <button className="modal-back" onClick={onBack}>
          <ArrowLeft size={15} /> Back to Product
        </button>

        <div className="form-page">
          <div className="form-page-header">
            <h2 className="form-page-title">Place Order Request</h2>
            <p className="form-page-sub">Review your details and submit your request.</p>
          </div>

          <div className="form-layout">
            {/* ── Left: Customer Info ── */}
            <div className="form-section">
              <p className="form-section-title">
                <User size={15} /> Customer Information
              </p>

              <div className="form-field">
                <label className="form-label">Full Name</label>
                <div className="readonly-field">
                  <User size={13} className="field-icon" />
                  <input type="text" value={customer.fullName} readOnly className="form-input readonly" />
                  <span className="readonly-badge">Auto-filled</span>
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">Email Address</label>
                <div className="readonly-field">
                  <Mail size={13} className="field-icon" />
                  <input type="email" value={customer.email} readOnly className="form-input readonly" />
                  <span className="readonly-badge">Auto-filled</span>
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">Phone Number *</label>
                <div className={`editable-field ${errors.phone ? 'field-error' : ''}`}>
                  <Phone size={13} className="field-icon" />
                  <input
                    type="tel"
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    className="form-input"
                    placeholder="09XXXXXXXXX"
                  />
                </div>
                {errors.phone && <p className="error-msg"><AlertCircle size={12} /> {errors.phone}</p>}
              </div>

              <div className="form-field">
                <label className="form-label">Complete Address *</label>
                <div className={`editable-field ${errors.address ? 'field-error' : ''}`}>
                  <MapPin size={13} className="field-icon" />
                  <textarea
                    value={customer.address}
                    onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                    className="form-textarea"
                    rows={3}
                    placeholder="Street, Barangay, City, Province"
                  />
                </div>
                {errors.address && <p className="error-msg"><AlertCircle size={12} /> {errors.address}</p>}
              </div>
            </div>

            {/* ── Right: Order Summary ── */}
            <div className="form-section order-summary-panel">
              <p className="form-section-title">
                <Package size={15} /> Order Summary
              </p>

              <div className="order-product-card">
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="order-product-img"
                />
                <div className="order-product-info">
                  <p className="op-name">{product.name}</p>
                  <p className="op-meta">{product.type} · {product.category}</p>
                  <p className="op-rate">₱{product.price.toLocaleString()} / sq ft</p>
                </div>
              </div>

              {hasMeas && (
                <div className="order-meas-box">
                  <p className="meas-label">Measurements</p>
                  <div className="meas-grid">
                    <span>W: <strong>{measurements.width} {measurements.unit}</strong></span>
                    <span>H: <strong>{measurements.height} {measurements.unit}</strong></span>
                    <span>Area: <strong>{area.toFixed(2)} sq ft</strong></span>
                  </div>
                </div>
              )}

              <div className="order-price-breakdown">
                <div className="pb-row">
                  <span>Rate</span>
                  <span>₱{product.price.toLocaleString()} / sq ft</span>
                </div>
                {hasMeas && (
                  <div className="pb-row">
                    <span>Area</span>
                    <span>{area.toFixed(2)} sq ft</span>
                  </div>
                )}
                <div className="pb-row pb-total">
                  <span>Estimated Total</span>
                  <span>
                    ₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    {!hasMeas && ' *'}
                  </span>
                </div>
                <div className="pb-row pb-downpay">
                  <span>50% Downpayment</span>
                  <span>₱{downpay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {!hasMeas && (
                <p className="no-meas-note">
                  * No measurements provided. Base rate shown.
                </p>
              )}

              <div className="order-inquiry">
                <Phone size={13} />
                <span>Call for inquiries: <strong>09123456789</strong></span>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="form-submit-row">
            <button className="btn-submit-order" onClick={handleSubmit}>
              <Zap size={16} /> Submit Order Request
            </button>
          </div>
        </div>

        {/* Summary Modal */}
        {showSummary && (
          <OrderSummaryModal
            order={{ product, measurements, customer }}
            onCancel={() => setShowSummary(false)}
            onProceed={handleProceed}
          />
        )}
      </div>
    </div>
  );
};

export default OrderRequestForm;
