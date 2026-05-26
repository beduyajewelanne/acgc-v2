import React, { useState } from 'react';
import './MyOrders.css';

const MyOrders = () => {
  const [orders] = useState([
    { 
      id: "ACGC-MOTQ0BX6", 
      name: "Aluminum Window Frame Profile", 
      date: "May 6, 2026", 
      status: "Pending",
      price: "₱ 12,500.00",
      downpayment: "₱ 3,000.00",
      requiredDownpayment: "₱ 5,000.00",
      siteInspection: "Pending", // "Done" or "Pending"
      measurements: "120cm x 150cm",
      contractLink: "#",
      receiptLink: "#"
    }
  ]);

  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="orders-container">
      <h2>My Orders</h2>

      <div className="contact-panel">
        <p><strong>Need faster confirmation?</strong><br/>
        Call us at <strong>+63 912 345 6789</strong> to confirm your order and schedule site inspection.</p>
      </div>

      <div className="orders-list">
        {orders.map((order) => (
          <div className={`order-card ${expandedId === order.id ? 'expanded' : ''}`} key={order.id}>
            <div className="order-header" onClick={() => toggleExpand(order.id)} style={{ cursor: 'pointer' }}>
              <div>
                <h3>{order.name}</h3>
                <p>ID: {order.id} • {order.date}</p>
              </div>
              <span className={`badge ${order.status.toLowerCase()}`}>{order.status}</span>
            </div>

            {expandedId === order.id && (
              <div className="order-details">
                <div className="detail-grid">
                  <div><label>Total Price:</label> <p>{order.price}</p></div>
                  <div><label>Downpayment Paid:</label> <p>{order.downpayment}</p></div>
                  <div><label>Required DP:</label> <p>{order.requiredDownpayment}</p></div>
                  <div><label>Site Inspection:</label> <p className={order.siteInspection.toLowerCase()}>{order.siteInspection}</p></div>
                  <div><label>Measurements:</label> <p>{order.measurements}</p></div>
                </div>

                <div className="order-links">
                  <a href={order.contractLink} className="link-btn">View Contract</a>
                  <a href={order.receiptLink} className="link-btn">View Receipt</a>
                </div>

                <div className="upload-section">
                  <label>Upload Proof of Payment (Optional):</label>
                  <input type="file" className="file-input" multiple />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyOrders;