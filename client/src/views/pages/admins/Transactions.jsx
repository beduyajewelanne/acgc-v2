import React, { useState, useMemo, useContext, useEffect } from 'react';
import './Transactions.css';
import { CRUD } from 'services/data.services';
import { UserContext } from 'App';
import {useLocation} from 'react-router-dom'

const fmt = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const calcWarrantyDays = (endDate) => {
  if (!endDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  return diff;
};

// --- Aligned to check your actual live database pricing properties ---
const deriveStatus = (paid, total) => (Number(paid || 0) >= Number(total || 0) ? 'Paid' : 'Pending');

const INITIAL_TRANSACTIONS = [];

// ─── Contract HTML Generator ──────────────────────────────────────────────────
const generateContractHTML = (tx, accepted = false) => {
  const totalVal = Number(tx.manualOverride || tx.estimatedTotal || 0);
  const paidVal = Number(tx.totalPayment || 0);
  const status = deriveStatus(paidVal, totalVal);
  const isFullyPaid = status === 'Fully Paid';
  const remaining = totalVal - paidVal;
  const downpayment = paidVal > 0 ? paidVal : totalVal * 0.5;
  const balance = totalVal - downpayment;
  const acceptedDate = fmtDate(tx.dateCreated);

  // Derive products list
  const productText = tx.measurements && tx.measurements.length > 0 
    ? tx.measurements.map(m => m.product).join(", ") 
    : "Glass & Aluminum Products";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Contract ${tx.contractId || tx.id}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Inter',sans-serif;background:#f0f2f5;color:#1e293b;padding:32px 20px;}
  .page{max-width:680px;margin:0 auto;position:relative;}
  .contract{background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);}
  .accepted-stamp{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-18deg);z-index:10;pointer-events:none;border:4px solid rgba(22,163,74,0.55);border-radius:8px;padding:10px 28px;color:rgba(22,163,74,0.55);font-size:52px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;white-space:nowrap;line-height:1;}
  .topbar{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid #e2e8f0;background:#fff;}
  .topbar-left{display:flex;align-items:center;gap:10px;}
  .topbar-icon{width:32px;height:32px;background:#eff6ff;border-radius:6px;display:flex;align-items:center;justify-content:center;}
  .topbar-title{font-size:16px;font-weight:700;color:#0f172a;}
  .topbar-sub{font-size:12px;color:#94a3b8;font-family:'IBM Plex Mono',monospace;margin-top:1px;}
  .topbar-actions{display:flex;gap:8px;}
  .btn-action{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:7px;font-size:12.5px;font-weight:600;cursor:pointer;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;text-decoration:none;}
  .btn-action.primary{background:#1d4ed8;color:#fff;border-color:#1d4ed8;}
  .notice-bar{background:#eff6ff;border-bottom:1px solid #dbeafe;padding:10px 24px;font-size:12.5px;color:#1d4ed8;display:flex;align-items:center;gap:6px;}
  .notice-bar a{color:#1d4ed8;font-weight:600;}
  .body{padding:24px;}
  .client-row{display:flex;gap:40px;margin-bottom:20px;}
  .client-col p{font-size:12px;color:#64748b;margin-bottom:2px;}
  .client-col strong{font-size:13.5px;font-weight:600;color:#0f172a;}
  .sec-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:10px;margin-top:2px;}
  .meta-row{display:flex;gap:32px;margin-bottom:18px;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;}
  .meta-item p{font-size:11px;color:#94a3b8;margin-bottom:2px;}
  .meta-item strong{font-size:13px;font-weight:600;color:#0f172a;}
  .scope-table{width:100%;border-collapse:collapse;margin-bottom:0;font-size:12.5px;}
  .scope-table thead tr{background:#f8fafc;border-bottom:2px solid #e2e8f0;}
  .scope-table th{padding:9px 10px;text-align:left;font-size:10.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;}
  .scope-table th:last-child,.scope-table td:last-child{text-align:right;}
  .scope-table td{padding:10px 10px;border-bottom:1px solid #f1f5f9;color:#334155;vertical-align:middle;}
  .scope-table tbody tr:last-child td{border-bottom:none;}
  .scope-table .product-name{font-weight:600;color:#0f172a;margin-bottom:1px;}
  .scope-table .product-dim{font-size:11px;color:#94a3b8;}
  .total-row{display:flex;justify-content:flex-end;align-items:center;gap:16px;padding:12px 10px;border-top:2px solid #e2e8f0;margin-top:0;}
  .total-label{font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.05em;}
  .total-amount{font-size:22px;font-weight:800;color:#0f172a;font-family:'IBM Plex Mono',monospace;letter-spacing:-0.5px;}
  .scope-wrap{border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:20px;}
  .payment-box{border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin-bottom:20px;}
  .payment-box .sec-title{margin-bottom:12px;}
  .pt-row{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#475569;margin-bottom:8px;}
  .pt-row:last-child{margin-bottom:0;}
  .pt-row.dotted{border-top:1px dashed #e2e8f0;padding-top:10px;margin-top:4px;}
  .pt-label{font-weight:500;}
  .pt-amount{font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:14px;color:#1d4ed8;}
  .pt-desc{font-size:12px;color:#94a3b8;margin-bottom:12px;line-height:1.5;}
  .warranty-box{border:1px solid #dbeafe;border-radius:8px;padding:14px 16px;background:#f8fbff;margin-bottom:20px;display:flex;gap:12px;align-items:flex-start;}
  .warranty-icon{width:32px;height:32px;background:#dbeafe;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px;}
  .warranty-title{font-size:13.5px;font-weight:700;color:#1e3a5f;margin-bottom:4px;}
  .warranty-body{font-size:12.5px;color:#3b5e8a;line-height:1.6;}
  .warranty-body strong{font-weight:700;}
  .warranty-note{font-size:11.5px;color:#64748b;margin-top:6px;}
  .notes-bar{border-left:3px solid #f59e0b;background:#fffbeb;border-radius:0 6px 6px 0;padding:10px 14px;margin-bottom:20px;font-size:12.5px;color:#78350f;line-height:1.6;}
  .sig-section{margin-bottom:20px;}
  .sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:14px;}
  .sig-box{display:flex;flex-direction:column;gap:4px;}
  .sig-line{border-bottom:1.5px solid #cbd5e1;width:100%;height:40px;margin-bottom:6px;}
  .sig-label{font-size:11.5px;color:#64748b;text-align:center;}
  .sig-name{font-size:12.5px;font-weight:600;color:#0f172a;text-align:center;}
  .sig-date-row{display:flex;align-items:center;gap:8px;margin-top:4px;}
  .sig-date-label{font-size:11.5px;color:#64748b;}
  .sig-date-line{flex:1;border-bottom:1px solid #cbd5e1;}
  .sig-date-val{font-size:12px;font-weight:600;color:#0f172a;font-family:'IBM Plex Mono',monospace;}
  .sig-accepted{position:relative;}
  .sig-accepted-mark{position:absolute;bottom:8px;left:0;right:0;display:flex;flex-direction:column;align-items:center;gap:2px;}
  .sig-accepted-text{font-size:13px;font-weight:700;color:#16a34a;font-style:italic;letter-spacing:0.02em;}
  .sig-accepted-date{font-size:11px;color:#16a34a;font-family:'IBM Plex Mono',monospace;}
  .admin-note{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 14px;font-size:12px;color:#78350f;line-height:1.6;display:flex;gap:8px;align-items:flex-start;}
  .admin-note-icon{font-size:16px;flex-shrink:0;margin-top:1px;}
  .admin-note strong{color:#92400e;}
  .doc-footer{background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 24px;text-align:center;font-size:11px;color:#94a3b8;}
</style>
</head>
<body>
<div class="page">
  ${accepted ? `<div class="accepted-stamp">ACCEPTED</div>` : ''}
  <div class="contract">
    <div class="topbar">
      <div class="topbar-left">
        <div class="topbar-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        </div>
        <div>
          <div class="topbar-title">Service Contract</div>
          <div class="topbar-sub">Contract No. ${tx.contractId || tx.id}</div>
        </div>
      </div>
      <div class="topbar-actions">
        <span class="btn-action primary">&#9993; Send to Customer</span>
        <span class="btn-action">&#8659; Download PDF</span>
      </div>
    </div>

    ${tx.customerEmail ? `
    <div class="notice-bar">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      Customer has an account &middot; <a href="#">${tx.customerEmail}</a> &middot; You can send the contract directly to them.
    </div>` : ''}

    <div class="body">
      <div class="client-row">
        <div class="client-col">
          <p>Client Name</p>
          <strong>${tx.clientName || '—'}</strong>
        </div>
        <div class="client-col">
          <p>Phone</p>
          <strong>${tx.clientNumber || '—'}</strong>
        </div>
        <div class="client-col">
          <p>Address</p>
          <strong>${tx.clientAddress || '—'}</strong>
        </div>
      </div>

      <p class="sec-title">Scope of Work</p>
      <div class="meta-row">
        <div class="meta-item"><p>Site Address</p><strong>${tx.siteAddress || tx.clientAddress || '—'}</strong></div>
        <div class="meta-item"><p>Inspection Date</p><strong>${fmtDate(tx.inspectionDate || tx.dateCreated)}</strong></div>
        ${tx.estimatedInstallationDate ? `<div class="meta-item"><p>Est. Installation Date</p><strong>${fmtDate(tx.estimatedInstallationDate)}</strong></div>` : ''}
      </div>

      <div class="scope-wrap">
        <table class="scope-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Product / Description</th>
              <th>W×H (${tx.measurements?.[0]?.unit || 'cm'})</th>
              <th>QTY</th>
              <th>Rate/Sqft</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${tx.measurements && tx.measurements.length > 0 ? 
              tx.measurements.map((m, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>
                    <div class="product-name">${m.product}</div>
                    <div class="product-dim">Status: ${m.progressStatus || 'Pending'}</div>
                  </td>
                  <td style="color:#64748b;">${m.width} × ${m.height}</td>
                  <td>${m.qty || 1}</td>
                  <td style="color:#64748b;">₱${m.pricePerSqFt}</td>
                  <td style="font-family:'IBM Plex Mono',monospace;font-weight:700;">—</td>
                </tr>
              `).join('')
              : `<tr>
                  <td>1</td>
                  <td><div class="product-name">${productText}</div></td>
                  <td style="color:#64748b;">—</td>
                  <td>1</td>
                  <td style="color:#64748b;">—</td>
                  <td style="font-family:'IBM Plex Mono',monospace;font-weight:700;">${fmt(totalVal)}</td>
                </tr>`
            }
          </tbody>
        </table>
        <div class="total-row">
          <span class="total-label">Total Contract Amount</span>
          <span class="total-amount">${fmt(totalVal)}</span>
        </div>
      </div>

      <div class="payment-box">
        <p class="sec-title">Payment Terms</p>
        <p class="pt-desc">${tx.paymentTerms || '50% downpayment, 50% upon completion.'}</p>
        <div class="pt-row dotted">
          <span class="pt-label">50% Downpayment Required:</span>
          <span class="pt-amount">${fmt(downpayment)}</span>
        </div>
        <div class="pt-row">
          <span class="pt-label">Balance Upon Completion:</span>
          <span class="pt-amount">${fmt(balance)}</span>
        </div>
      </div>

      <p class="sec-title">Warranty</p>
      <div class="warranty-box">
        <div class="warranty-icon">&#128737;</div>
        <div>
          <div class="warranty-title">90-Day Warranty</div>
          <p class="warranty-body">ACGC Glass &amp; Aluminum Services provides a <strong>90-day warranty</strong> on all installed products and workmanship. The warranty period begins on the <strong>date of installation completion</strong>.</p>
          <p class="warranty-note">Warranty dates will be recorded upon installation completion.</p>
        </div>
      </div>

      ${tx.notes ? `
      <p class="sec-title">Notes &amp; Special Instructions</p>
      <div class="notes-bar">${tx.notes}</div>` : ''}

      <p class="sec-title">Client Acknowledgment</p>
      <div class="sig-grid">
        <div class="sig-box ${accepted ? 'sig-accepted' : ''}">
          <div class="sig-line">${accepted ? `<svg viewBox="0 0 200 50" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;"><path d="M10,40 Q30,10 50,30 T90,20 T130,35 T170,15 T195,28" stroke="#16a34a" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>` : ''}</div>
          <div class="sig-label">Client Signature &amp; Printed Name</div>
          <div class="sig-name">${tx.clientName}</div>
          <div class="sig-date-row">
            <span class="sig-date-label">Date:</span>
            <div class="sig-date-line"></div>
            ${accepted ? `<span class="sig-date-val">${acceptedDate}</span>` : ''}
          </div>
          ${accepted ? `
          <div class="sig-accepted-mark">
            <span class="sig-accepted-text">✓ Electronically Accepted</span>
            <span class="sig-accepted-date">${acceptedDate}</span>
          </div>` : ''}
        </div>
        <div class="admin-note">
          <span class="admin-note-icon">&#9888;</span>
          <div><strong>Admin Note:</strong> This contract is officially issued by ACGC Glass &amp; Aluminum Services Administration. The admin signature is implicit upon generation and distribution of this document.</div>
        </div>
      </div>
    </div>

    <div class="doc-footer">
      Generated on ${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })} &nbsp;&middot;&nbsp; ${tx.contractId || tx.id} &nbsp;&middot;&nbsp; ACGC Glass &amp; Aluminum Services
    </div>
  </div>
</div>
</body>
</html>`;
};

const downloadContract = (tx, accepted = false) => {
  const html = generateContractHTML(tx, accepted);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tx.contractId || tx.id}${accepted ? '-ACCEPTED' : ''}.html`;
  a.click();
  URL.revokeObjectURL(url);
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const StatusBadge = ({ paid, total }) => {
  const status = deriveStatus(paid, total);
  return status === 'Paid' ? (
    <span className="badge-paid">✓ Fully Paid</span>
  ) : (
    <span className="badge-pending">⏳ Pending</span>
  );
};

const CategoryBadge = ({ category }) => {
  const map = {
    'Completed Project': 'cat-completed',
    'Completed': 'cat-completed',
    'Contract': 'cat-contract',
    'Warranty': 'cat-warranty',
    'In Progress': 'cat-contract'
  };
  return <span className={`cat-badge ${map[category] || ''}`}>{category}</span>;
};

const SummaryCard = ({ icon, label, value, color }) => (
  <div className={`summary-card summary-${color}`}>
    <div className="summary-icon-wrap">{icon}</div>
    <div>
      <p className="summary-label">{label}</p>
      <p className="summary-value">{value}</p>
    </div>
  </div>
);

const Avatar = ({ name }) => (
  <div className="avatar">{(name || 'U').charAt(0).toUpperCase()}</div>
);

// ─── Contract Modal ──────────────────────────────────────────────────────────
const ContractModal = ({ tx, onClose }) => {
  const totalVal = Number(tx.manualOverride || tx.estimatedTotal || 0);
  const paidVal = Number(tx.totalPayment || 0);
  const accepted = deriveStatus(paidVal, totalVal) === 'Fully Paid';
  if (!tx) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box contract-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <p className="modal-eyebrow">Contract Document</p>
            <h2 className="modal-title">{tx.contractId || tx.id}</h2>
            <p className="modal-sub">{tx.clientName} — {tx.measurements?.[0]?.product || 'Glass Project'}</p>
          </div>
          {accepted && (
            <span className="contract-accepted-badge">✓ Accepted</span>
          )}
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="contract-iframe-wrap" style={{ width: '100%', height: '100%', position: 'relative' }}>
          {(() => {
            // 1. Construct the absolute link cleanly
            const fileUrl = window.base_api.replace('/api/', '') + tx.contractLink;
            
            // 2. Perform a robust regex type validation check
            const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(tx.contractLink);

            if (isImage) {
              return (
                <img
                  src={fileUrl}
                  alt={`Contract ${tx.contractId || tx.id}`}
                  className="contract-iframe" // Inherits your existing modal dimensions perfectly
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'contain', 
                    background: '#f8fafc',
                    display: 'block'
                  }}
                />
              );
            } else {
              return (
                <object
                  data={fileUrl}
                  type="application/pdf"
                  className="contract-iframe"
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    display: 'block',
                    border: 'none'
                  }}
                >
                  {/* Fallback if the browser completely blocks nested objects */}
                  <div style={{ padding: '20px', textAlign: 'center', fontSize: '14px', color: '#64748b' }}>
                    <p style={{ marginBottom: '12px' }}>Unable to preview PDF directly in this view.</p>
                    <a 
                      href={fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn-download"
                      style={{ display: 'inline-flex', textDecoration: 'none', padding: '8px 16px' }}
                    >
                      Open PDF in New Tab
                    </a>
                  </div>
                </object>
              );
            }
          })()}
        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Close</button>
          {/* <button className="btn-download" onClick={() => downloadContract(tx, accepted)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download Contract
          </button> */}
        </div>
      </div>
    </div>
  );
};

// ─── View Modal ──────────────────────────────────────────────────────────────
// FEATURES ADDED: Dynamic multiple measurement list iteration within identical view bounds 
const ViewModal = ({ tx, onClose, onViewContract }) => {
  if (!tx) return null;
  const totalVal = Number(tx.manualOverride || tx.estimatedTotal || 0);
  const paidVal = Number(tx.totalPayment || 0);
  const remaining = totalVal - paidVal;
  const status = deriveStatus(paidVal, totalVal);
  const warrantyDays = calcWarrantyDays(tx.warrantyEnd);
  const warrantyExpired = warrantyDays !== null && warrantyDays < 0;

  // Compile combined text label
  const productsCombined = tx.measurements && tx.measurements.length > 0 
    ? tx.measurements.map(m => m.product).join(", ") 
    : "Glass Fitting";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <p className="modal-eyebrow">Transaction Details</p>
            <h2 className="modal-title">{tx.clientName}</h2>
            <p className="modal-sub">{tx.contractId || tx.id}</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="view-status-row">
            {tx.status == "Paid" ?
            <span className="badge-paid">✓ Fully Paid</span> :
            <span className="badge-pending">⏳ Pending</span>
            }
            <CategoryBadge category={tx.category} />
            <span className="type-chip">{tx.customerHasAccount ? '🌐 Website Order' : '🚶 Walk-in'}</span>
          </div>

          <div className="view-grid-1">
            <InfoSection title="Client Information">
              <InfoRow label="Full Name" value={tx.clientName} />
              <InfoRow label="Email" value={tx.customerEmail} />
              <InfoRow label="Phone" value={tx.clientNumber} />
              <InfoRow label="Address" value={tx.clientAddress} />
            </InfoSection>
          </div>

          {/* Iterate over all internal measurement instances inside UI bounds */}
          {tx.measurements && tx.measurements.length > 0 && (
            <InfoSection title="Measurements & Progress Matrix">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px 0' }}>
                {tx.measurements.map((m, index) => (
                  <div key={m.id || index} style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', marginBottom: '4px' }}>
                      <span>{m.product}</span>
                      <span style={{ color: '#1d4ed8' }}>{m.progressStatus}</span>
                    </div>
                    <div style={{ color: '#64748b', fontSize: '12px' }}>
                      Size: {m.width}W × {m.height}H {m.unit || 'cm'} | Qty: {m.qty || 1} | Base Rate: ₱{m.pricePerSqFt}/sqft
                    </div>
                  </div>
                ))}
              </div>
            </InfoSection>
          )}

          <InfoSection title="Payment Breakdown">
            <div className="payment-rows">
              <PayRow label="Total Project Amount" value={fmt(totalVal)} />
              <PayRow label="Amount Paid" value={fmt(paidVal)} color="green" />
              <div className="pay-divider" />
              <PayRow label="Remaining Balance" value={fmt(remaining)} color={remaining > 0 ? 'red' : 'green'} bold />
            </div>
            <div className="progress-wrap">
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${Math.min((paidVal / (totalVal || 1)) * 100, 100)}%` }} />
              </div>
              <span className="progress-pct">{Math.round((paidVal / (totalVal || 1)) * 100)}% paid</span>
            </div>
          </InfoSection>

          <InfoSection title="Payment Information">
            <InfoRow label="Payment Terms" value={tx.paymentTerms} />
            {tx.transactionNumber && (
              <InfoRow label="Transaction Number" value={tx.transactionNumber} mono />
            )}
            <InfoRow label="Payment Date" value={fmtDate(tx.paymentDate)} />
          </InfoSection>

          <InfoSection title="Contract Information">
            <InfoRow label="Contract No." value={tx.contractId || tx.id} mono />
            <InfoRow label="Date Created" value={fmtDate(tx.dateCreated)} />
            <InfoRow label="Inspection Date" value={fmtDate(tx.inspectionDate)} />
          </InfoSection>

          {(tx.category === 'Warranty' || tx.estimatedInstallationDate) && (
            <InfoSection title="Warranty Information">
              <InfoRow
                label="Warranty Start"
                value={fmtDate(tx.warrantyStart || tx.estimatedInstallationDate)}
              />

              <InfoRow
                label="Warranty End"
                value={fmtDate(
                  new Date(
                    new Date(tx.warrantyStart || tx.estimatedInstallationDate)
                      .setDate(new Date(tx.warrantyStart || tx.estimatedInstallationDate).getDate() + 90)
                  )
                )}
              />

              <div className="warranty-days-row">
                <span className="info-label">Remaining Warranty Days</span>

                {tx.estimatedInstallationDate ? (
                  (() => {
                    const days = Math.ceil(
                      (
                        new Date(
                          new Date(tx.warrantyStart || tx.estimatedInstallationDate)
                            .setDate(new Date(tx.warrantyStart || tx.estimatedInstallationDate).getDate() + 90)
                        ) - new Date()
                      ) / (1000 * 60 * 60 * 24)
                    );

                    return days < 0 ? (
                      <span className="warranty-expired">
                        Expired ({Math.abs(days)} days ago)
                      </span>
                    ) : (
                      <span className="warranty-active">
                        {days} days remaining
                      </span>
                    );
                  })()
                ) : (
                  <span className="info-value">—</span>
                )}
              </div>
            </InfoSection>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Close</button>
          <button className="btn-contract-view" onClick={() => { onClose(); onViewContract(tx); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            View Contract
          </button>
          {/* <button className="btn-download" onClick={() => downloadContract(tx)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download
          </button> */}
        </div>
      </div>
    </div>
  );
};

const InfoSection = ({ title, children }) => (
  <div className="info-section">
    <p className="info-section-title">{title}</p>
    {children}
  </div>
);

const InfoRow = ({ label, value, mono, color }) => (
  <div className="info-row">
    <span className="info-label">{label}</span>
    <span className={`info-value ${mono ? 'mono' : ''} ${color ? `color-${color}` : ''}`}>{value || '—'}</span>
  </div>
);

const PayRow = ({ label, value, color, bold }) => (
  <div className={`pay-row ${bold ? 'pay-row-bold' : ''}`}>
    <span className="pay-label">{label}</span>
    <span className={`pay-value ${color ? `color-${color}` : ''}`}>{value}</span>
  </div>
);

// ─── Edit Modal ──────────────────────────────────────────────────────────────
const EditModal = ({ tx, onClose, onSave }) => {
  const totalVal = Number(tx.manualOverride || tx.estimatedTotal || 0);
  const paidVal = Number(tx.totalPayment || 0);
  const isLocked = deriveStatus(paidVal, totalVal) === 'Fully Paid';
  
  const [paid, setPaid] = useState(String(paidVal));
  const [method, setMethod] = useState(tx.paymentMethod || 'Cash');
  const [txnNum, setTxnNum] = useState(tx.transactionNumber || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = () => {
    const paidNum = parseFloat(paid);
    if (isNaN(paidNum) || paidNum < 0) { setError('Please enter a valid amount paid.'); return; }
    if (paidNum > totalVal) { setError('Amount paid cannot exceed the total project amount.'); return; }
    
    setSaving(true);
    
    // Construct payload parameters for the live connected endpoint request
    const payloadFields = {
      orderId: tx.orderId || tx.id, // Fallback gracefully depending on grouping key structures
      paymentMethod: method,
      totalPayment: paidNum,
      transactionNumber: method === 'Online' ? txnNum : ''
    };

    // Forward the built details payload parameters directly to the parent runner
    onSave(tx.id, payloadFields, () => {
      setSaving(false);
      onClose();
    }, (errMessage) => {
      setSaving(false);
      setError(errMessage || 'Failed to update transaction payment records.');
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <p className="modal-eyebrow">Edit Payment</p>
            <h2 className="modal-title">{tx.clientName}</h2>
            <p className="modal-sub">{tx.measurements?.[0]?.product || 'Glass Project'}</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {isLocked ? (
            <div className="locked-notice">
              <span className="lock-icon">🔒</span>
              <div>
                <p className="locked-title">Transaction Locked</p>
                <p className="locked-desc">This transaction is fully paid and cannot be modified.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="edit-notice">
                <span>ℹ️</span>
                <p>You may update the amount paid, payment method, and transaction number.</p>
              </div>

              {error && <div className="edit-error">⚠️ {error}</div>}

              <div className="field-group">
                <label className="field-label">Amount Paid (₱)</label>
                <input
                  type="number"
                  className="field-input"
                  value={paid}
                  min="0"
                  max={totalVal}
                  onChange={(e) => { setPaid(e.target.value); setError(''); }}
                  placeholder="0.00"
                />
                <p className="field-hint">Total project amount: {fmt(totalVal)}</p>
              </div>

              <div className="field-group">
                <label className="field-label">Payment Method</label>
                <div className="radio-row">
                  {['Cash', 'Online'].map((opt) => (
                    <label key={opt} className={`radio-card ${method === opt ? 'radio-active' : ''}`}>
                      <input type="radio" name="method" value={opt} checked={method === opt} onChange={() => setMethod(opt)} />
                      <span>{opt === 'Cash' ? '💵' : '💳'}</span>
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {method === 'Online' && (
                <div className="field-group field-animate">
                  <label className="field-label">Transaction Number <span className="optional-tag">Optional</span></label>
                  <input
                    type="text"
                    className="field-input mono"
                    value={txnNum}
                    onChange={(e) => setTxnNum(e.target.value)}
                    placeholder="e.g. TXN-20240101-0001"
                  />
                </div>
              )}

              <div className="status-preview">
                <span className="status-preview-label">Payment Status Preview</span>
                {tx.status == "Paid" ?
                <span className="badge-paid">✓ Fully Paid</span> :
                <span className="badge-pending">⏳ Pending</span>
                }
              </div>

              <div className="balance-preview">
                <span>Remaining Balance</span>
                <strong className={(totalVal - (Number(paid) || 0)) > 0 ? 'color-red' : 'color-green'}>
                  {fmt(totalVal - (Number(paid) || 0))}
                </strong>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          {!isLocked && (
            <button className="btn-save" onClick={handleSave} disabled={saving}>
              {saving ? <span className="spinner" /> : null}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────
const Transactions = () => {
  const location = useLocation()
  const { user, permissions } = useContext(UserContext); 
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [viewTx, setViewTx] = useState(null);
  const [editTx, setEditTx] = useState(null);
  const [contractTx, setContractTx] = useState(null);

  useEffect(() => {
    if (user && user.token !== "") {
      fetchTransactions(user);  
    }
  }, [user]);

  useEffect(() => {
    if(location.state){
      setViewTx(location.state.tx)
    }
  },[location])

  function fetchTransactions(user){
    const token = user.token;
    if (!token) return;

    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: user.token, user_id: user._id })
    };

    const api_url = window.base_api + "get_transactions";
    CRUD(api_url, requestOptions, (res) => {
      if (res && res.remarks === "success") {
        setTransactions(res.payload);
      } else {
        setTransactions([]);
      }
    });
  }

  const summary = useMemo(() => {
    return transactions.reduce(
      (acc, t) => {
        const totalAmount = Number(t.manualOverride || t.estimatedTotal || 0);
        const paidAmount = Number(t.totalPayment || 0);

        acc.revenue += totalAmount;
        acc.collected += paidAmount;
        acc.pending += totalAmount - paidAmount;
        if (deriveStatus(paidAmount, totalAmount) === 'Fully Paid') acc.completed++;
        return acc;
      },
      { revenue: 0, collected: 0, pending: 0, completed: 0 }
    );
  }, [transactions]);

  const filtered = useMemo(() => {
    let list = [...transactions];
    if (filter === 'Completed Projects') {
      list = list.filter((t) => t.category === 'Completed Project' || t.category === 'Completed');
    } else if (filter === 'Contract & Warranties') {
      list = list.filter((t) => t.category === 'Contract' || t.category === 'Warranty' || t.category === 'In Progress');
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => {
        const nameMatch = t.clientName?.toLowerCase().includes(q);
        const contractMatch = t.contractId?.toLowerCase().includes(q) || t.id?.toLowerCase().includes(q);
        const productMatch = t.measurements?.some(m => m.product?.toLowerCase().includes(q));
        return nameMatch || contractMatch || productMatch;
      });
    }
    return list;
  }, [transactions, filter, search]);

const handleSave = (id, updates, onSuccess, onError) => {
    if (!user || !user.token) {
      if (onError) onError("Session invalid. Please reload and login again.");
      return;
    }

    // Assemble the complete secure context request options frame
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: user.token,
        user_id: user._id,
        orderId: updates.orderId, // Target unique clustering field index parameters
        paymentMethod: updates.paymentMethod,
        totalPayment: updates.totalPayment,
        transactionNumber: updates.transactionNumber
      })
    };

    const api_url = window.base_api + "edit_payment";

    // Direct data connection via user-defined service instance context
    CRUD(api_url, requestOptions, (res) => {
      if (res && res.remarks === "success") {
        
        // Match conditions based on threshold target calculations
        setTransactions((prev) =>
          prev.map((t) => {
            if (t.id === id) {
              const totalVal = Number(t.manualOverride || t.estimatedTotal || 0);
              const isPaidNow = updates.totalPayment >= totalVal;
              
              return { 
                ...t, 
                totalPayment: updates.totalPayment,
                paymentMethod: updates.paymentMethod,
                transactionNumber: updates.transactionNumber,
                paymentStatus: isPaidNow ? "Paid" : "Pending"
              };
            }
            return t;
          })
        );

        if (onSuccess) onSuccess();
      } else {
        if (onError) onError(res?.message || "An error occurred while writing modifications.");
      }
    });
  };

  const FILTERS = ['All', 'Completed Projects', 'Contract & Warranties'];

  return (
    <div className="page-root">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transaction Management</h1>
          <p className="page-sub">
            Financial records are auto-generated from Site Inspection &amp; Progress Monitoring modules.
          </p>
        </div>
      </div>

      <div className="summary-grid">
        <SummaryCard icon="💰" label="Total Revenue" value={fmt(summary.revenue)} color="blue" />
        <SummaryCard icon="✅" label="Total Collected" value={fmt(summary.collected)} color="green" />
        <SummaryCard icon="⏳" label="Pending Balance" value={fmt(summary.pending)} color="amber" />
        <SummaryCard icon="🏗️" label="Completed Projects" value={summary.completed} color="purple" />
      </div>

      <div className="controls-bar">
        <div className="filter-group">
          {FILTERS.map((f) => (
            <button key={f} className={`filter-btn ${filter === f ? 'filter-active' : ''}`} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
        <div className="search-box">
          <span className="search-ico">🔍</span>
          <input
            className="search-input"
            placeholder="Search client, product, contract…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <p className="record-count">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</p>

      <div className="table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Client</th>
                <th>Product / Project</th>
                <th>Paid / Total</th>
                <th>Method</th>
                <th>Customer Type</th>
                <th>Install Date</th>
                <th>Category</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="empty-cell">
                    <div className="empty-state">
                      <span className="empty-icon">📭</span>
                      <p>No records found for this filter.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((t, i) => {
                  const totalAmount = Number(t.manualOverride || t.estimatedTotal || 0);
                  const paidAmount = Number(t.totalPayment || 0);
                  const isFullyPaid = deriveStatus(paidAmount, totalAmount) === 'Fully Paid';
                  
                  // Extract dynamic measurement product title text
                  const productDisplay = t.measurements && t.measurements.length > 0 
                    ? t.measurements.map(m => m.product).join(", ") 
                    : "Glass Fitting";

                  return (
                    <tr key={t.id} className="data-row">
                      <td className="col-num">{i + 1}</td>
                      <td>
                        <div className="client-cell">
                          <Avatar name={t.clientName} />
                          <div>
                            <p className="client-name">{t.clientName || '—'}</p>
                            <p className="client-email">{t.customerEmail || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="product-name">{productDisplay}</p>
                        <p className="contract-num">{t.contractId || t.id}</p>
                      </td>
                      <td>
                        <p className="col-paid">{fmt(paidAmount)}</p>
                        <p className="col-total">of {fmt(totalAmount)}</p>
                      </td>
                      <td>
                        <span className={`method-chip ${t.paymentMethod === 'Online' ? 'chip-online' : 'chip-cash'}`}>
                          {t.paymentMethod === 'Online' ? '💳 Online' : '💵 Cash'}
                        </span>
                      </td>
                      <td>
                        <span className="type-chip">
                          {t.customerHasAccount ? '🌐 Website Order' : '🚶 Walk-in'}
                        </span>
                      </td>
                      <td className="col-date">{fmtDate(t.estimatedInstallationDate)}</td>
                      <td><CategoryBadge category={t.category} /></td>
                      <td>
                        {t.status == "Paid" ?
                        <span className="badge-paid">✓ Fully Paid</span> :
                        <span className="badge-pending">⏳ Pending</span>
                        }
                      </td>
                      <td>
                        <div className="action-group">
                          <button className="action-btn btn-edit" onClick={() => setViewTx(t)} title="View Details" hidden={permissions?.modules?.["Transactions"]?.["View Details"] !== 1}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                          </button>
                          <button
                            className={`action-btn btn-edit ${isFullyPaid ? 'btn-locked' : ''}`}
                            onClick={() => !isFullyPaid && setEditTx(t)}
                            disabled={isFullyPaid}
                            title={isFullyPaid ? 'Locked — fully paid' : 'Edit Payment'}
                          >
                            {isFullyPaid
                              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            }
                          </button>
                          <button className="action-btn btn-contract" onClick={() => setContractTx(t)} title="View/Download Contract" hidden={permissions?.modules?.["Transactions"]?.["Edit"] !== 1}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewTx && <ViewModal tx={viewTx} onClose={() => setViewTx(null)} onViewContract={setContractTx} />}
      {editTx && <EditModal tx={editTx} onClose={() => setEditTx(null)} onSave={handleSave} />}
      {contractTx && <ContractModal tx={contractTx} onClose={() => setContractTx(null)} />}
    </div>
  );
};

export default Transactions;