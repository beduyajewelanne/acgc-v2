import React, { useState } from 'react';
import { CRUD } from 'services/data.services';
import './TrackProduct.css';

/**
 * Parses a dimensions string, converts measurements to feet, 
 * and calculates the true square footage line total.
 */
const calcTrueLineTotal = (width, height, unit, rate, quantity) => {
  const w = parseFloat(width) || 0;
  const h = parseFloat(height) || 0;
  const pRate = parseFloat(rate) || 0;
  const qty = parseInt(quantity) || 1;
  const currentUnit = (unit || 'in').toLowerCase().trim();

  // Convert unit values safely to feet
  const convertToFeet = (val) => {
    if (currentUnit === 'ft' || currentUnit === 'feet') return val;
    if (currentUnit === 'm' || currentUnit === 'meter') return val * 3.28084;
    if (currentUnit === 'cm' || currentUnit === 'centimeter') return val / 30.48;
    return val / 12; // Fallback defaults to inches ('in')
  };

  const widthInFt = convertToFeet(w);
  const heightInFt = convertToFeet(h);
  const sqFtArea = widthInFt * heightInFt;

  return sqFtArea * pRate * qty;
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
          const condensedItemsMap = {};

          rawList.forEach(doc => {
            if (!doc.itemDetails) return;
            const details = doc.itemDetails;
            
            const nameKey = details.name || "Architectural Product Placement";
            const width = details.width || '';
            const height = details.height || '';
            const unit = details.unit || 'in';
            const itemUniqueId = `${nameKey}-${width}-${height}`;

            const basePrice = parseFloat(details.pricePerSqFt || details.price || details.estimatedCost) || 0;
            const qty = parseInt(doc.quantity) || 1;

            // Calculate true total by factoring in the Square Footage Area
            const computedRowTotal = calcTrueLineTotal(width, height, unit, basePrice, qty);

            if (condensedItemsMap[itemUniqueId]) {
              condensedItemsMap[itemUniqueId].quantity += qty;
              // Accumulate dynamically recalculating via current aggregate qty total
              condensedItemsMap[itemUniqueId].lineTotal += computedRowTotal;
            } else {
              condensedItemsMap[itemUniqueId] = {
                name: nameKey,
                price: basePrice,
                quantity: qty,
                lineTotal: computedRowTotal,
                dimensions: (width && height) ? `${width}${unit} x ${height}${unit}` : "Base Configuration Dimensions",
                area: details.areaSqFt || details.area || 0
              };
            }
          });

          const normalizedItems = Object.values(condensedItemsMap);

          if (normalizedItems.length === 0) {
            setErrorMessage("No valid product properties mapped within tracking context data rows.");
            return;
          }

          // Compute matching accurate total balances across aggregated list values
          const totalCost = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0);
          const requiredDpAmount = totalCost * 0.5;
          const paidDpAmount = parseFloat(baselineDoc.downpaymentPaid) || 0;

          const trackingStatus = baselineDoc.status || "Pending";
          
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
            code: baselineDoc.orderId || trackingCode,
            name: normalizedItems.length > 1 ? `Batch Order (${normalizedItems.length} Products)` : normalizedItems[0].name,
            date: baselineDoc.createdAt ? new Date(baselineDoc.createdAt).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric'
            }) : "Date Unspecified",
            status: trackingStatus,
            price: `₱ ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            downpayment: `₱ ${paidDpAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            requiredDownpayment: `₱ ${requiredDpAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            siteInspection: (trackingStatus === "Pending Inspection" || trackingStatus === "Pending") ? "Pending" : "Done",
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

            {/* --- Products Manifest Section --- */}
            <div className="tracking-products-manifest" style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
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
                      ₱{prod.lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="order-details">
              <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '5px' }}>
                <div><label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '4px' }}>Grand Total Price:</label> <p style={{ margin: 0, fontWeight: 'bold', color: '#28a745' }}>{order.price}</p></div>
                <div><label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '4px' }}>Downpayment Paid:</label> <p style={{ margin: 0, fontWeight: 'bold' }}>{order.downpayment}</p></div>
                <div><label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '4px' }}>Required DP (50%):</label> <p style={{ margin: 0, fontWeight: 'bold' }}>{order.requiredDownpayment}</p></div>
                <div><label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '4px' }}>Site Inspection:</label> <p className={order.siteInspection.toLowerCase()} style={{ margin: 0, fontWeight: 'bold' }}>{order.siteInspection}</p></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackProducts;