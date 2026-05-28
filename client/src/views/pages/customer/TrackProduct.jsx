import React, { useState } from 'react';
import { CRUD } from 'services/data.services';
import './TrackProduct.css';

const TrackProducts = () => {
  const [trackingCode, setTrackingCode] = useState('');
  const [order, setOrder] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleTrack = (e) => {
    e.preventDefault();
    if (!trackingCode.trim()) return;

    setErrorMessage('');
    setOrder(null);

    const apiUri = (window.base_api || `http://localhost:5000/api/`).replace('/api/', '') + `/api/test_cart_endpoint/${encodeURIComponent(trackingCode.trim())}`;

    CRUD(
      apiUri,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      },
      (res) => {
        const rawList = res?.payload || res || [];
        
        if (Array.isArray(rawList) && rawList.length > 0) {
          const dbOrder = rawList[0];
          const details = dbOrder.itemDetails || {};
          const cost = parseFloat(details.estimatedCost) || 0;
          const requiredDpAmount = cost * 0.5;
          const paidDpAmount = parseFloat(dbOrder.downpaymentPaid) || 0;

          const dimensionString = (details.width && details.height) 
            ? `${details.width}${details.unit} x ${details.height}${details.unit}` 
            : "Base Configuration Dimensions";

          const trackingStatus = dbOrder.status || "Pending";
          
          const stepsArr = [
            "Pending Inspection", 
            "Downpayment Verification", 
            "In Fabrication", 
            "Ready for Install", 
            "Completed"
          ];

          let matchedStepIndex = stepsArr.findIndex(
            step => step.toLowerCase() === trackingStatus.toLowerCase()
          );

          if (trackingStatus === "Pending") {
            matchedStepIndex = 0;
          }

          if (matchedStepIndex === -1) {
            if (trackingStatus === "Cancelled") {
              matchedStepIndex = -1;
            } else {
              matchedStepIndex = 1; 
            }
          }

          setOrder({
            code: dbOrder.orderId || trackingCode,
            name: details.name || "Architectural Product Placement",
            date: dbOrder.createdAt ? new Date(dbOrder.createdAt).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric'
            }) : "Date Unspecified",
            status: trackingStatus,
            price: `₱ ${cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            downpayment: `₱ ${paidDpAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            requiredDownpayment: `₱ ${requiredDpAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            siteInspection: (trackingStatus === "Pending Inspection" || trackingStatus === "Pending") ? "Pending" : "Done",
            measurements: dimensionString,
            contractLink: dbOrder.contractLink || "#",
            receiptLink: dbOrder.receiptLink || "#",
            steps: stepsArr,
            currentStep: matchedStepIndex
          });
        } else {
          setErrorMessage("No matching project tracking code discovered record match.");
        }
      }
    );
  };

  return (
    <div className="track-page">
      <div className="track-hero">
        <h1>Track Your Project</h1>
        <p>Enter your tracking code to see real-time updates on your glass installation.</p>
        
        <form onSubmit={handleTrack} className="search-box">
          <input 
            type="text" 
            placeholder="e.g. TRK-2024-001" 
            value={trackingCode}
            onChange={(e) => setTrackingCode(e.target.value)}
          />
          <button type="submit">Track Order</button>
        </form>
      </div>

      {errorMessage && (
        <div className="error-message-panel" style={{ textAlign: 'center', marginTop: '20px', color: '#dc3545' }}>
          <p>{errorMessage}</p>
        </div>
      )}

      {order && (
        <div className="result-container" style={{ marginTop: '30px' }}>
          <h2>Order Details: {order.code}</h2>
          
          {order.status !== "Cancelled" ? (
            <div className="progress-bar" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', margin: '30px 0' }}>
              {order.steps.map((step, index) => (
                <div key={index} className={`step ${index <= order.currentStep ? 'active' : ''}`} style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="circle" style={{
                    width: '30px', height: '30px', borderRadius: '50%', lineHeight: '30px', margin: '0 auto 10px',
                    background: index <= order.currentStep ? '#28a745' : '#ccc', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center'
                  }}>
                    {index + 1}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: index === order.currentStep ? 'bold' : 'normal', display: 'block', maxWidth: '90px', wordWrap: 'break-word' }}>{step}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="cancelled-notice-banner" style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '15px', borderRadius: '4px', margin: '20px 0', textAlign: 'center', fontWeight: 'bold' }}>
              This project request has been Cancelled.
            </div>
          )}

          <div className="order-card expanded" style={{ marginTop: '20px', border: '1px solid #ddd', borderRadius: '8px', padding: '20px', background: '#fff' }}>
            <div className="order-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '15px' }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0' }}>{order.name}</h3>
                <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Project ID: {order.code} • {order.date}</p>
              </div>
              <span className={`badge ${order.status.toLowerCase().replace(/\s+/g, '-')}`} style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                {order.status}
              </span>
            </div>

            <div className="order-details">
              <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                <div><label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '4px' }}>Total Price:</label> <p style={{ margin: 0, fontWeight: 'bold' }}>{order.price}</p></div>
                <div><label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '4px' }}>Downpayment Paid:</label> <p style={{ margin: 0, fontWeight: 'bold' }}>{order.downpayment}</p></div>
                <div><label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '4px' }}>Required DP:</label> <p style={{ margin: 0, fontWeight: 'bold' }}>{order.requiredDownpayment}</p></div>
                <div><label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '4px' }}>Site Inspection:</label> <p className={order.siteInspection.toLowerCase()} style={{ margin: 0, fontWeight: 'bold' }}>{order.siteInspection}</p></div>
                <div><label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '4px' }}>Measurements:</label> <p style={{ margin: 0, fontWeight: 'bold' }}>{order.measurements}</p></div>
              </div>

              {/* <div className="order-links" style={{ display: 'flex', gap: '10px' }}>
                <a href={order.contractLink} className="link-btn" style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: '4px', textDecoration: 'none', color: '#333', fontSize: '14px' }}>View Contract</a>
                <a href={order.receiptLink} className="link-btn" style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: '4px', textDecoration: 'none', color: '#333', fontSize: '14px' }}>View Receipt</a>
              </div> */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackProducts;