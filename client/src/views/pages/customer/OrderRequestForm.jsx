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
const OrderSummaryModal = ({ order, onCancel, onProceed, isSubmitting }) => {
  const { product, measurements, customer } = order;
  console.log(measurements)
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
    <div className="bp-summary-overlay">
      <div className="bp-summary-modal">
        <div className="bp-summary-header">
          <CheckCircle2 size={22} className="bp-summary-icon" />
          <h3 className="bp-summary-title">Order Request Summary</h3>
        </div>

        <div className="bp-summary-body">
          {/* Customer */}
          <div className="bp-summary-section">
            <p className="bp-summary-section-label">Customer Information</p>
            <div className="bp-summary-row"><User size={13} /><span>{customer?.fullName || ''}</span></div>
            <div className="bp-summary-row"><Mail size={13} /><span>{customer?.email || ''}</span></div>
            <div className="bp-summary-row"><Phone size={13} /><span>{customer?.phone || ''}</span></div>
            <div className="bp-summary-row"><MapPin size={13} /><span>{customer?.address || ''}</span></div>
          </div>

          {/* Product */}
          <div className="bp-summary-section">
            <p className="bp-summary-section-label">Product Details</p>
            <div className="bp-summary-row"><Package size={13} /><span>{product.name}</span></div>
            <div className="bp-summary-row-plain">
              <span className="bp-sl">Type</span><span>{product.type}</span>
            </div>
            <div className="bp-summary-row-plain">
              <span className="bp-sl">Category</span><span>{product.category}</span>
            </div>
          </div>

          {/* Measurements & Pricing */}
          <div className="bp-summary-section">
            <p className="bp-summary-section-label">
              <Calculator size={13} style={{ display: 'inline', marginRight: 4 }} />
              Pricing Estimate
            </p>
            {hasMeas ? (
              <>
                <div className="bp-summary-row-plain">
                  <span className="bp-sl">Dimensions</span>
                  <span>{measurements.width} × {measurements.height} {measurements.unit}</span>
                </div>
                <div className="bp-summary-row-plain">
                  <span className="bp-sl">Area</span>
                  <span>{area.toFixed(2)} sq ft</span>
                </div>
              </>
            ) : (
              <div className="bp-summary-row-plain">
                <span className="bp-sl">Measurements</span>
                <span className="bp-text-muted">Not provided (base rate applied)</span>
              </div>
            )}
            <div className="bp-summary-row-plain">
              <span className="bp-sl">Rate</span>
              <span>₱{product.price.toLocaleString()} / sq ft</span>
            </div>
            <div className="bp-summary-row-plain bp-total">
              <span className="bp-sl">Est. Total</span>
              <span>
                ₱{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {!hasMeas && ' (base rate)'}
              </span>
            </div>
            <div className="bp-summary-row-plain bp-downpay">
              <span className="bp-sl">50% Downpayment</span>
              <span>
                ₱{downpay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="bp-summary-note">
            <AlertCircle size={13} />
            <span>Final pricing will be confirmed during shop discussion or site inspection. Contact: <strong>09123456789</strong></span>
          </div>
        </div>

        <div className="bp-summary-actions">
          <button className="bp-sum-cancel" onClick={onCancel} disabled={isSubmitting}>Cancel</button>
          <button className="bp-sum-proceed" onClick={onProceed} disabled={isSubmitting}>
            <Zap size={15} /> {isSubmitting ? 'Submitting…' : 'Proceed'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Order Success Page ─────────────────────────────────────────────────── */
const OrderSuccessPage = ({ onClose,backToOrders }) => (
  <div className="bp-success-overlay">
    <div className="bp-success-card">
      <div className="bp-success-icon-wrap">
        <CheckCircle2 size={48} />
      </div>
      <h2 className="bp-success-title">Order Request Submitted!</h2>
      <p className="bp-success-sub">
        Thank you! Your order request has been received. Our team will contact you
        shortly to confirm the details and discuss final pricing.
      </p>
      <p className="bp-success-contact">
        <Phone size={14} /> Questions? Call us at <strong>09123456789</strong>
      </p>
      <div className="bp-success-actions">
        <button className="bp-btn-your-orders" onClick={() => backToOrders()}>
          View Your Orders
        </button>
        <button className="bp-btn-back-browse" onClick={onClose}>
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
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (isSubmitting) return;
    setIsSubmitting(true);

    const token = user?.token;
    const userId = user?._id;
    const payload = {
      token,
      userId,
      product_id: product.id,
      customer,
      clientNotes,
      measurements: {
        // width: measurements?.width || "",
        // height: measurements?.height || "",
        // unit: measurements?.unit 1|| "ft"
        width:  measurements?.width != '' ? measurements?.width : product.width,
        height: measurements?.height != '' ? measurements?.height : product.height,
        unit: measurements?.height != '' && measurements?.width != '' ? measurements?.unit : product.unit
      },
      quantity: 1
    };

    try {
      CRUD(window.base_api + "submit_order_request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }, (res) => {
        setIsSubmitting(false);
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
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return <OrderSuccessPage onClose={onClose} backToOrders={() => navigate('/orders')} />;
  }

  return (
    <div className="bp-modal-overlay">
      <div className="bp-modal-container bp-order-form-container" role="dialog" aria-modal="true">

        <button className="bp-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <button className="bp-modal-back" onClick={onBack}>
          <ArrowLeft size={15} /> Back to Product
        </button>

        <div className="bp-form-page">
          <div className="bp-form-page-header">
            <h2 className="bp-form-page-title">Place Order Request</h2>
            <p className="bp-form-page-sub">Review your details and submit your request.</p>
          </div>

          <div className="bp-form-layout">
            {/* ── Left: Customer Info ── */}
            <div className="bp-form-section">
              <p className="bp-form-section-title">
                <User size={15} /> Customer Information
              </p>

              <div className="bp-form-field">
                <label className="bp-form-label">Full Name</label>
                <div className="bp-readonly-field">
                  <User size={13} className="bp-field-icon" />
                  <input type="text" value={customer.fullName} readOnly className="bp-form-input bp-readonly" />
                  <span className="bp-readonly-badge">Auto-filled</span>
                </div>
              </div>

              <div className="bp-form-field">
                <label className="bp-form-label">Email Address</label>
                <div className="bp-readonly-field">
                  <Mail size={13} className="bp-field-icon" />
                  <input type="email" value={customer.email} readOnly className="bp-form-input bp-readonly" />
                  <span className="bp-readonly-badge">Auto-filled</span>
                </div>
              </div>

              <div className="bp-form-field">
                <label className="bp-form-label">Phone Number *</label>
                <div className={`bp-editable-field ${errors.phone ? 'bp-field-error' : ''}`}>
                  <Phone size={13} className="bp-field-icon" />
                  <input
                    type="tel"
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    className="bp-form-input"
                    placeholder="09XXXXXXXXX"
                  />
                </div>
                {errors.phone && <p className="bp-error-msg"><AlertCircle size={12} /> {errors.phone}</p>}
              </div>

              <div className="bp-form-field">
                <label className="bp-form-label">Complete Address *</label>
                <div className={`bp-editable-field ${errors.address ? 'bp-field-error' : ''}`}>
                  <MapPin size={13} className="bp-field-icon" />
                  <textarea
                    value={customer.address}
                    onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                    className="bp-form-textarea"
                    rows={3}
                    placeholder="Street, Barangay, City, Province"
                  />
                </div>
                {errors.address && <p className="bp-error-msg"><AlertCircle size={12} /> {errors.address}</p>}
              </div>

              <div className="bp-form-field">
                <label className="bp-form-label">Special Instructions / Engineering Notes (Optional)</label>
                <div className="bp-editable-field">
                  <textarea
                    value={clientNotes}
                    onChange={(e) => setClientNotes(e.target.value)}
                    className="bp-form-textarea"
                    rows={2}
                    placeholder="Add notes about structure elevations, framing colors, glass thickness preferences, etc."
                  />
                </div>
              </div>
            </div>

            {/* ── Right: Order Summary ── */}
            <div className="bp-form-section bp-order-summary-panel">
              <p className="bp-form-section-title">
                <Package size={15} /> Order Summary
              </p>

              <div className="bp-order-product-card">
                {product.images && product.images[0] && (
                  <img
                    src={`${product.images[0]}`}
                    alt={product.name}
                    className="bp-order-product-img"
                  />
                )}
                <div className="bp-order-product-info">
                  <p className="bp-op-name">{product.name}</p>
                  <p className="bp-op-meta">{product.type} · {product.category}</p>
                  <span className="bp-op-meta">₱{product.height} x ₱{product.width} {product.unit}</span>
                  <p className="bp-op-rate">₱{product.price.toLocaleString()} / sq ft</p>
                </div>
              </div>

              {hasMeas && (
                <div className="bp-order-meas-box">
                  <p className="bp-meas-label">Measurements</p>
                  <div className="bp-meas-grid">
                    <span>W: <strong>{measurements.width} {measurements.unit}</strong></span>
                    <span>H: <strong>{measurements.height} {measurements.unit}</strong></span>
                    <span>Area: <strong>{area.toFixed(2)} sq ft</strong></span>
                  </div>
                </div>
              )}

              <div className="bp-order-price-breakdown">
                <div className="bp-pb-row">
                  <span>Rate</span>
                  <span>₱{product.price.toLocaleString()} / sq ft</span>
                </div>
                {hasMeas && (
                  <div className="bp-pb-row">
                    <span>Area</span>
                    <span>{area.toFixed(2)} sq ft</span>
                  </div>
                )}
                <div className="bp-pb-row bp-pb-total">
                  <span>Estimated Total</span>
                  <span>
                    ₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    {!hasMeas && ' *'}
                  </span>
                </div>
                <div className="bp-pb-row bp-pb-downpay">
                  <span>50% Downpayment</span>
                  <span>₱{downpay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {!hasMeas && (
                <p className="bp-no-meas-note">
                  * No measurements provided. Base rate shown.
                </p>
              )}

              <div className="bp-order-inquiry">
                <Phone size={13} />
                <span>Call for inquiries: <strong>09123456789</strong></span>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="bp-form-submit-row">
            <button className="bp-btn-submit-order" onClick={handleSubmit}>
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
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
};

export default OrderRequestForm;