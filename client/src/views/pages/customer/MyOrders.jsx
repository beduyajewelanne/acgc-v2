import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { CRUD } from 'services/data.services';
import { UserContext } from 'App';
import './MyOrders.css';

const fmtCurrency = (num) => '₱ ' + (Number(num) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const calcProductLineTotal = (prod) => {
  const w = parseFloat(prod.width) || 0;
  const h = parseFloat(prod.height) || 0;
  const rate = parseFloat(prod.ratePerSqFt) || parseFloat(prod.pricePerSqFt) || parseFloat(prod.rate) || 0;
  const qty = parseInt(prod.quantity) || parseInt(prod.qty) || 1;

  if (w === 0 || h === 0 || rate === 0) return parseFloat(prod.lineTotal) || 0;

  const unitStr = String(prod.unit || 'in').toLowerCase().trim();

  let widthInFeet = w;
  let heightInFeet = h;

  if (unitStr === 'in' || unitStr === 'inch' || unitStr === 'inches') {
    widthInFeet = w / 12;
    heightInFeet = h / 12;
  } else if (unitStr === 'm' || unitStr === 'meter' || unitStr === 'meters') {
    widthInFeet = w * 3.28084;
    heightInFeet = h * 3.28084;
  } else if (unitStr === 'cm' || unitStr === 'centimeter') {
    widthInFeet = w / 30.48;
    heightInFeet = h / 30.48;
  }

  const sqFt = widthInFeet * heightInFeet;
  return sqFt * rate * qty;
};

const OrderFeedbackModal = ({ order, user, onClose, onSuccess }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError("Please provide a reason or comment for your feedback.");
      return;
    }

    setError('');
    setSubmitting(true);
    
    const apiUri = (window.base_api || "http://localhost:5000/api/") + "submit_feedback";
    const firstItem = (order.items && order.items[0]) ? order.items[0] : {};
    
    const payload = {
      token: user.token,
      userId: user._id,
      userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || "Customer",
      orderId: order.orderId || order.id,
      productId: firstItem._id || firstItem.id || firstItem.productId || null,
      productName: firstItem.name || order.productName || order.name || "", 
      productCategory: firstItem.category || order.category || "Completed Project",
      rating: rating,
      comment: comment,
      isApprovedByAdmin: 0
    };

    CRUD(
      apiUri,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      },
      (res) => {
        setSubmitting(false);
        if (res && res.remarks === 'success') {
          order.feedback = comment;
          order.rating = rating;
          order.isFeedbackSubmitted = true;
          onSuccess(order.orderId || order.id, rating, comment);
          onClose();
          return;
        }

        const alreadySubmitted = /already submitted/i.test(res?.message || '');
        if (alreadySubmitted) {
          order.isFeedbackSubmitted = true;
          onSuccess(order.orderId || order.id, order.rating || rating, order.feedback || comment);
          onClose();
          return;
        }

        setError(res?.message || "Failed to submit feedback. Please try again.");
      }
    );
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', maxWidth: '420px', width: '90%', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Leave Customer Feedback</h3>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
          How was your experience with <strong>{order.name || order.orderId}</strong>?
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#444', marginBottom: '6px' }}>Rating (1 to 5 Stars):</label>
            <div style={{ display: 'flex', gap: '8px', cursor: 'pointer' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  onClick={() => setRating(star)}
                  style={{ fontSize: '24px', color: star <= rating ? '#f59e0b' : '#cbd5e1', transition: 'color 0.2s' }}
                >
                  ★
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#444', marginBottom: '6px' }}>Reason / Details:</label>
            <textarea
              rows={4}
              placeholder="Write your feedback or review comments here..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              style={{ width: '100%', padding: '8px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            />
            {error && <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '6px' }}>{error}</p>}
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{ padding: '8px 16px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const parseJsonSafe = (res) => {
  return res.text().then((text) => {
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch { data = null; }
    }
    if (data) return data;
    return res.ok
      ? { remarks: 'success' }
      : { remarks: 'error', message: `Server error (${res.status}). Please try again.` };
  });
};

const PaymentProofSection = ({ order, user, onUpdate, isFullyPaid, balanceRemaining }) => {
  const [file, setFile] = useState(null);
  const [declaredAmount, setDeclaredAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0] || null);
    setError('');
  };

  const uploadProofIfSelected = (cleanBase) => {
    if (!file) return Promise.resolve(null);

    const formData = new FormData();
    formData.append('proofFile', file);
    formData.append('token', user.token);
    formData.append('userId', user._id);
    formData.append('orderId', order.orderId || order.id);

    return fetch(`${cleanBase}/upload_payment_proof`, { method: 'POST', body: formData })
      .then(parseJsonSafe)
      .then((res) => {
        if (res && res.remarks === 'success') {
          return res.payload?.paymentProofLink || res.paymentProofLink || null;
        }
        throw new Error(res?.message || 'Failed to upload proof of payment.');
      });
  };
  const notifyPaid = (cleanBase, amountNum) => {
    const payload = {
      token: user.token,
      userId: user._id,
      orderId: order.orderId || order.id,
      declaredAmount: amountNum
    };

    return fetch(`${cleanBase}/notify_payment_sent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(parseJsonSafe)
      .then((res) => {
        if (res && res.remarks === 'success') return true;
        throw new Error(res?.message || 'Failed to notify admin. Please try again.');
      });
  };

  const resetForm = () => {
    setFile(null);
    setDeclaredAmount('');
    setError('');
    setFormOpen(false);
  };

  const handleSubmitPaid = () => {
    const amountNum = parseFloat(declaredAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter how much you paid so admin can confirm it.');
      return;
    }
    if (balanceRemaining > 0 && amountNum > balanceRemaining + 1) {
      setError(`That's more than your remaining balance of ${fmtCurrency(balanceRemaining)}. Please double-check the amount.`);
      return;
    }

    setSubmitting(true);
    setError('');

    const cleanBase = (window.base_api || "http://localhost:5000/api/").replace(/\/$/, '');

    uploadProofIfSelected(cleanBase)
      .then((proofLink) => notifyPaid(cleanBase, amountNum).then(() => proofLink))
      .then((proofLink) => {
        setSubmitting(false);
        const patch = { paymentNotifiedByCustomer: true, declaredPaymentAmount: amountNum };
        if (proofLink) patch.paymentProofLink = proofLink;
        onUpdate(order.orderId || order.id, patch);
        resetForm();
      })
      .catch((err) => {
        setSubmitting(false);
        setError(err.message || 'Something went wrong. Please try again.');
      });
  };

  const isPendingConfirmation = !!order.paymentNotifiedByCustomer;
  const canDeclarePayment = !isFullyPaid && !isPendingConfirmation;
  const hasMismatch = order.lastPaymentMatchedDeclaration === false;

  return (
    <div className="upload-section" style={{ marginTop: '20px', borderTop: '1px dashed #ddd', paddingTop: '15px' }}>
      <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '8px' }}>Proof of Payment</label>

      {order.paymentProofLink && (
        <p style={{ fontSize: '13px', marginBottom: '12px' }}>
          <a href={window.base_api.replace('/api/', '') + order.paymentProofLink} target="_blank" rel="noreferrer" style={{ color: '#1d4ed8', fontWeight: '600' }}>
            📎 View your last uploaded proof
          </a>
        </p>
      )}

      {isFullyPaid ? (
        <div className="payment-status-banner confirmed">✓ Fully paid and confirmed. Thank you!</div>
      ) : isPendingConfirmation ? (
        <div className="payment-status-banner pending">
          ⏳ We've notified admin that you paid <strong>{fmtCurrency(order.declaredPaymentAmount)}</strong>. This is pending confirmation — we'll notify you here once it's verified.
        </div>
      ) : !formOpen ? (
        <button
          className="link-btn"
          onClick={() => setFormOpen(true)}
          style={{ padding: '9px 18px', fontSize: '13px', backgroundColor: '#28a745', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          I've Already Paid
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '6px' }}>
              How much did you pay? <span style={{ fontWeight: 400, color: '#94a3b8' }}>(required)</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 5000.00"
              value={declaredAmount}
              onChange={(e) => { setDeclaredAmount(e.target.value); setError(''); }}
              disabled={submitting}
              className="declared-amount-input"
              autoFocus
            />
            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
              Admin will confirm this amount on their end once received.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label className="file-choose-btn">
              Choose File <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '11px' }}>(optional)</span>
              <input type="file" className="file-input-hidden" accept="image/*,.pdf" onChange={handleFileChange} disabled={submitting} />
            </label>
            {file && <span className="file-chosen-name">{file.name}</span>}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="link-btn"
              onClick={handleSubmitPaid}
              disabled={submitting}
              style={{ padding: '9px 18px', fontSize: '13px', backgroundColor: '#28a745', color: '#fff', border: 'none', cursor: submitting ? 'default' : 'pointer' }}
            >
              {submitting ? 'Submitting...' : 'Submit Payment Info'}
            </button>
            <button
              className="link-btn"
              onClick={resetForm}
              disabled={submitting}
              style={{ padding: '9px 18px', fontSize: '13px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', cursor: submitting ? 'default' : 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {hasMismatch && (
        <div className="payment-status-banner mismatch">
          ⚠️ You declared {fmtCurrency(order.lastDeclaredAmount)}, but admin recorded {fmtCurrency(order.lastConfirmedIncrement)} for that payment. If this looks wrong, please call us at <strong>+63 912 345 6789</strong> to sort it out.
        </div>
      )}

      {error && <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '8px' }}>{error}</p>}
    </div>
  );
};

const MyOrders = () => {
  const location = useLocation();
  const { user, permissions } = useContext(UserContext);
  const isFeedbackAllowed = 
  permissions?.modules?.["Client"]?.["Can upload feedback"] === 1 ||
  permissions?.modules?.["Client"]?.["Can Upload/View Feedback"] === 1 ||
  permissions?.modules?.["Client"]?.["Customer Feedback"] === 1;
  const [orders, setOrders] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [feedbackModalOrder, setFeedbackModalOrder] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const feedbackCacheKey = `submittedFeedback_${user?._id || 'guest'}`;

  useEffect(() => {
    if (location.state?.highlightOrderId) {
      const id = location.state.highlightOrderId;
      setExpandedId(id);
      setHighlightId(id);

      const scrollTimer = setTimeout(() => {
        document
          .querySelector(`[data-order-row="${id}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
      const clearTimer = setTimeout(() => setHighlightId(null), 4000);

      return () => {
        clearTimeout(scrollTimer);
        clearTimeout(clearTimer);
      };
    }
  }, [location.state]);

  const getFeedbackCache = () => {
    try {
      return JSON.parse(localStorage.getItem(feedbackCacheKey)) || {};
    } catch {
      return {};
    }
  };

  const saveFeedbackToCache = (orderId, rating, comment) => {
    const cache = getFeedbackCache();
    cache[orderId] = { rating, comment };
    localStorage.setItem(feedbackCacheKey, JSON.stringify(cache));
  };

  const fetchOrders = () => {
    if (!user || !user.token) return;

    const apiUri = (window.base_api || `http://localhost:5000/api/`).replace('/api/', '') + '/api/get_my_orders';
    const payload = {
      token: user.token,
      userId: user._id
    };

    CRUD(
      apiUri,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      },
      (res) => {
        if (res && res.remarks === 'success' && Array.isArray(res.payload)) {
          const cache = getFeedbackCache();
          const merged = res.payload.map((o) => {
            const key = o.orderId || o.id;
            const cached = cache[key];
            if (cached && !o.isFeedbackSubmitted) {
              return { ...o, isFeedbackSubmitted: true, rating: o.rating || cached.rating, feedback: o.feedback || cached.comment };
            }
            return o;
          });
          setOrders(merged);
        }
      }
    );
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const handleFeedbackSuccess = (orderId, rating, comment) => {
    saveFeedbackToCache(orderId, rating, comment);
    setOrders(prev => prev.map(o =>
      (o.orderId === orderId || o.id === orderId)
        ? { ...o, feedback: comment, rating: rating, isFeedbackSubmitted: true }
        : o
    ));
  };

  const handleOrderPatch = (orderId, patch) => {
    setOrders(prev => prev.map(o =>
      (o.orderId === orderId || o.id === orderId) ? { ...o, ...patch } : o
    ));
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleCancelOrder = (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order request?")) return;

    const apiUri = (window.base_api || `http://localhost:5000/api/`).replace('/api/', '') + '/api/cancel_order_request';
    const payload = {
      token: user.token,
      userId: user._id,
      order_id: orderId
    };

    CRUD(
      apiUri,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      },
      (res) => {
        if (res && res.remarks === 'success') {
          alert("Order request canceled successfully!");
          setOrders(prev => prev.filter(order => order.id !== orderId));
          if (expandedId === orderId) setExpandedId(null);
        } else {
          alert(res?.message || "Failed to cancel the order request.");
        }
      }
    );
  };

  const getPillClass = (statusStr) => {
    if (!statusStr) return 'status-pending';
    return `status-${statusStr.toLowerCase().replace(/\s+/g, '-')}`;
  };

  return (
    <div className="orders-container">
      <h2>My Orders</h2>

      <div className="contact-panel">
        <p><strong>Need faster confirmation?</strong><br/>
        Call us at <strong>+63 912 345 6789</strong> to confirm your order and schedule site inspection.</p>
      </div>

      <div className="orders-list">
        {orders.length === 0 ? (
          <div className="order-card" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            <p>You have no active order requests matching your account.</p>
          </div>
        ) : (
          orders.map((order) => {
            const orderIdKey = order.orderId;
            const totalOrderCost = (parseFloat(order.manualOverride) > 0 ? parseFloat(order.manualOverride) : parseFloat(order.estimatedTotal)) || 0;
            const amountPaid = parseFloat(order.totalPayment) || 0;
            const isFullPaymentTerm = String(order.paymentTerms || '').trim() === 'Full payment';
            const balanceRemaining = Math.max(totalOrderCost - amountPaid, 0);
            const isFullyPaid = totalOrderCost > 0 && amountPaid >= totalOrderCost;

            return (
              <div
                className={`order-card ${expandedId === orderIdKey ? 'expanded' : ''}`}
                key={orderIdKey}
                data-order-row={orderIdKey}
                style={orderIdKey === highlightId ? { backgroundColor: '#fef9c3', transition: 'background-color 1s ease' } : undefined}
              >
                <div className="order-header" onClick={() => toggleExpand(orderIdKey)} style={{ cursor: 'pointer' }}>
                  <div>
                    <h3>{order.name}</h3>
                    <p>ID: {order.orderId} • {order.date}</p>
                  </div>
                  <span className={`status-pill ${getPillClass(order.status)}`}>
                    {order.status || 'Pending'}
                  </span>
                </div>

                {expandedId === orderIdKey && (
                  <div className="order-details">
                    <div className="order-items-summary" style={{ marginBottom: '20px', background: '#f9f9f9', padding: '15px', borderRadius: '6px' }}>
                      <p style={{ fontWeight: '600', margin: '0 0 10px 0', fontSize: '14px', color: '#444' }}>Products inside this Tracked Request:</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(order.items || []).map((prod, pIdx) => {
                          const calculatedLinePrice = calcProductLineTotal(prod);

                          return (
                            <div key={pIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid #eee', paddingBottom: '6px' }}>
                              <div>
                                <span style={{ fontWeight: '600', color: '#2c3e50' }}>{prod.name}</span>
                                <span style={{ color: '#888', marginLeft: '6px', fontSize: '12px' }}>x{prod.quantity || prod.qty || 1}</span>
                                <div style={{ fontSize: '11px', color: '#7f8c8d', marginTop: '2px' }}>
                                  Size: {prod.dimensions || `${prod.width || 0}${prod.unit || 'in'} x ${prod.height || 0}${prod.unit || 'in'}`}
                                  {prod.ratePerSqFt && ` (@ ${fmtCurrency(prod.ratePerSqFt)}/sqft)`}
                                </div>
                              </div>
                              <span style={{ fontWeight: '600', color: '#34495e' }}>
                                {fmtCurrency(calculatedLinePrice)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="detail-grid">
                      <div>
                        <label>GRAND TOTAL PRICE:</label>
                        <p className="total-highlight-green" style={{ fontWeight: 'bold', fontSize: '18px', color: '#27ae60', margin: '4px 0 0 0' }}>
                          {fmtCurrency(totalOrderCost)}
                        </p>
                      </div>
                      <div>
                        <label>{isFullPaymentTerm ? 'AMOUNT PAID (FULL PAYMENT):' : 'DOWNPAYMENT PAID:'}</label>
                        <p style={{ fontWeight: '500', margin: '4px 0 0 0' }}>{fmtCurrency(amountPaid)}</p>
                      </div>
                      <div>
                        <label>BALANCE:</label>
                        {isFullyPaid ? (
                          <p style={{ fontWeight: '600', margin: '4px 0 0 0', color: '#16a34a' }}>✅ Fully Paid</p>
                        ) : (
                          <p style={{ fontWeight: '500', margin: '4px 0 0 0' }}>{fmtCurrency(balanceRemaining)}</p>
                        )}
                      </div>
                      <div>
                        <label>SITE INSPECTION:</label>
                        <div style={{ marginTop: '4px' }}>
                          <span className={`status-pill ${getPillClass(order.status)}`}>
                            {order.status || 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="order-links" style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {order.contractLink && order.contractLink !== '#' && <a href={window.base_api.replace('/api/', '') + order.contractLink} className="link-btn" target="_blank" rel="noreferrer">View Contract</a>}
                      {order.receiptLink && order.receiptLink !== '#' && <a href={order.receiptLink} className="link-btn" target="_blank" rel="noreferrer">View Receipt</a>}
                    
                      {(order.feedback || order.rating || order.isFeedbackSubmitted) ? (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          backgroundColor: '#f0fdf4',
                          color: '#16a34a',
                          border: '1px solid #bbf7d0',
                          padding: '8px 14px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '600'
                        }}>
                          <span>✓ Feedback Submitted</span>
                          <span style={{ color: '#f59e0b', fontSize: '12px' }}>
                            ({'★'.repeat(order.rating || 5)})
                          </span>
                        </div>
                      ) : order.installationCompleted ? (
                        !isFeedbackAllowed ? (
                          <div style={{ marginTop: '10px', fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                            Feedback submission is currently unavailable.
                          </div>
                        ) : (
                          <button
                            onClick={() => setFeedbackModalOrder(order)}
                            className="link-btn"
                            style={{ backgroundColor: '#28a745', color: '#fff', border: 'none', cursor: 'pointer', padding: '8px 16px', borderRadius: '4px', fontWeight: '600' }}
                          >
                            ★ Leave Feedback / Review
                          </button>
                        )
                      ) : (
                        (order.status === "Completed" || order.status === "Completed Project" || order.status === "Paid") && (
                          <div style={{ marginTop: '10px', fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                            Feedback will be available once installation is completed.
                          </div>
                        )
                      )}

                      {(order.status === "Pending" || order.status === "Pending Inspection" || order.is_cancelledAllowed === 1) && (
                        <button
                          onClick={() => handleCancelOrder(orderIdKey)}
                          className="link-btn cancel-action-btn"
                          style={{ backgroundColor: '#dc3545', color: '#fff', border: 'none', cursor: 'pointer', padding: '8px 16px', borderRadius: '4px' }}
                          disabled={order.status !== "Pending" && order.is_cancelledAllowed !== 1}
                        >
                          Cancel Request
                        </button>
                      )}
                    </div>

                    <PaymentProofSection order={order} user={user} onUpdate={handleOrderPatch} isFullyPaid={isFullyPaid} balanceRemaining={balanceRemaining} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {feedbackModalOrder && (
        <OrderFeedbackModal
          order={feedbackModalOrder}
          user={user}
          onClose={() => setFeedbackModalOrder(null)}
          onSuccess={handleFeedbackSuccess}
        />
      )}
    </div>
  );
};

export default MyOrders;