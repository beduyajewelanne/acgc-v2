import React, { useState, useContext, useEffect } from 'react';
import {
  ArrowLeft, X, User, Phone, Mail, MapPin,
  Package, Calculator, Zap, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CRUD } from 'services/data.services';
import { UserContext } from 'App';

/* ─── Unit helpers (duplicated here for standalone use) ──────────────────── */
const toFeet = (value, unit) => {
  const n = parseFloat(value) || 0;
  if (unit === 'ft') return n;
  if (unit === 'm')  return n * 3.28084;
  if (unit === 'in') return n / 12;
  if (unit === 'cm') return n / 30.48;
  return n;
};

/* ─── Order Summary Modal ────────────────────────────────────────────────── */
const OrderSummaryModal = ({ order, onCancel, onProceed }) => {
  const { product, measurements, customer } = order;

  const hasMeas = measurements && parseFloat(measurements.width) > 0 && parseFloat(measurements.height) > 0;
  const wFt = hasMeas ? toFeet(measurements.width, measurements.unit) : 0;
  const hFt = hasMeas ? toFeet(measurements.height, measurements.unit) : 0;
  const area = wFt * hFt;
  const adminWFt = toFeet(product.width || 0, product.unit || 'in');
  const adminHFt = toFeet(product.height || 0, product.unit || 'in');
  const adminArea = adminWFt * adminHFt;
  const total = hasMeas ? area * product.price : (adminArea > 0 ? adminArea * product.price : product.price);
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
            <div className="summary-row"><User size={13} /><span>{customer?.fullName || ''}</span></div>
            <div className="summary-row"><Mail size={13} /><span>{customer?.email || ''}</span></div>
            <div className="summary-row"><Phone size={13} /><span>{customer?.phone || ''}</span></div>
            <div className="summary-row"><MapPin size={13} /><span>{customer?.address || ''}</span></div>
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
const OrderSuccessPage = ({ onClose,backToOrders }) => (
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
        <button className="btn-your-orders" onClick={() => backToOrders()}>
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
  const { user } = useContext(UserContext);
  const hasMeas =
    measurements && parseFloat(measurements.width) > 0 && parseFloat(measurements.height) > 0;
  const navigate = useNavigate();
  const wFt = hasMeas ? toFeet(measurements.width, measurements.unit) : 0;
  const hFt = hasMeas ? toFeet(measurements.height, measurements.unit) : 0;
  const area = wFt * hFt;
  const adminWFt = toFeet(product.width || 0, product.unit || 'in');
  const adminHFt = toFeet(product.height || 0, product.unit || 'in');
  const adminArea = adminWFt * adminHFt;
  const total = hasMeas ? area * product.price : (adminArea > 0 ? adminArea * product.price : product.price);
    const downpay = total * 0.5;

  const [customer, setCustomer] = useState({ fullName: '', email: '', phone: '', address: '' });
  const [clientNotes, setClientNotes] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user && user.token) {
      const first = user.firstName || '';
      const last = user.lastName || '';
      const street = user.address || '';
      const brgy = user.barangay || '';
      const city = user.city || '';
      const prov = user.province || '';

      // Construct components with space matching filtering out undefined properties safely
      const fullAddress = [street, brgy, city, prov].filter(Boolean).join(' ');

      setCustomer({
        fullName: `${first} ${last}`.trim() || 'Guest User',
        email: user.email || '',
        phone: user.phone || '',
        address: fullAddress || '',
      });
    }
  }, [user]);

  const validate = () => {
    const e = {};
    if (!customer.phone || !customer.phone.trim()) e.phone = 'Phone number is required.';
    if (!customer.address || !customer.address.trim()) e.address = 'Address is required.';
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setShowSummary(true);
  };

  const handleProceed = async () => {
    const token = user?.token;
    const userId = user?._id;
    console.log(product)
    const payload = {
      token,
      userId,
      product_id: product.id,
      customer,
      clientNotes,
      measurements: {
        width: measurements?.width || "",
        height: measurements?.height || "",
        unit: measurements?.unit || "ft"
      },
      quantity: 1
    };

    try {
      CRUD(window.base_api + "submit_order_request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }, (res) => {
        if (res && res.remarks === "success") {
          console.log("Order Request successfully processed:", res);
          setShowSummary(false);
          setShowSuccess(true);
        } else {
          alert(res?.message || "Something went wrong while submitting your request.");
        }
      });
    } catch (error) {
      console.error("Failed to submit order request:", error);
      alert("A network or configuration error occurred. Please try again.");
    }
  };

  if (showSuccess) {
    return <OrderSuccessPage onClose={onClose} backToOrders={() => navigate('/orders')} />;
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

              <div className="form-field">
                <label className="form-label">Special Instructions / Engineering Notes (Optional)</label>
                <div className="editable-field">
                  <textarea
                    value={clientNotes}
                    onChange={(e) => setClientNotes(e.target.value)}
                    className="form-textarea"
                    rows={2}
                    placeholder="Add notes about structure elevations, framing colors, glass thickness preferences, etc."
                  />
                </div>
              </div>
            </div>

            {/* ── Right: Order Summary ── */}
            <div className="form-section order-summary-panel">
              <p className="form-section-title">
                <Package size={15} /> Order Summary
              </p>

              <div className="order-product-card">
                {product.images && product.images[0] && (
                  <img
                    src={`${product.images[0]}`}
                    alt={product.name}
                    className="order-product-img"
                  />
                )}
                <div className="order-product-info">
                  <p className="op-name">{product.name}</p>
                  <p className="op-meta">{product.type} · {product.category}</p>
                  <span className="op-meta">₱{product.height} x ₱{product.width} {product.unit}</span>
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

        {/* Summary Modal Component Trigger Block */}
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