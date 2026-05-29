import React, { useState, useEffect, useContext } from 'react';
import { CRUD } from 'services/data.services';
import { UserContext } from 'App';
import './MyOrders.css';

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
          orders.map((order) => (
            <div className={`order-card ${expandedId === order.id ? 'expanded' : ''}`} key={order.id}>
              <div className="order-header" onClick={() => toggleExpand(order.id)} style={{ cursor: 'pointer' }}>
                <div>
                  <h3>{order.name}</h3>
                  <p>ID: {order.orderId} • {order.date}</p>
                </div>
                <span className={`badge ${order.status.toLowerCase().replace(/\s+/g, '-')}`}>{order.status}</span>
              </div>

              {expandedId === order.id && (
                <div className="order-details">
                  
                  {/* --- NEW SECTION: Displaying multiple items inside this order --- */}
                  <div className="order-items-summary" style={{ marginBottom: '15px', background: '#f9f9f9', padding: '10px', borderRadius: '6px' }}>
                    <p style={{ fontWeight: '600', margin: '0 0 8px 0', fontSize: '14px', color: '#444' }}>Products inside this Order:</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {order.items && order.items.map((prod, pIdx) => (
                        <div key={pIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>
                          <div>
                            <span style={{ fontWeight: '500' }}>{prod.name}</span>
                            <span style={{ color: '#888', marginLeft: '6px' }}>x{prod.quantity}</span>
                            <div style={{ fontSize: '11px', color: '#666' }}>Size: {prod.dimensions}</div>
                          </div>
                          {/* Correctly displays total cost for this line item (Price x Quantity) */}
                          <span style={{ fontWeight: '500' }}>
                            ₱{prod.lineTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="detail-grid">
                    <div><label>Grand Total Price:</label> <p style={{ fontWeight: 'bold', color: '#2ecc71' }}>{order.price}</p></div>
                    <div><label>Downpayment Paid:</label> <p>{order.downpayment}</p></div>
                    <div><label>Required DP (50%):</label> <p>{order.requiredDownpayment}</p></div>
                    <div><label>Site Inspection:</label> <p className={order.siteInspection.toLowerCase()}>{order.siteInspection}</p></div>
                  </div>

                  <div className="order-links" style={{ marginTop: '15px' }}>
                    <a href={order.contractLink} className="link-btn">View Contract</a>
                    <a href={order.receiptLink} className="link-btn">View Receipt</a>
                    {(order.status === "Pending" || order.status === "Pending Inspection" || order.is_cancelledAllowed === 1) && (
                      <button 
                        onClick={() => handleCancelOrder(order.id)} 
                        className="link-btn" 
                        style={{ backgroundColor: '#dc3545', color: '#fff', border: 'none', cursor: 'pointer' }}
                        disabled={order.status !== "Pending"}
                      >
                        Cancel Request
                      </button>
                    )}
                  </div>

                  <div className="upload-section" style={{ marginTop: '15px' }}>
                    <label>Upload Proof of Payment (Optional):</label>
                    <input type="file" className="file-input" multiple />
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyOrders;