import React, { useState } from 'react';
import './Contracts.css';

const Contracts = () => {
  const [contract, setContract] = useState({
    id: "CONT-2026-001",
    projectName: "Office Glass Partition Installation",
    status: "Pending Approval",
    date: "May 25, 2026"
  });

  const confirmAction = (action) => {
    if (window.confirm(`Finalize action: ${action} this contract?`)) {
      setContract(prev => ({ ...prev, status: action === 'Approve' ? 'Approved' : 'Declined' }));
    }
  };

  return (
    <div className="contracts-container">
      <h2 style={{ marginBottom: '25px', fontWeight: '500' }}>Contract Agreements</h2>
      
      <div className="contract-card">
        <div className="contract-main">
        <h3>{contract.projectName}</h3>
        <p>Contract ID: {contract.id} &nbsp;•&nbsp; Effective: {contract.date}</p>
         <span className={`status-badge ${contract.status.toLowerCase().replace(' ', '-')}`}>
            {contract.status}
          </span>
        </div>

        <div className="contract-actions">
          <button className="btn btn-view">View Document</button>
          {contract.status === 'Pending Approval' && (
            <>
              <button className="btn btn-approve" onClick={() => confirmAction('Approve')}>Approve</button>
              <button className="btn btn-decline" onClick={() => confirmAction('Decline')}>Decline</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Contracts;