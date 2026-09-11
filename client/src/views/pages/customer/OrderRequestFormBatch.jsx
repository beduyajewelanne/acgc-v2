import React, { useState, useContext, useEffect } from 'react';
import {
  ArrowLeft, X, User, Phone, Mail, MapPin,
  Package, Calculator, Zap, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CRUD } from 'services/data.services';
import { UserContext } from 'App';

/* ─── Order Summary Modal ────────────────────────────────────────────────── */
const OrderSummaryModal = ({ order, onCancel, onProceed }) => {
  const { items, customer } = order;

  // 1. Corrected grand total calculation to multiply price by quantity
  const grandTotal = items.reduce((acc, item) => acc + item.price, 0);
  const downpay = grandTotal * 0.5;

  return (
    <div className="bp-summary-overlay">
      <div className="bp-summary-modal" style={{ maxWidth: '600px' }}>
        <div className="bp-summary-header">
          <CheckCircle2 size={22} className="bp-summary-icon" />
          <h3 className="bp-summary-title">Confirm Batch Order Request</h3>
        </div>

        <div className="bp-summary-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Customer */}
          <div className="bp-summary-section">
            <p className="bp-summary-section-label">Customer Information</p>
            <div className="bp-summary-row"><User size={13} /><span>{customer?.fullName || ''}</span></div>
            <div className="bp-summary-row"><Mail size={13} /><span>{customer?.email || ''}</span></div>
            <div className="bp-summary-row"><Phone size={13} /><span>{customer?.phone || ''}</span></div>
            <div className="bp-summary-row"><MapPin size={13} /><span>{customer?.address || ''}</span></div>
          </div>

          {/* Items Compilation List */}
          <div className="bp-summary-section">
            <p className="bp-summary-section-label">Selected Products ({items.length})</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {items.map((item, index) => (
                <div key={index} style={{ padding: '8px', border: '1px solid #eee', borderRadius: '4px', fontSize: '13px' }}>
                  {/* 2. Added Quantity indicator next to the item name for visual clarity */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', color: '#333' }}>
                    <span>{item.name}</span>
                    <span style={{ color: '#666', fontWeight: 'normal' }}>x{item.quantity || 1}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'between', color: '#666', marginTop: '3px' }}>
                    <span>Size: {item.dimensions} ({item.area} sq ft)</span>
                    {/* 3. Shows the total price for this line item (Price × Qty) */}
                    <span style={{ marginLeft: 'auto', fontWeight: '500' }}>
                      ₱{(item.price * (item.quantity || 1)).toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="bp-summary-section">
            <p className="bp-summary-section-label">Pricing Compilation</p>
            <div className="bp-summary-row-plain bp-total">
              <span className="bp-sl">Est. Grand Total</span>
              <span>₱{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="bp-summary-row-plain bp-downpay">
              <span className="bp-sl">50% Downpayment</span>
              <span>₱{downpay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="bp-summary-note">
            <AlertCircle size={13} />
            <span>Final pricing will be confirmed during shop discussion or site inspection. Contact: <strong>09123456789</strong></span>
          </div>
        </div>

        <div className="bp-summary-actions">
          <button className="bp-sum-cancel" onClick={onCancel}>Cancel</button>
          <button className="bp-sum-proceed" onClick={onProceed}>
            <Zap size={15} /> Proceed
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Order Success Page ─────────────────────────────────────────────────── */
const OrderSuccessPage = ({ onClose, backToOrders }) => (
  <div className="bp-success-overlay">
    <div className="bp-success-card">
      <div className="bp-success-icon-wrap">
        <CheckCircle2 size={48} />
      </div>
      <h2 className="bp-success-title">Batch Requests Submitted!</h2>
      <p className="bp-success-sub">
        Thank you! Your architectural order requests have been received. Our estimating team will contact you
        shortly to schedule your site inspection and finalize quotation blueprints.
      </p>
      <p className="bp-success-contact">
        <Phone size={14} /> Questions? Call us at <strong>09123456789</strong>
      </p>
      <div className="bp-success-actions">
        <button className="bp-btn-your-orders" onClick={backToOrders}>
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
const OrderRequestFormBatch = ({ items = [], onBack, onClose }) => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const [customer, setCustomer] = useState({ fullName: '', email: '', phone: '', address: '' });
  const [clientNotes, setClientNotes] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  // Dynamic Grand aggregation
  const grandTotal = items.reduce((sum, item) => sum + item.price, 0);
  const downpay = grandTotal * 0.5;

  useEffect(() => {
    if (user && user.token) {
      const first = user.firstName || '';
      const last = user.lastName || '';
      const street = user.address || '';
      const brgy = user.barangay || '';
      const city = user.city || '';
      const prov = user.province || '';

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

    // Transform normalized cart array into items array structure required by the backend API
    const API_items_payload = items.map(item => ({
      product_id: item.product_id,
      width: item.width !== undefined ? item.width.toString() : "",
      height: item.height !== undefined ? item.height.toString() : "",
      unit: item.unit || "in",
      cart_id: item.id, // Passes entry identity so backend removes it from collection automatically,
      quantity: item.quantity
    }));

    const payload = {
      token,
      userId,
      customer,
      clientNotes: clientNotes,
      items: API_items_payload
    };

    try {
      CRUD((window.base_api || `http://localhost:5000/api/`).replace('/api/', '') + "/api/submit_order_request_batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }, (res) => {
        if (res && res.remarks === "success") {
          setShowSummary(false);
          setShowSuccess(true);
        } else {
          alert(res?.message || "Something went wrong while submitting your batch request.");
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
    <div className="bp-modal-overlay" style={{ position: 'relative', top: 0, left: 0, zIndex: 999 }}>
      <div className="bp-modal-container bp-order-form-container" style={{ maxWidth: '950px' }} role="dialog" aria-modal="true">

        <button className="bp-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <button className="bp-modal-back" onClick={onBack}>
          <ArrowLeft size={15} /> Back to Cart
        </button>

        <div className="bp-form-page">
          <div className="bp-form-page-header">
            <h2 className="bp-form-page-title">Place Batch Order Request</h2>
            <p className="bp-form-page-sub">Review your contact data and selected items to compile requests.</p>
          </div>

          <div className="bp-form-layout">
            {/* ── Left Side: Customer Info ── */}
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
                <label className="bp-form-label">Complete Installation Address *</label>
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

            {/* ── Right Side: Dynamic Multi-product Panel Summary ── */}
            <div className="bp-form-section bp-order-summary-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <p className="bp-form-section-title">
                <Package size={15} /> Batch Review ({items.length} items)
              </p>

              {/* Scrollable container if cart has many items */}
              <div className="bp-items-scroll-review" style={{ maxHeight: '220px', overflowY: 'auto', marginBottom: '15px', paddingRight: '4px' }}>
                {items.map((item) => (
                  <div className="bp-order-product-card" key={item.id} style={{ marginBottom: '8px', padding: '8px' }}>
                    {item.image && (
                      <img src={`${window.base_api.replace('/api/', '')}${item.image}`} alt={item.name} className="bp-order-product-img" style={{ width: '45px', height: '45px' }} />
                    )}
                    <div className="bp-order-product-info">
                      <p className="bp-op-name" style={{ fontSize: '13px' }}>{item.name}</p>
                      <p className="bp-op-meta" style={{ fontSize: '11px' }}>{item.dimensions} ({item.area} sq.ft) x{item.quantity}</p>
                      <p className="bp-op-rate" style={{ fontSize: '12px', fontWeight: 'bold' }}>₱{item.price.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bp-order-price-breakdown" style={{ marginTop: 'auto' }}>
                <div className="bp-pb-row bp-pb-total">
                  <span>Grand Estimated Total</span>
                  <span>₱{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="bp-pb-row bp-pb-downpay">
                  <span>50% Required Downpayment</span>
                  <span>₱{downpay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="bp-order-inquiry" style={{ marginTop: '10px' }}>
                <Phone size={13} />
                <span>Structural inquiries support: <strong>09123456789</strong></span>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="bp-form-submit-row">
            <button className="bp-btn-submit-order" onClick={handleSubmit}>
              <Zap size={16} /> Submit Order Requests Bunch
            </button>
          </div>
        </div>

        {showSummary && (
          <OrderSummaryModal
            order={{ items, customer }}
            onCancel={() => setShowSummary(false)}
            onProceed={handleProceed}
          />
        )}
      </div>
    </div>
  );
};

export default OrderRequestFormBatch;