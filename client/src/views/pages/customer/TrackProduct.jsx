import React, { useState } from 'react';
import './TrackProduct.css';

const TrackProducts = () => {
  const [trackingCode, setTrackingCode] = useState('');
  const [order, setOrder] = useState(null); 

  const handleTrack = (e) => {
    e.preventDefault();
    // Simulate API call result
    setOrder({
      code: trackingCode,
      status: "In Fabrication",
      steps: ["Order Placed", "In Fabrication", "Ready for Install"],
      currentStep: 1 
    });
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

      {order && (
        <div className="result-container">
          <h2>Order Details: {order.code}</h2>
          <div className="progress-bar">
            {order.steps.map((step, index) => (
              <div key={index} className={`step ${index <= order.currentStep ? 'active' : ''}`}>
                <div className="circle">{index + 1}</div>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default TrackProducts;