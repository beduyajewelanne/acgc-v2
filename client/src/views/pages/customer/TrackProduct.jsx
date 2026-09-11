import React, { useState } from 'react';
import { CRUD } from 'services/data.services';
import './TrackProduct.css';

/**
 * Calculates the line total using backend fields.
 * If areaSqFt is 0, converts square inches or cm to square feet cleanly.
 */
const calcExactLineTotal = (details, docQty) => {
  const qty = parseInt(docQty) || 1;
  const rate = parseFloat(details.ratePerSqFt || details.price || 0);
  let area = parseFloat(details.areaSqFt || details.area || 0);

  // If area is 0 from backend, calculate areaSqFt based on unit dimensions
  if (area === 0) {
    const width = parseFloat(details.width) || 0;
    const height = parseFloat(details.height) || 0;
    const unit = (details.unit || 'in').toLowerCase().trim();

    if (unit === 'in' || unit === 'inch') {
      area = (width * height) / 144;
    } else if (unit === 'cm' || unit === 'centimeter') {
      area = (width * height) / 929.0304;
    } else if (unit === 'ft' || unit === 'feet') {
      area = width * height;
    }
  }

  return area * rate * qty;
};

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
          const baselineDoc = rawList[0];
          
          let processedTotalCost = 0;
          const normalizedItems = [];

          rawList.forEach(doc => {
            if (!doc.itemDetails) return;
            const details = doc.itemDetails;
            const qty = parseInt(doc.quantity) || 1;

            const computedLineTotal = calcExactLineTotal(details, qty);
            processedTotalCost += computedLineTotal;

            normalizedItems.push({
              name: details.name || "Architectural Product Placement",
              price: parseFloat(details.ratePerSqFt || details.price || 0),
              quantity: qty,
              lineTotal: computedLineTotal,
              dimensions: `${details.width}${details.unit || 'in'} x ${details.height}${details.unit || 'in'}`
            });
          });

          if (normalizedItems.length === 0) {
            setErrorMessage("No valid product properties mapped within tracking context data rows.");
            return;
          }

          const finalGrandTotal = parseFloat(baselineDoc.estimatedTotal) || processedTotalCost;
          const requiredDpAmount = finalGrandTotal * 0.5;
          const paidDpAmount = parseFloat(baselineDoc.downpaymentPaid) || 0;

          const trackingStatus = baselineDoc.status || "Pending";
          const stepsArr = ["Pending Inspection", "Downpayment Verification", "In Fabrication", "Ready for Install", "Completed"];

          let matchedStepIndex = stepsArr.findIndex(step => step.toLowerCase() === trackingStatus.toLowerCase());
          if (trackingStatus === "Pending") matchedStepIndex = 0;
          if (matchedStepIndex === -1) matchedStepIndex = trackingStatus === "Cancelled" ? -1 : 1;

          // Align Site Inspection status tracking directly from baseline fields
          const derivedInspectionStatus = baselineDoc.inspectionDate 
            ? "Done" 
            : (baselineDoc.siteInspection || ((trackingStatus === "Pending Inspection" || trackingStatus === "Pending") ? "Pending" : "Done"));

          setOrder({
            code: baselineDoc.orderId || trackingCode,
            name: normalizedItems.length > 1 ? `Batch Order (${normalizedItems.length} Products)` : normalizedItems[0].name,
            date: baselineDoc.createdAt ? new Date(baselineDoc.createdAt).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric'
            }) : "Date Unspecified",
            status: trackingStatus,
            price: `₱ ${finalGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            downpayment: `₱ ${paidDpAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            requiredDownpayment: `₱ ${requiredDpAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            siteInspection: derivedInspectionStatus,
            contractLink: baselineDoc.contractLink || "#",
            receiptLink: baselineDoc.receiptLink || "#",
            steps: stepsArr,
            currentStep: matchedStepIndex,
            items: normalizedItems
          });
        } else {
          setErrorMessage("No matching project tracking code discovered record match.");
        }
      }
    );
  };

  // Maps backend status variants into corresponding lower-case CSS utility tokens
  const getPillClass = (statusStr) => {
    if (!statusStr) return 'tp-status-pending';
    return `tp-status-${statusStr.toLowerCase().replace(/\s+/g, '-')}`;
  };

  return (
    <div className="tp-page">
      <div className="tp-hero">
        <h1>Track Your Project</h1>
        <p>Enter your tracking code to see real-time updates on your glass installation.</p>
        <form onSubmit={handleTrack} className="tp-search-box">
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
        <div className="tp-error-message-panel" style={{ textAlign: 'center', marginTop: '20px', color: '#dc3545' }}>
          <p>{errorMessage}</p>
        </div>
      )}

      {order && (
        <div className="tp-result-container" style={{ marginTop: '30px' }}>
          <h2>Order Details: {order.code}</h2>
          
          {order.status !== "Cancelled" ? (
            <div className="tp-progress-bar" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', margin: '30px 0' }}>
              {order.steps.map((step, index) => (
                <div key={index} className={`tp-step ${index <= order.currentStep ? 'tp-active' : ''}`} style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="tp-circle" style={{
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
            <div className="tp-cancelled-notice-banner" style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '15px', borderRadius: '4px', margin: '20px 0', textAlign: 'center', fontWeight: 'bold' }}>
              This project request has been Cancelled.
            </div>
          )}

          <div className="tp-order-card tp-expanded" style={{ marginTop: '20px', border: '1px solid #ddd', borderRadius: '8px', padding: '20px', background: '#fff' }}>
            <div className="tp-order-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '15px' }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0' }}>{order.name}</h3>
                <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Project ID: {order.code} • {order.date}</p>
              </div>
              {/* Contextual Status Pill Capsule */}
              <span className={`tp-status-pill ${getPillClass(order.status)}`}>
                {order.status}
              </span>
            </div>

            {/* --- Products Manifest Section --- */}
            <div className="tp-tracking-products-manifest" style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
              <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: '#555', fontSize: '14px' }}>Products inside this Tracked Request:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {order.items && order.items.map((prod, pIdx) => (
                  <div key={pIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', background: '#f9f9f9', padding: '8px 12px', borderRadius: '6px' }}>
                    <div>
                      <span style={{ fontWeight: '600', color: '#333' }}>{prod.name}</span>
                      <span style={{ color: '#888', marginLeft: '6px', fontWeight: '500' }}>x{prod.quantity}</span>
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>Size: {prod.dimensions}</div>
                    </div>
                    <span style={{ fontWeight: '600', color: '#333' }}>
                      ₱ {prod.lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="tp-order-details">
              <div className="tp-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '5px' }}>
                <div>
                  <label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '4px' }}>Grand Total Price:</label>
                  <p style={{ margin: 0, fontWeight: 'bold', color: '#28a745', fontSize: '16px' }}>{order.price}</p>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '4px' }}>Downpayment Paid:</label>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{order.downpayment}</p>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '4px' }}>Required DP (50%):</label>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{order.requiredDownpayment}</p>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '4px' }}>Site Inspection:</label>
                  <div style={{ marginTop: '2px' }}>
                    {/* Aligned Site Inspection Pill Container */}
                    <span className={`tp-status-pill ${getPillClass(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackProducts;