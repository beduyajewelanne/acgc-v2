import React, { useState } from 'react';
import './Receipts.css'; 

const Receipts = () => {
  const [receipts] = useState([
    {
      id: "REC-2026-001",
      projectName: "Office Glass Partition Installation",
      amount: "₱ 12,500.00",
      date: "May 20, 2026",
      pdfUrl: "/path-to-receipt.pdf"
    },
    {
      id: "REC-2026-002",
      projectName: "Custom Mirror Frame",
      amount: "₱ 3,200.00",
      date: "May 15, 2026",
      pdfUrl: "/path-to-receipt-2.pdf"
    }
  ]);

  return (
    <div className="receipts-container">
      <h2 style={{ marginBottom: '25px', fontWeight: '500' }}>My Receipts</h2>
      
      {receipts.length > 0 ? (
        <div className="receipts-list">
          {receipts.map((receipt) => (
            <div className="receipt-card" key={receipt.id}>
              <div className="receipt-main">
                <h3>{receipt.projectName}</h3>
                <p>Receipt ID: {receipt.id} &nbsp;•&nbsp; Date: {receipt.date}</p>
                <span className="amount-badge">{receipt.amount}</span>
              </div>

              <div className="receipt-actions">
                <button 
                  className="btn btn-view" 
                  onClick={() => window.open(receipt.pdfUrl, '_blank')}
                >
                  View Receipt
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>You don't have any receipts at the moment.</p>
        </div>
      )}
    </div>
  );
};

export default Receipts;