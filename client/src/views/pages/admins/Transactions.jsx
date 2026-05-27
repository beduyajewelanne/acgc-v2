import React, { useState, useMemo } from 'react';
import './Transactions.css';

const fmt = (n) => `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
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

const deriveStatus = (paid, total) => (paid >= total ? 'Fully Paid' : 'Pending');

const INITIAL_TRANSACTIONS = [
  {
    id: 1,
    client: 'John Reyes',
    email: 'john.reyes@email.com',
    phone: '0917-123-4567',
    address: '123 Rizal Ave, Olongapo City',
    product: 'Glass Partition System',
    paid: 45000,
    total: 45000,
    paymentMethod: 'Cash',
    txnNumber: '',
    customerType: 'Walk-in',
    category: 'Completed Project',
    installDate: '2024-03-15',
    contractNo: 'CTR-2024-001',
    contractStart: '2024-03-15',
    contractEnd: '2025-03-15',
    warrantyStart: '2024-03-15',
    warrantyEnd: '2026-03-15',
    notes: 'Tempered glass, powder-coated aluminum frame, 3-panel sliding system.',
  },
  {
    id: 2,
    client: 'Jane Dela Cruz',
    email: 'jane.dc@gmail.com',
    phone: '0922-987-6543',
    address: '45 Magsaysay Drive, Olongapo City',
    product: 'Frameless Shower Enclosure',
    paid: 12000,
    total: 24000,
    paymentMethod: 'Online',
    txnNumber: 'TXN-20240420-8821',
    customerType: 'Website Order',
    category: 'Contract',
    installDate: '2024-04-20',
    contractNo: 'CTR-2024-002',
    contractStart: '2024-04-20',
    contractEnd: '2025-04-20',
    warrantyStart: '2024-04-20',
    warrantyEnd: '2026-04-20',
    notes: '10mm tempered glass, chrome hinges, custom 90×180cm.',
  },
  {
    id: 3,
    client: 'Carlos Mendoza',
    email: 'cmendoza@business.ph',
    phone: '0908-555-1234',
    address: '78 National Highway, Subic, Zambales',
    product: 'Aluminum Sliding Window (×8)',
    paid: 32000,
    total: 32000,
    paymentMethod: 'Cash',
    txnNumber: '',
    customerType: 'Walk-in',
    category: 'Completed Project',
    installDate: '2024-02-28',
    contractNo: 'CTR-2024-003',
    contractStart: '2024-02-28',
    contractEnd: '2025-02-28',
    warrantyStart: '2024-02-28',
    warrantyEnd: '2025-02-28',
    notes: '8 units aluminum sliding windows, double-track, mesh included.',
  },
  {
    id: 4,
    client: 'Maria Santos',
    email: 'maria.santos@yahoo.com',
    phone: '0933-444-5678',
    address: '12 Gordons Ave, Olongapo City',
    product: 'Storefront Glass Door System',
    paid: 18000,
    total: 55000,
    paymentMethod: 'Online',
    txnNumber: 'TXN-20240510-3345',
    customerType: 'Website Order',
    category: 'Contract',
    installDate: '2024-05-10',
    contractNo: 'CTR-2024-004',
    contractStart: '2024-05-10',
    contractEnd: '2025-05-10',
    warrantyStart: '2024-05-10',
    warrantyEnd: '2026-05-10',
    notes: 'Full-height tempered glass storefront, panic bar hardware.',
  },
  {
    id: 5,
    client: 'Ramon Bautista',
    email: 'rbautista@mail.com',
    phone: '0912-777-3456',
    address: '5 Harbor Point, Subic Bay',
    product: 'Aluminum Curtain Wall',
    paid: 88000,
    total: 88000,
    paymentMethod: 'Online',
    txnNumber: 'TXN-20231105-9901',
    customerType: 'Website Order',
    category: 'Warranty',
    installDate: '2023-11-05',
    contractNo: 'CTR-2023-022',
    contractStart: '2023-11-05',
    contractEnd: '2024-11-05',
    warrantyStart: '2023-11-05',
    warrantyEnd: '2025-11-05',
    notes: 'Commercial curtain wall, 12 panels, thermally broken profiles.',
  },
  {
    id: 6,
    client: 'Liza Fernandez',
    email: 'liza.f@email.ph',
    phone: '0919-321-8765',
    address: '90 Bonifacio St, Olongapo City',
    product: 'Glass Balustrade Railing',
    paid: 0,
    total: 28000,
    paymentMethod: 'Cash',
    txnNumber: '',
    customerType: 'Walk-in',
    category: 'Contract',
    installDate: '2024-06-01',
    contractNo: 'CTR-2024-005',
    contractStart: '2024-06-01',
    contractEnd: '2025-06-01',
    warrantyStart: '2024-06-01',
    warrantyEnd: '2026-06-01',
    notes: 'Stainless post with 12mm tempered glass infill, 15 linear meters.',
  },
  {
    id: 7,
    client: 'Nico Aquino',
    email: 'nico.aquino@ph.com',
    phone: '0928-654-9012',
    address: '33 Kalayaan St, Olongapo City',
    product: 'Folding Door System',
    paid: 19500,
    total: 19500,
    paymentMethod: 'Cash',
    txnNumber: '',
    customerType: 'Walk-in',
    category: 'Warranty',
    installDate: '2023-08-22',
    contractNo: 'CTR-2023-015',
    contractStart: '2023-08-22',
    contractEnd: '2024-08-22',
    warrantyStart: '2023-08-22',
    warrantyEnd: '2025-08-22',
    notes: '4-panel folding door, powder-coated, frosted glass inserts.',
  },
];

// ─── Contract HTML Generator ──────────────────────────────────────────────────
const generateContractHTML = (tx, accepted = false) => {
  const status = deriveStatus(tx.paid, tx.total);
  const isFullyPaid = status === 'Fully Paid';
  const remaining = tx.total - tx.paid;
  const downpayment = tx.paid > 0 ? tx.paid : tx.total * 0.5;
  const balance = tx.total - downpayment;
  const acceptedDate = fmtDate(tx.contractStart);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Contract ${tx.contractNo}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Inter',sans-serif;background:#f0f2f5;color:#1e293b;padding:32px 20px;}
  .page{max-width:680px;margin:0 auto;position:relative;}
  .contract{background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);}

  /* Accepted watermark */
  .accepted-stamp{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-18deg);z-index:10;pointer-events:none;border:4px solid rgba(22,163,74,0.55);border-radius:8px;padding:10px 28px;color:rgba(22,163,74,0.55);font-size:52px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;white-space:nowrap;line-height:1;}

  /* Top bar */
  .topbar{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid #e2e8f0;background:#fff;}
  .topbar-left{display:flex;align-items:center;gap:10px;}
  .topbar-icon{width:32px;height:32px;background:#eff6ff;border-radius:6px;display:flex;align-items:center;justify-content:center;}
  .topbar-title{font-size:16px;font-weight:700;color:#0f172a;}
  .topbar-sub{font-size:12px;color:#94a3b8;font-family:'IBM Plex Mono',monospace;margin-top:1px;}
  .topbar-actions{display:flex;gap:8px;}
  .btn-action{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:7px;font-size:12.5px;font-weight:600;cursor:pointer;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;text-decoration:none;}
  .btn-action.primary{background:#1d4ed8;color:#fff;border-color:#1d4ed8;}

  /* Account notice */
  .notice-bar{background:#eff6ff;border-bottom:1px solid #dbeafe;padding:10px 24px;font-size:12.5px;color:#1d4ed8;display:flex;align-items:center;gap:6px;}
  .notice-bar a{color:#1d4ed8;font-weight:600;}

  /* Body */
  .body{padding:24px;}

  /* Client info row */
  .client-row{display:flex;gap:40px;margin-bottom:20px;}
  .client-col p{font-size:12px;color:#64748b;margin-bottom:2px;}
  .client-col strong{font-size:13.5px;font-weight:600;color:#0f172a;}

  /* Section heading */
  .sec-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:10px;margin-top:2px;}

  /* Meta row */
  .meta-row{display:flex;gap:32px;margin-bottom:18px;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;}
  .meta-item p{font-size:11px;color:#94a3b8;margin-bottom:2px;}
  .meta-item strong{font-size:13px;font-weight:600;color:#0f172a;}

  /* Scope table */
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

  /* Scope wrapper */
  .scope-wrap{border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:20px;}

  /* Payment terms */
  .payment-box{border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin-bottom:20px;}
  .payment-box .sec-title{margin-bottom:12px;}
  .pt-row{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#475569;margin-bottom:8px;}
  .pt-row:last-child{margin-bottom:0;}
  .pt-row.dotted{border-top:1px dashed #e2e8f0;padding-top:10px;margin-top:4px;}
  .pt-label{font-weight:500;}
  .pt-amount{font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:14px;color:#1d4ed8;}
  .pt-desc{font-size:12px;color:#94a3b8;margin-bottom:12px;line-height:1.5;}

  /* Warranty box */
  .warranty-box{border:1px solid #dbeafe;border-radius:8px;padding:14px 16px;background:#f8fbff;margin-bottom:20px;display:flex;gap:12px;align-items:flex-start;}
  .warranty-icon{width:32px;height:32px;background:#dbeafe;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px;}
  .warranty-title{font-size:13.5px;font-weight:700;color:#1e3a5f;margin-bottom:4px;}
  .warranty-body{font-size:12.5px;color:#3b5e8a;line-height:1.6;}
  .warranty-body strong{font-weight:700;}
  .warranty-note{font-size:11.5px;color:#64748b;margin-top:6px;}

  /* Notes */
  .notes-bar{border-left:3px solid #f59e0b;background:#fffbeb;border-radius:0 6px 6px 0;padding:10px 14px;margin-bottom:20px;font-size:12.5px;color:#78350f;line-height:1.6;}

  /* Signature */
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

  /* Accepted signature overlay */
  .sig-accepted{position:relative;}
  .sig-accepted-mark{position:absolute;bottom:8px;left:0;right:0;display:flex;flex-direction:column;align-items:center;gap:2px;}
  .sig-accepted-text{font-size:13px;font-weight:700;color:#16a34a;font-style:italic;letter-spacing:0.02em;}
  .sig-accepted-date{font-size:11px;color:#16a34a;font-family:'IBM Plex Mono',monospace;}

  /* Admin note */
  .admin-note{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 14px;font-size:12px;color:#78350f;line-height:1.6;display:flex;gap:8px;align-items:flex-start;}
  .admin-note-icon{font-size:16px;flex-shrink:0;margin-top:1px;}
  .admin-note strong{color:#92400e;}

  /* Footer */
  .doc-footer{background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 24px;text-align:center;font-size:11px;color:#94a3b8;}
</style>
</head>
<body>
<div class="page">
  ${accepted ? `<div class="accepted-stamp">ACCEPTED</div>` : ''}
  <div class="contract">

    <!-- Top Bar -->
    <div class="topbar">
      <div class="topbar-left">
        <div class="topbar-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        </div>
        <div>
          <div class="topbar-title">Service Contract</div>
          <div class="topbar-sub">Contract No. ${tx.contractNo}</div>
        </div>
      </div>
      <div class="topbar-actions">
        <span class="btn-action primary">&#9993; Send to Customer</span>
        <span class="btn-action">&#8659; Download PDF</span>
      </div>
    </div>

    <!-- Account notice -->
    ${tx.email ? `
    <div class="notice-bar">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      Customer has an account &middot; <a href="#">${tx.email}</a> &middot; You can send the contract directly to them.
    </div>` : ''}

    <div class="body">

      <!-- Client info -->
      <div class="client-row">
        <div class="client-col">
          <p>Client Name</p>
          <strong>${tx.client}</strong>
        </div>
        <div class="client-col">
          <p>Phone</p>
          <strong>${tx.phone}</strong>
        </div>
        <div class="client-col">
          <p>Address</p>
          <strong>${tx.address}</strong>
        </div>
      </div>

      <!-- Scope of Work -->
      <p class="sec-title">Scope of Work</p>
      <div class="meta-row">
        <div class="meta-item"><p>Site Address</p><strong>${tx.address}</strong></div>
        <div class="meta-item"><p>Inspection Date</p><strong>${fmtDate(tx.contractStart)}</strong></div>
        ${tx.installDate ? `<div class="meta-item"><p>Est. Installation Date</p><strong>${fmtDate(tx.installDate)}</strong></div>` : ''}
      </div>

      <div class="scope-wrap">
        <table class="scope-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Product / Description</th>
              <th>W×H (CM)</th>
              <th>QTY</th>
              <th>Rate/Sqft</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>
                <div class="product-name">${tx.product}</div>
                ${tx.notes ? `<div class="product-dim">${tx.notes}</div>` : ''}
              </td>
              <td style="color:#64748b;">—</td>
              <td>1</td>
              <td style="color:#64748b;">—</td>
              <td style="font-family:'IBM Plex Mono',monospace;font-weight:700;">${fmt(tx.total)}</td>
            </tr>
          </tbody>
        </table>
        <div class="total-row">
          <span class="total-label">Total Contract Amount</span>
          <span class="total-amount">${fmt(tx.total)}</span>
        </div>
      </div>

      <!-- Payment Terms -->
      <div class="payment-box">
        <p class="sec-title">Payment Terms</p>
        <p class="pt-desc">50% downpayment, 50% upon completion.</p>
        <div class="pt-row dotted">
          <span class="pt-label">50% Downpayment Required:</span>
          <span class="pt-amount">${fmt(downpayment)}</span>
        </div>
        <div class="pt-row">
          <span class="pt-label">Balance Upon Completion:</span>
          <span class="pt-amount">${fmt(balance)}</span>
        </div>
      </div>

      <!-- Warranty -->
      <p class="sec-title">Warranty</p>
      <div class="warranty-box">
        <div class="warranty-icon">&#128737;</div>
        <div>
          <div class="warranty-title">90-Day Warranty</div>
          <p class="warranty-body">ACGC Glass &amp; Aluminum Services provides a <strong>90-day warranty</strong> on all installed products and workmanship. The warranty period begins on the <strong>date of installation completion</strong>.</p>
          <p class="warranty-note">Warranty dates will be recorded upon installation completion.</p>
        </div>
      </div>

      <!-- Notes -->
      ${tx.notes ? `
      <p class="sec-title">Notes &amp; Special Instructions</p>
      <div class="notes-bar">${tx.notes}</div>` : ''}

      <!-- Client Acknowledgment -->
      <p class="sec-title">Client Acknowledgment</p>
      <div class="sig-grid">
        <div class="sig-box ${accepted ? 'sig-accepted' : ''}">
          <div class="sig-line">${accepted ? `<svg viewBox="0 0 200 50" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;"><path d="M10,40 Q30,10 50,30 T90,20 T130,35 T170,15 T195,28" stroke="#16a34a" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>` : ''}</div>
          <div class="sig-label">Client Signature &amp; Printed Name</div>
          <div class="sig-name">${tx.client}</div>
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

    </div><!-- /body -->

    <div class="doc-footer">
      Generated on ${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })} &nbsp;&middot;&nbsp; ${tx.contractNo} &nbsp;&middot;&nbsp; ACGC Glass &amp; Aluminum Services
    </div>

  </div><!-- /contract -->
</div><!-- /page -->
</body>
</html>`;
};

const downloadContract = (tx, accepted = false) => {
  const html = generateContractHTML(tx, accepted);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tx.contractNo}${accepted ? '-ACCEPTED' : ''}.html`;
  a.click();
  URL.revokeObjectURL(url);
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const StatusBadge = ({ paid, total }) => {
  const status = deriveStatus(paid, total);
  return status === 'Fully Paid' ? (
    <span className="badge-paid">✓ Fully Paid</span>
  ) : (
    <span className="badge-pending">⏳ Pending</span>
  );
};

const CategoryBadge = ({ category }) => {
  const map = {
    'Completed Project': 'cat-completed',
    Contract: 'cat-contract',
    Warranty: 'cat-warranty',
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
  <div className="avatar">{name.charAt(0).toUpperCase()}</div>
);

// ─── Contract Modal ──────────────────────────────────────────────────────────
const ContractModal = ({ tx, onClose }) => {
  const accepted = deriveStatus(tx.paid, tx.total) === 'Fully Paid';
  if (!tx) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box contract-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <p className="modal-eyebrow">Contract Document</p>
            <h2 className="modal-title">{tx.contractNo}</h2>
            <p className="modal-sub">{tx.client} — {tx.product}</p>
          </div>
          {accepted && (
            <span className="contract-accepted-badge">✓ Accepted</span>
          )}
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="contract-iframe-wrap">
          <iframe
            className="contract-iframe"
            srcDoc={generateContractHTML(tx, accepted)}
            title={`Contract ${tx.contractNo}`}
            sandbox="allow-same-origin"
          />
        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Close</button>
          <button className="btn-download" onClick={() => downloadContract(tx, accepted)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download Contract
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── View Modal ──────────────────────────────────────────────────────────────
const ViewModal = ({ tx, onClose, onViewContract }) => {
  if (!tx) return null;
  const remaining = tx.total - tx.paid;
  const status = deriveStatus(tx.paid, tx.total);
  const warrantyDays = calcWarrantyDays(tx.warrantyEnd);
  const warrantyExpired = warrantyDays !== null && warrantyDays < 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <p className="modal-eyebrow">Transaction Details</p>
            <h2 className="modal-title">{tx.client}</h2>
            <p className="modal-sub">{tx.contractNo}</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="view-status-row">
            <StatusBadge paid={tx.paid} total={tx.total} />
            <CategoryBadge category={tx.category} />
            <span className="type-chip">{tx.customerType === 'Website Order' ? '🌐' : '🚶'} {tx.customerType}</span>
          </div>

          <div className="view-grid-2">
            <InfoSection title="Client Information">
              <InfoRow label="Full Name" value={tx.client} />
              <InfoRow label="Email" value={tx.email} />
              <InfoRow label="Phone" value={tx.phone} />
              <InfoRow label="Address" value={tx.address} />
            </InfoSection>
            <InfoSection title="Project Details">
              <InfoRow label="Product / Project" value={tx.product} />
              <InfoRow label="Installation Date" value={fmtDate(tx.installDate)} />
              <InfoRow label="Customer Type" value={tx.customerType} />
              <InfoRow label="Notes" value={tx.notes} />
            </InfoSection>
          </div>

          <InfoSection title="Payment Breakdown">
            <div className="payment-rows">
              <PayRow label="Total Project Amount" value={fmt(tx.total)} />
              <PayRow label="Amount Paid" value={fmt(tx.paid)} color="green" />
              <div className="pay-divider" />
              <PayRow label="Remaining Balance" value={fmt(remaining)} color={remaining > 0 ? 'red' : 'green'} bold />
            </div>
            <div className="progress-wrap">
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${Math.min((tx.paid / tx.total) * 100, 100)}%` }} />
              </div>
              <span className="progress-pct">{Math.round((tx.paid / tx.total) * 100)}% paid</span>
            </div>
          </InfoSection>

          <InfoSection title="Payment Information">
            <InfoRow label="Payment Method" value={tx.paymentMethod} />
            {tx.paymentMethod === 'Online' && tx.txnNumber && (
              <InfoRow label="Transaction Number" value={tx.txnNumber} mono />
            )}
            <InfoRow label="Payment Status" value={status} />
          </InfoSection>

          <InfoSection title="Contract Information">
            <InfoRow label="Contract No." value={tx.contractNo} mono />
            <InfoRow label="Contract Start" value={fmtDate(tx.contractStart)} />
            <InfoRow label="Contract End" value={fmtDate(tx.contractEnd)} />
          </InfoSection>

          {(tx.category === 'Warranty' || tx.warrantyEnd) && (
            <InfoSection title="Warranty Information">
              <InfoRow label="Warranty Start" value={fmtDate(tx.warrantyStart)} />
              <InfoRow label="Warranty End" value={fmtDate(tx.warrantyEnd)} />
              <div className="warranty-days-row">
                <span className="info-label">Remaining Warranty Days</span>
                {warrantyDays === null ? (
                  <span className="info-value">—</span>
                ) : warrantyExpired ? (
                  <span className="warranty-expired">Expired ({Math.abs(warrantyDays)} days ago)</span>
                ) : (
                  <span className="warranty-active">{warrantyDays} days remaining</span>
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
          <button className="btn-download" onClick={() => downloadContract(tx)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download
          </button>
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
  const isLocked = deriveStatus(tx.paid, tx.total) === 'Fully Paid';
  const [paid, setPaid] = useState(String(tx.paid));
  const [method, setMethod] = useState(tx.paymentMethod);
  const [txnNum, setTxnNum] = useState(tx.txnNumber || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = () => {
    const paidNum = parseFloat(paid);
    if (isNaN(paidNum) || paidNum < 0) { setError('Please enter a valid amount paid.'); return; }
    if (paidNum > tx.total) { setError('Amount paid cannot exceed the total project amount.'); return; }
    setSaving(true);
    setTimeout(() => {
      onSave(tx.id, { paid: paidNum, paymentMethod: method, txnNumber: method === 'Online' ? txnNum : '' });
      setSaving(false);
      onClose();
    }, 600);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <p className="modal-eyebrow">Edit Payment</p>
            <h2 className="modal-title">{tx.client}</h2>
            <p className="modal-sub">{tx.product}</p>
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
                  max={tx.total}
                  onChange={(e) => { setPaid(e.target.value); setError(''); }}
                  placeholder="0.00"
                />
                <p className="field-hint">Total project amount: {fmt(tx.total)}</p>
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
                <StatusBadge paid={Number(paid) || 0} total={tx.total} />
              </div>

              <div className="balance-preview">
                <span>Remaining Balance</span>
                <strong className={(tx.total - (Number(paid) || 0)) > 0 ? 'color-red' : 'color-green'}>
                  {fmt(tx.total - (Number(paid) || 0))}
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
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [viewTx, setViewTx] = useState(null);
  const [editTx, setEditTx] = useState(null);
  const [contractTx, setContractTx] = useState(null);

  const summary = useMemo(() => {
    return transactions.reduce(
      (acc, t) => {
        acc.revenue += t.total;
        acc.collected += t.paid;
        acc.pending += t.total - t.paid;
        if (deriveStatus(t.paid, t.total) === 'Fully Paid') acc.completed++;
        return acc;
      },
      { revenue: 0, collected: 0, pending: 0, completed: 0 }
    );
  }, [transactions]);

  const filtered = useMemo(() => {
    let list = [...transactions];
    if (filter === 'Completed Projects') list = list.filter((t) => t.category === 'Completed Project');
    else if (filter === 'Contract & Warranties')
      list = list.filter((t) => t.category === 'Contract' || t.category === 'Warranty');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.client.toLowerCase().includes(q) ||
          t.product.toLowerCase().includes(q) ||
          t.contractNo.toLowerCase().includes(q)
      );
    }
    return list;
  }, [transactions, filter, search]);

  const handleSave = (id, updates) => {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
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
                  const isFullyPaid = deriveStatus(t.paid, t.total) === 'Fully Paid';
                  return (
                    <tr key={t.id} className="data-row">
                      <td className="col-num">{i + 1}</td>
                      <td>
                        <div className="client-cell">
                          <Avatar name={t.client} />
                          <div>
                            <p className="client-name">{t.client}</p>
                            <p className="client-email">{t.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="product-name">{t.product}</p>
                        <p className="contract-num">{t.contractNo}</p>
                      </td>
                      <td>
                        <p className="col-paid">{fmt(t.paid)}</p>
                        <p className="col-total">of {fmt(t.total)}</p>
                      </td>
                      <td>
                        <span className={`method-chip ${t.paymentMethod === 'Cash' ? 'chip-cash' : 'chip-online'}`}>
                          {t.paymentMethod === 'Cash' ? '💵' : '💳'} {t.paymentMethod}
                        </span>
                      </td>
                      <td>
                        <span className="type-chip">
                          {t.customerType === 'Website Order' ? '🌐' : '🚶'} {t.customerType}
                        </span>
                      </td>
                      <td className="col-date">{fmtDate(t.installDate)}</td>
                      <td><CategoryBadge category={t.category} /></td>
                      <td><StatusBadge paid={t.paid} total={t.total} /></td>
                      <td>
                        <div className="action-group">
                          <button className="action-btn btn-view" onClick={() => setViewTx(t)} title="View Details">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
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
                          <button className="action-btn btn-contract" onClick={() => setContractTx(t)} title="View/Download Contract">
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
