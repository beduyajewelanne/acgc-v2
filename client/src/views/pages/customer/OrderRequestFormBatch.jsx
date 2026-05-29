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
    <div className="summary-overlay">
      <div className="summary-modal" style={{ maxWidth: '600px' }}>
        <div className="summary-header">
          <CheckCircle2 size={22} className="summary-icon" />
          <h3 className="summary-title">Confirm Batch Order Request</h3>
        </div>

        <div className="summary-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Customer */}
          <div className="summary-section">
            <p className="summary-section-label">Customer Information</p>
            <div className="summary-row"><User size={13} /><span>{customer?.fullName || ''}</span></div>
            <div className="summary-row"><Mail size={13} /><span>{customer?.email || ''}</span></div>
            <div className="summary-row"><Phone size={13} /><span>{customer?.phone || ''}</span></div>
            <div className="summary-row"><MapPin size={13} /><span>{customer?.address || ''}</span></div>
          </div>

          {/* Items Compilation List */}
          <div className="summary-section">
            <p className="summary-section-label">Selected Products ({items.length})</p>
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
          <div className="summary-section">
            <p className="summary-section-label">Pricing Compilation</p>
            <div className="summary-row-plain total">
              <span className="sl">Est. Grand Total</span>
              <span>₱{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="summary-row-plain downpay">
              <span className="sl">50% Downpayment</span>
              <span>₱{downpay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
const OrderSuccessPage = ({ onClose, backToOrders }) => (
  <div className="success-overlay">
    <div className="success-card">
      <div className="success-icon-wrap">
        <CheckCircle2 size={48} />
      </div>
      <h2 className="success-title">Batch Requests Submitted!</h2>
      <p className="success-sub">
        Thank you! Your architectural order requests have been received. Our estimating team will contact you
        shortly to schedule your site inspection and finalize quotation blueprints.
      </p>
      <p className="success-contact">
        <Phone size={14} /> Questions? Call us at <strong>09123456789</strong>
      </p>
      <div className="success-actions">
        <button className="btn-your-orders" onClick={backToOrders}>
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
    <div className="modal-overlay" style={{ position: 'relative', top: 0, left: 0, zIndex: 999 }}>
      <div className="modal-container order-form-container" style={{ maxWidth: '950px' }} role="dialog" aria-modal="true">

        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <button className="modal-back" onClick={onBack}>
          <ArrowLeft size={15} /> Back to Cart
        </button>

        <div className="form-page">
          <div className="form-page-header">
            <h2 className="form-page-title">Place Batch Order Request</h2>
            <p className="form-page-sub">Review your contact data and selected items to compile requests.</p>
          </div>

          <div className="form-layout">
            {/* ── Left Side: Customer Info ── */}
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
                <label className="form-label">Complete Installation Address *</label>
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

            {/* ── Right Side: Dynamic Multi-product Panel Summary ── */}
            <div className="form-section order-summary-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <p className="form-section-title">
                <Package size={15} /> Batch Review ({items.length} items)
              </p>

              {/* Scrollable container if cart has many items */}
              <div className="items-scroll-review" style={{ maxHeight: '220px', overflowY: 'auto', marginBottom: '15px', paddingRight: '4px' }}>
                {items.map((item) => (
                  <div className="order-product-card" key={item.id} style={{ marginBottom: '8px', padding: '8px' }}>
                    {item.image && (
                      <img src={item.image} alt={item.name} className="order-product-img" style={{ width: '45px', height: '45px' }} />
                    )}
                    <div className="order-product-info">
                      <p className="op-name" style={{ fontSize: '13px' }}>{item.name}</p>
                      <p className="op-meta" style={{ fontSize: '11px' }}>{item.dimensions} ({item.area} sq.ft) x{item.quantity}</p>
                      <p className="op-rate" style={{ fontSize: '12px', fontWeight: 'bold' }}>₱{item.price.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="order-price-breakdown" style={{ marginTop: 'auto' }}>
                <div className="pb-row pb-total">
                  <span>Grand Estimated Total</span>
                  <span>₱{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="pb-row pb-downpay">
                  <span>50% Required Downpayment</span>
                  <span>₱{downpay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="order-inquiry" style={{ marginTop: '10px' }}>
                <Phone size={13} />
                <span>Structural inquiries support: <strong>09123456789</strong></span>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="form-submit-row">
            <button className="btn-submit-order" onClick={handleSubmit}>
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