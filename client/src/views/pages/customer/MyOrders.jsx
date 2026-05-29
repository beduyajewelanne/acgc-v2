import React, { useState, useEffect, useContext } from 'react';
import { CRUD } from 'services/data.services';
import { UserContext } from 'App';
import './MyOrders.css';

// Absolute clean local financial numbers presentation formatter
const fmtCurrency = (num) => '₱ ' + (Number(num) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MyOrders = () => {
  const { user } = useContext(UserContext);
  const [orders, setOrders] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

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
          setOrders(res.payload);
        }
      }
    );
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

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

  // Maps backend data keys into precise lower-case normalized tokens for style sheet lookup matches
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
            const orderIdKey = order.id || order.orderId;
            
            // Extracts explicit values directly from your payload object structures 
            // instead of miscalculating line subtotals manually on client runtimes.
            const totalOrderCost = parseFloat(order.estimatedTotal) || 0;
            const downpaymentPaid = parseFloat(order.downpaymentPaid) || 0;
            const requiredDP = parseFloat(order.requiredDownpayment) || (totalOrderCost * 0.5);

            return (
              <div className={`order-card ${expandedId === orderIdKey ? 'expanded' : ''}`} key={orderIdKey}>
                <div className="order-header" onClick={() => toggleExpand(orderIdKey)} style={{ cursor: 'pointer' }}>
                  <div>
                    <h3>{order.name}</h3>
                    <p>ID: {order.orderId} • {order.date}</p>
                  </div>
                  {/* Primary Order Status Pill */}
                  <span className={`status-pill ${getPillClass(order.status)}`}>
                    {order.status || 'Pending'}
                  </span>
                </div>

                {expandedId === orderIdKey && (
                  <div className="order-details">
                    
                    <div className="order-items-summary" style={{ marginBottom: '20px', background: '#f9f9f9', padding: '15px', borderRadius: '6px' }}>
                      <p style={{ fontWeight: '600', margin: '0 0 10px 0', fontSize: '14px', color: '#444' }}>Products inside this Tracked Request:</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(order.items || []).map((prod, pIdx) => (
                          <div key={pIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid #eee', paddingBottom: '6px' }}>
                            <div>
                              <span style={{ fontWeight: '600', color: '#2c3e50' }}>{prod.name}</span>
                              <span style={{ color: '#888', marginLeft: '6px', fontSize: '12px' }}>x{prod.quantity}</span>
                              <div style={{ fontSize: '11px', color: '#7f8c8d', marginTop: '2px' }}>Size: {prod.dimensions || `${prod.width}${prod.unit} x ${prod.height}${prod.unit}`}</div>
                            </div>
                            <span style={{ fontWeight: '600', color: '#34495e' }}>
                              {fmtCurrency(prod.lineTotal)}
                            </span>
                          </div>
                        ))}
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
                        <label>DOWNPAYMENT PAID:</label> 
                        <p style={{ fontWeight: '500', margin: '4px 0 0 0' }}>{fmtCurrency(downpaymentPaid)}</p>
                      </div>
                      <div>
                        <label>REQUIRED DP (50%):</label> 
                        <p style={{ fontWeight: '500', margin: '4px 0 0 0' }}>{fmtCurrency(requiredDP)}</p>
                      </div>
                      <div>
                        <label>SITE INSPECTION:</label> 
                        <div style={{ marginTop: '4px' }}>
                          {/* Site Inspection Status Pill instead of raw text strings */}
                          <span className={`status-pill ${getPillClass(order.status)}`}>
                            {order.status || 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="order-links" style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {order.contractLink && order.contractLink !== '#' && <a href={order.contractLink} className="link-btn" target="_blank" rel="noreferrer">View Contract</a>}
                      {order.receiptLink && order.receiptLink !== '#' && <a href={order.receiptLink} className="link-btn" target="_blank" rel="noreferrer">View Receipt</a>}
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

                    <div className="upload-section" style={{ marginTop: '20px', borderTop: '1px dashed #ddd', paddingTop: '15px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', marginBottom: '5px' }}>Upload Proof of Payment (Optional):</label>
                      <input type="file" className="file-input" multiple />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MyOrders;