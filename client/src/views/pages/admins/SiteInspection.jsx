import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import './SiteInspection.css';
import { UserContext } from 'App';
import { CRUD, isEmpty } from 'services/data.services';


const PAYMENT_TERMS_OPTIONS = [
  '50% downpayment, 50% upon completion',
  'Full payment upon completion',
  'Installment (3 months)',
  'Installment (6 months)',
  'Custom arrangement',
];

const STATUS_OPTIONS = ['Needs to be Called', 'Scheduled', 'Completed', 'Pending Payment', 'Cancelled'];

const today = new Date().toISOString().split('T')[0];

// ─── Helpers ────────────────────────────────────────────────────────────────
function calcRowTotal(row) {
  const width = parseFloat(row.width) || 0;
  const height = parseFloat(row.height) || 0;
  const price = parseFloat(row.pricePerSqFt) || 0;
  const qty = parseInt(row.qty) || 0;
  const unit = row.unit || 'cm';

  let sqFt = 0;
  if (unit === 'cm') {
    sqFt = (width * height) / 929.03; // cm² to sqft
  } else if (unit === 'inch') {
    sqFt = (width * height) / 144;    // in² to sqft
  } else if (unit === 'ft') {
    sqFt = width * height;            // Already in sqft
  }

  return sqFt * price * qty;
}

function calcGrandTotal(rows) {
  return (rows || []).reduce((sum, r) => sum + calcRowTotal(r), 0);
}

function fmtCurrency(n) {
  return '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getStatusMeta(status) {
  switch (status) {
    case 'Scheduled':          return { cls: 'badge-scheduled', icon: '📅' };
    case 'Completed':          return { cls: 'badge-completed', icon: '✅' };
    case 'Pending Payment':    return { cls: 'badge-pending',   icon: '⏳' };
    case 'Cancelled':           return { cls: 'badge-canceled',  icon: '🚫' };
    case 'Needs to be Called': return { cls: 'badge-call',      icon: '📞' };
    default:                   return { cls: 'badge-default',   icon: '•' };
  }
}

function emptyForm() {
  return {
    clientName: '',
    clientNumber: '',
    clientAddress: '',
    siteAddress: '',
    inspectionDate: '',
    estimatedInstallationDate: '',
    status: 'Needs to be Called',
    notes: '',
    paymentTerms: PAYMENT_TERMS_OPTIONS[0],
    downpaymentPaid: false,
    paymentDate: '',
    manualOverride: '',
    customerHasAccount: false,
    customerEmail: '',
    measurements: [
      { id: Date.now(), product: '', width: '', height: '', qty: 1, pricePerSqFt: '', unit: 'cm' }
    ],
  };
}

// ─── Sub-components ─────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const { cls, icon } = getStatusMeta(status);
  return <span className={`si-badge ${cls}`}>{icon} {status}</span>;
}

function MeasurementTable({ rows, setRows, editable = true }) {
  const addRow = () =>
    setRows(prev => [...prev, { id: Date.now(), product: '', width: '', height: '', qty: 1, pricePerSqFt: '', unit: 'cm' }]);
  const removeRow = (id) => setRows(prev => prev.filter(r => r.id !== id));
  const update = (id, field, value) =>
    setRows(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)));

  return (
    <div className="meas-wrapper">
      <div className="meas-scroll">
        <table className="meas-table">
          <thead>
            <tr>
              <th>Product / Description</th>
              <th>Width</th>
              <th>Height</th>
              <th>Unit</th>
              <th>Qty</th>
              <th>Price/sqft (₱)</th>
              <th>Est. Total</th>
              {editable && <th></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td>
                  {editable
                    ? <input className="meas-input" value={row.product} onChange={e => update(row.id, 'product', e.target.value)} placeholder="e.g. Sliding Door" />
                    : <span>{row.product}</span>}
                </td>
                <td>
                  {editable
                    ? <input className="meas-input num" type="number" value={row.width} onChange={e => update(row.id, 'width', e.target.value)} placeholder="0" />
                    : <span>{row.width}</span>}
                </td>
                <td>
                  {editable
                    ? <input className="meas-input num" type="number" value={row.height} onChange={e => update(row.id, 'height', e.target.value)} placeholder="0" />
                    : <span>{row.height}</span>}
                </td>
                {/* Dynamic Unit Dropdown / Display Selection Column */}
                <td>
                  {editable ? (
                    <select className="meas-input" style={{ minWidth: '70px' }} value={row.unit || 'cm'} onChange={e => update(row.id, 'unit', e.target.value)}>
                      <option value="cm">cm</option>
                      <option value="inch">inch</option>
                      <option value="ft">ft</option>
                    </select>
                  ) : (
                    <span className="paid-chip" style={{ background: '#e2e8f0', color: '#4a5568' }}>{row.unit || 'cm'}</span>
                  )}
                </td>
                <td>
                  {editable
                    ? <input className="meas-input num" type="number" min="1" value={row.qty} onChange={e => update(row.id, 'qty', e.target.value)} />
                    : <span>{row.qty}</span>}
                </td>
                <td>
                  {editable
                    ? <input className="meas-input num" type="number" value={row.pricePerSqFt} onChange={e => update(row.id, 'pricePerSqFt', e.target.value)} placeholder="0" />
                    : <span>{row.pricePerSqFt}</span>}
                </td>
                <td className="meas-total">{fmtCurrency(calcRowTotal(row))}</td>
                {editable && (
                  <td>
                    <button className="meas-del" onClick={() => removeRow(row.id)} title="Remove row">×</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editable && (
        <button className="meas-add-btn" onClick={addRow}>+ Add Row</button>
      )}
      <div className="meas-grand">
        <span>Total:</span>
        <strong>{fmtCurrency(calcGrandTotal(rows))}</strong>
      </div>
    </div>
  );
}

// ─── Contract Modal ──────────────────────────────────────────────────────────
function ContractModal({ inspection, onClose, onSend, onDownload }) {
  const grand = inspection.estimatedTotal || calcGrandTotal(inspection.measurements);
  const dp = grand * 0.5;
  const contractDate = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(inspection.contractSentToCustomer || false);

  const handleSend = () => {
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
      onSend && onSend();
    }, 1200);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="contract-modal-box" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-topbar">
          <div>
            <h2 className="modal-title">📄 Service Contract</h2>
            <p className="modal-subtitle">Contract No: SI-{String(inspection.id).padStart(4, '0')}</p>
          </div>
          <div className="modal-topbar-actions">
            {inspection.customerHasAccount && (
              <button
                className={`contract-send-btn ${sent ? 'contract-send-btn--sent' : ''}`}
                onClick={handleSend}
                disabled={sending || sent}
              >
                {sent ? '✅ Sent to Customer' : sending ? '⏳ Sending...' : '📨 Send to Customer'}
              </button>
            )}
            <button className="contract-dl-btn" onClick={onDownload}>
              ⬇️ Download PDF
            </button>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        {/* Send Info Banner */}
        {inspection.customerHasAccount ? (
          <div className="contract-info-banner contract-info-banner--blue">
            <span>👤</span>
            <span>Customer has an account · <strong>{inspection.customerEmail}</strong> · You can send the contract directly to them.</span>
          </div>
        ) : (
          <div className="contract-info-banner contract-info-banner--amber">
            <span>📧</span>
            <span>Customer has no account. Download the contract and send it manually via email or print.</span>
          </div>
        )}

        {/* Dummy Customer Agreement Banner */}
        {inspection.contractStatus === 'agreed' && (
          <div className="contract-info-banner contract-info-banner--green">
            <span>✅</span>
            <span>
              Customer has <strong>agreed</strong> to this contract on <strong>{fmtDate(inspection.contractAgreedDate)}</strong>.
              {inspection.warrantyStartDate && (
                <> · 90-day warranty: <strong>{fmtDate(inspection.warrantyStartDate)}</strong> – <strong>{fmtDate(inspection.warrantyEndDate)}</strong></>
              )}
            </span>
          </div>
        )}

        {/* Scrollable Contract Body */}
        <div className="contract-modal-body">
          <div className="contract-paper-inner">
            {/* Header */}
            <div className="contract-header">
              <div className="contract-logo">
                <div className="contract-logo-icon">◆</div>
                <div>
                  <div className="contract-biz">GlassAlum Pro</div>
                  <div className="contract-tagline">Glass &amp; Aluminum Specialists</div>
                </div>
              </div>
              <div className="contract-meta">
                <div className="contract-title">SERVICE CONTRACT</div>
                <div className="contract-num">Contract No: SI-{String(inspection.id).padStart(4, '0')}</div>
                <div className="contract-date">Date: {contractDate}</div>
              </div>
            </div>

            <div className="contract-divider" />

            <div className="contract-parties">
              <div>
                <div className="contract-label">SERVICE PROVIDER</div>
                <div className="contract-value">GlassAlum Pro Inc.</div>
                <div className="contract-sub">Olongapo City, Zambales</div>
              </div>
              <div>
                <div className="contract-label">CLIENT</div>
                <div className="contract-value">{inspection.clientName}</div>
                <div className="contract-sub">{inspection.clientAddress}</div>
              </div>
            </div>

            <div className="contract-section-title">SCOPE OF WORK</div>
            <div className="contract-site-info">
              <span><b>Site Address:</b> {inspection.siteAddress}</span>
              <span><b>Inspection Date:</b> {inspection.inspectionDate}</span>
              {inspection.estimatedInstallationDate && (
                <span><b>Est. Installation Date:</b> {inspection.estimatedInstallationDate}</span>
              )}
            </div>

            <table className="contract-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product / Description</th>
                  <th>W×H (cm)</th>
                  <th>Qty</th>
                  <th>Rate/sqft</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {inspection.measurements.map((r, i) => (
                  <tr key={r.id}>
                    <td>{i + 1}</td>
                    <td>{r.product}</td>
                    <td>{r.width}×{r.height}</td>
                    <td>{r.qty}</td>
                    <td>{fmtCurrency(r.pricePerSqFt)}</td>
                    <td>{fmtCurrency(calcRowTotal(r))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="5" className="contract-total-label">TOTAL CONTRACT AMOUNT</td>
                  <td className="contract-total-val">{fmtCurrency(grand)}</td>
                </tr>
              </tfoot>
            </table>

            <div className="contract-payment-box">
              <div className="contract-section-title">PAYMENT TERMS</div>
              <p>{inspection.paymentTerms}</p>
              <div className="contract-payment-row">
                <span>50% Downpayment Required:</span>
                <strong>{fmtCurrency(dp)}</strong>
              </div>
              <div className="contract-payment-row">
                <span>Balance Upon Completion:</span>
                <strong>{fmtCurrency(grand - dp)}</strong>
              </div>
              {inspection.paymentDate && (
                <div className="contract-payment-row">
                  <span>Agreed Payment Date:</span>
                  <strong>{inspection.paymentDate}</strong>
                </div>
              )}
            </div>

            {/* Warranty Section */}
            <div className="contract-section-title">WARRANTY</div>
            <div className="contract-warranty-box">
              <div className="warranty-icon">🛡️</div>
              <div>
                <div className="warranty-title">90-Day Warranty</div>
                <div className="warranty-desc">
                  GlassAlum Pro Inc. provides a <strong>90-day warranty</strong> on all installed products and workmanship.
                  The warranty period begins on the <strong>date of installation completion</strong>.
                  {inspection.warrantyStartDate ? (
                    <span className="warranty-dates">
                      {' '}Warranty Period: <strong>{fmtDate(inspection.warrantyStartDate)}</strong> to <strong>{fmtDate(inspection.warrantyEndDate)}</strong>.
                    </span>
                  ) : (
                    <span className="warranty-dates"> Warranty dates will be recorded upon installation completion.</span>
                  )}
                </div>
              </div>
            </div>

            {inspection.notes && (
              <>
                <div className="contract-section-title">NOTES &amp; SPECIAL INSTRUCTIONS</div>
                <p className="contract-notes">{inspection.notes}</p>
              </>
            )}

            {/* Signature — Admin only (no admin signature line needed since they generate it) */}
            <div className="contract-section-title">CLIENT ACKNOWLEDGMENT</div>
            <div className="contract-signatures contract-signatures--single">
              <div className="contract-sig">
                <div className="contract-sig-line" />
                <div>Client Signature &amp; Printed Name</div>
                <div className="contract-sub">{inspection.clientName}</div>
                <div className="contract-sub">Date: _______________</div>
              </div>
              <div className="contract-sig-note">
                <div className="contract-sig-note-icon">✍️</div>
                <div className="contract-sig-note-text">
                  <strong>Admin Note:</strong> This contract is officially issued by GlassAlum Pro Inc. Administration. The admin signature is implicit upon generation and distribution of this document.
                </div>
              </div>
            </div>

            <div className="contract-footer">
              <p>This document serves as the official service contract between the client and GlassAlum Pro Inc. By signing, the client agrees to all terms stated herein.</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Close</button>
          <button className="contract-print-btn" onClick={() => window.print()}>🖨️ Print</button>
          <button className="contract-dl-btn-lg" onClick={onDownload}>⬇️ Download</button>
          {inspection.customerHasAccount && (
            <button
              className={`btn-primary ${sent ? 'btn-primary--sent' : ''}`}
              onClick={handleSend}
              disabled={sending || sent}
            >
              {sent ? '✅ Sent' : sending ? 'Sending…' : '📨 Send to Customer'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── View Modal ──────────────────────────────────────────────────────────────
function ViewModal({ inspection, onClose, onGenerateContract }) {
  console.log(inspection)
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--large" onClick={e => e.stopPropagation()}>
        <div className="modal-topbar">
          <div>
            <h2 className="modal-title">Inspection Details</h2>
            <p className="modal-subtitle">SI-{String(inspection.id).padStart(4, '0')} · Created {inspection.dateCreated}</p>
          </div>
          <div className="modal-topbar-actions">
            <button className="gen-contract-btn" onClick={onGenerateContract}>📄 Generate Contract</button>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="modal-body">
          {/* Customer Agreement Banner */}
          {inspection.contractStatus === 'agreed' && (
            <div className="contract-info-banner contract-info-banner--green">
              <span>✅</span>
              <div>
                <div>Customer <strong>{inspection.clientName}</strong> has agreed to the contract on <strong>{fmtDate(inspection.contractAgreedDate)}</strong>.</div>
                {inspection.warrantyStartDate && (
                  <div style={{marginTop: 4}}>
                    🛡️ <strong>90-Day Warranty:</strong> {fmtDate(inspection.warrantyStartDate)} – {fmtDate(inspection.warrantyEndDate)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Client Info */}
          <div className="detail-section">
            <div className="detail-section-title">Client Information</div>
            <div className="detail-grid">
              <div><span className="detail-label">Client Name</span><span className="detail-val">{inspection.clientName}</span></div>
              <div><span className="detail-label">Client Number</span><span className="detail-val">{inspection.clientNumber || '—'}</span></div>
              <div><span className="detail-label">Site Address</span><span className="detail-val">{inspection.siteAddress}</span></div>
              <div><span className="detail-label">Inspection Date</span><span className="detail-val">{inspection.inspectionDate}</span></div>
              <div><span className="detail-label">Est. Installation Date</span><span className="detail-val">{inspection.estimatedInstallationDate || '—'}</span></div>
              <div><span className="detail-label">Status</span><StatusBadge status={inspection.status === 'Pending' ? 'Needs to be Called' : inspection.status} /></div>
            </div>
          </div>

          {/* Measurements */}
          <div className="detail-section">
            <div className="detail-section-title">Measurements</div>
            <MeasurementTable rows={inspection.measurements} setRows={() => {}} editable={false} />
          </div>

          {/* Payment */}
          <div className="detail-section">
            <div className="detail-section-title">Payment Summary</div>
            <div className="payment-summary-box">
              <div className="payment-row">
                <span>Estimated Total</span>
                <strong>
                  {inspection.manualOverride != "" &&
                  <span className={`si-badge badge-call m-2`}>
                    {"Manual Price"}
                  </span>
                  }
                  {inspection.manualOverride ? fmtCurrency(inspection.manualOverride) : fmtCurrency(inspection.estimatedTotal)}
                </strong>
              </div>
              <div className="payment-row highlight">
                <span>50% Downpayment</span>
                <strong>{inspection.manualOverride ? fmtCurrency(inspection.manualOverride * 0.5) : fmtCurrency(inspection.estimatedTotal * 0.5)}</strong>
              </div>
              <div className="payment-row">
                <span>Balance</span>
                <strong>{inspection.manualOverride ? fmtCurrency(inspection.manualOverride * 0.5) : fmtCurrency(inspection.estimatedTotal * 0.5)}</strong>
              </div>
              <div className="payment-row">
                <span>Payment Terms</span>
                <span>{inspection.paymentTerms}</span>
              </div>
              <div className="payment-row">
                <span>Downpayment Status</span>
                <span className={inspection.downpaymentPaid ? 'paid-chip' : 'unpaid-chip'}>
                  {inspection.downpaymentPaid ? '✅ Paid' : '⏳ Pending'}
                </span>
              </div>
              {inspection.paymentDate && (
                <div className="payment-row">
                  <span>Agreed Payment Date</span>
                  <span>{inspection.paymentDate}</span>
                </div>
              )}
            </div>
          </div>

          {/* Warranty (if agreed) */}
          {inspection.warrantyStartDate && (
            <div className="detail-section">
              <div className="detail-section-title">Warranty</div>
              <div className="warranty-detail-box">
                <div>🛡️ <strong>90-Day Warranty</strong></div>
                <div className="warranty-detail-dates">
                  <span>Start: <strong>{fmtDate(inspection.warrantyStartDate)}</strong></span>
                  <span>End: <strong>{fmtDate(inspection.warrantyEndDate)}</strong></span>
                </div>
                <div className="warranty-detail-note">Warranty starts after installation is completed.</div>
              </div>
            </div>
          )}

          {/* Notes */}
          {inspection.notes && (
            <div className="detail-section">
              <div className="detail-section-title">Notes &amp; Instructions</div>
              <p className="notes-text">{inspection.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Cancel Modal ─────────────────────────────────────────────────────
function ConfirmCancelModal({ inspection, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--sm" onClick={e => e.stopPropagation()}>
        <div className="modal-topbar">
          <h2 className="modal-title">Cancel Inspection?</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="confirm-body">
            <div className="confirm-icon">🚫</div>
            <p className="confirm-msg">
              Are you sure you want to cancel the site inspection for <strong>{inspection.clientName}</strong>? This action will move it to the Cancelled section.
            </p>
            <div className="confirm-actions">
              <button className="btn-ghost" onClick={onClose}>Go Back</button>
              <button className="btn-danger" onClick={onConfirm}>Yes, Cancel It</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── New / Edit Modal ─────────────────────────────────────────────────────────
function InspectionFormModal({ initial, onClose, onSave }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(() =>
    isEdit
      ? { 
          ...initial, 
          measurements: initial.measurements.map(r => ({ ...r })), 
          manualOverride: initial.manualOverride !== undefined && initial.manualOverride !== null && initial.manualOverride !== '' ? String(initial.manualOverride) : '' 
        }
      : emptyForm()
  );
  const [measurements, setMeasurements] = useState(form.measurements);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const computed = calcGrandTotal(measurements);
  const finalTotal = form.manualOverride !== '' && form.manualOverride !== null ? parseFloat(form.manualOverride) || 0 : computed;
  const downpayment = finalTotal * 0.5;

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const validate = () => {
    const e = {};
    if (!form.clientName.trim()) e.clientName = 'Required';
    if (!form.clientNumber?.trim()) e.clientNumber = 'Required';
    if (!form.siteAddress.trim()) e.siteAddress = 'Required';
    if (!form.inspectionDate) e.inspectionDate = 'Required';
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    setTimeout(() => {
      onSave({
        ...form,
        measurements,
        estimatedTotal: finalTotal,
        manualOverride: form.manualOverride,
        dateCreated: isEdit ? form.dateCreated : today,
      });
      setSaving(false);
    }, 600);
  };

  const needsPaymentDate = form.paymentTerms !== '50% downpayment, 50% upon completion'
    && form.paymentTerms !== 'Full payment upon completion'
    && !form.downpaymentPaid;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--large" onClick={e => e.stopPropagation()}>
        <div className="modal-topbar">
          <div>
            <h2 className="modal-title">{isEdit ? 'Edit Inspection' : 'New Site Inspection'}</h2>
            <p className="modal-subtitle">{isEdit ? `Editing SI-${String(initial.id).padStart(4,'0')}` : 'Fill in the details below to create a new inspection record.'}</p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Client Info */}
          <div className="form-section">
            <div className="form-section-title">Client Information</div>
            <div className="form-grid-3">
              <div className="form-field">
                <label>Client Name <span className="req">*</span></label>
                <input className={`fi ${errors.clientName ? 'fi--err' : ''}`} value={form.clientName} onChange={e => { set('clientName', e.target.value); setErrors(x => ({...x, clientName:''})); }} placeholder="e.g. Maria Santos" />
                {errors.clientName && <span className="err-msg">{errors.clientName}</span>}
              </div>
              <div className="form-field">
                <label>Client Number <span className="req">*</span></label>
                <input
                  className={`fi ${errors.clientNumber ? 'fi--err' : ''}`}
                  value={form.clientNumber}
                  onChange={e => { const val = e.target.value.replace(/[^0-9+]/g, ''); set('clientNumber', val); setErrors(x => ({ ...x, clientNumber: '' })); }}
                  placeholder="e.g. 09171234567"
                  maxLength={13}
                  inputMode="tel"
                  type="tel"
                />
                {errors.clientNumber && <span className="err-msg">{errors.clientNumber}</span>}
              </div>
              <div className="form-field">
                <label>Site Address <span className="req">*</span></label>
                <input className={`fi ${errors.siteAddress ? 'fi--err' : ''}`} value={form.siteAddress} onChange={e => { set('siteAddress', e.target.value); setErrors(x=>({...x,siteAddress:''})); }} placeholder="e.g. 45 Magsaysay Dr." />
                {errors.siteAddress && <span className="err-msg">{errors.siteAddress}</span>}
              </div>
            </div>
            <div className="form-grid-3 mt-12">
              <div className="form-field">
                <label>Inspection Date <span className="req">*</span></label>
                <input type="date" className={`fi ${errors.inspectionDate ? 'fi--err' : ''}`} value={form.inspectionDate} min={today} onChange={e => { set('inspectionDate', e.target.value); setErrors(x=>({...x,inspectionDate:''})); }} />
                {errors.inspectionDate && <span className="err-msg">{errors.inspectionDate}</span>}
              </div>
              <div className="form-field">
                <label>Est. Installation Date</label>
                <input type="date" className="fi" value={form.estimatedInstallationDate} min={form.inspectionDate || today} onChange={e => set('estimatedInstallationDate', e.target.value)} />
                <span className="field-hint">Estimated date when installation will begin.</span>
              </div>
              <div className="form-field">
                <label>Status</label>
                <select className="fi" value={form.status} onChange={e => set('status', e.target.value)}>
                  {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Customer Account */}
          <div className="form-section">
            <div className="form-section-title">Customer Account</div>
            <div className="form-grid-2">
              <div className="form-field">
                <label>Has Account on Website?</label>
                <div className="toggle-group">
                  <button type="button" className={`toggle-btn ${form.customerHasAccount ? 'toggle-btn--active' : ''}`} onClick={() => set('customerHasAccount', true)}>✅ Yes</button>
                  <button type="button" className={`toggle-btn ${!form.customerHasAccount ? 'toggle-btn--active toggle-btn--no' : ''}`} onClick={() => { set('customerHasAccount', false); set('customerEmail', ''); }}>❌ No</button>
                </div>
              </div>
              {form.customerHasAccount && (
                <div className="form-field fade-in">
                  <label>Customer Email</label>
                  <input type="email" className="fi" value={form.customerEmail} onChange={e => set('customerEmail', e.target.value)} placeholder="e.g. maria@email.com" />
                  <span className="field-hint">Contract will be sent to this email.</span>
                </div>
              )}
            </div>
          </div>

          {/* Site Details */}
          <div className="form-section">
            <div className="form-section-title">Site Details</div>
            <div className="form-field">
              <label>Site Notes / Project Details</label>
              <textarea className="fi fi--ta" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Describe the project scope, access notes, special requirements..." />
            </div>
          </div>

          {/* Measurements */}
          <div className="form-section">
            <div className="form-section-title">Measurements</div>
            <p className="section-hint">Add or edit measurement rows. Totals update in real time.</p>
            <MeasurementTable rows={measurements} setRows={setMeasurements} editable={true} />
          </div>

          {/* Payments */}
          <div className="form-section">
            <div className="form-section-title">Payment Information</div>
            <div className="payment-policy-banner">
              <span className="banner-icon">💡</span>
              <span>Business Policy: A <strong>50% downpayment</strong> is required before project commences.</span>
            </div>

            <div className="form-grid-2 mt-12">
              <div className="form-field">
                <label>Computed Total</label>
                <div className="fi fi--read">{fmtCurrency(computed)}</div>
              </div>
              <div className="form-field">
                <label>Manual Override (optional){form.manualOverride != "" &&
                  <span className={`si-badge badge-call m-2`}>
                    {"Manual Price"}
                  </span>
                }</label>
                <input type="number" className="fi" placeholder="Enter adjusted total..." value={form.manualOverride} onChange={e => set('manualOverride', e.target.value)} />
              </div>
            </div>

            <div className="total-highlight">
              <div className="total-row">
                <span>Final Estimated Total</span>
                <strong>{fmtCurrency(finalTotal)}</strong>
              </div>
              <div className="total-row total-row--dp">
                <span>50% Downpayment Due</span>
                <strong>{fmtCurrency(downpayment)}</strong>
              </div>
            </div>

            <div className="form-grid-2 mt-12">
              <div className="form-field">
                <label>Payment Terms</label>
                <select className="fi" value={form.paymentTerms} onChange={e => set('paymentTerms', e.target.value)}>
                  {PAYMENT_TERMS_OPTIONS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Downpayment Received?</label>
                <div className="toggle-group">
                  <button type="button" className={`toggle-btn ${form.downpaymentPaid ? 'toggle-btn--active' : ''}`} onClick={() => set('downpaymentPaid', true)}>✅ Yes, Paid</button>
                  <button type="button" className={`toggle-btn ${!form.downpaymentPaid ? 'toggle-btn--active toggle-btn--no' : ''}`} onClick={() => set('downpaymentPaid', false)}>⏳ Not Yet</button>
                </div>
              </div>
            </div>

            {!form.downpaymentPaid && needsPaymentDate && (
              <div className="form-field mt-12 fade-in">
                <label>Agreed Payment Date</label>
                <input type="date" className="fi" value={form.paymentDate} min={today} onChange={e => set('paymentDate', e.target.value)} />
                <span className="field-hint">Client agreed to pay downpayment on this date.</span>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner" /> : null}
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Inspection'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
const SiteInspection = () => {
  const { user } = useContext(UserContext)
  const [inspections, setInspections] = useState([]);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [toast, setToast] = useState(null);
  const [showCanceled, setShowCanceled] = useState(false);
  const nextId = useRef(0);

  useEffect(() => {
    if(!isEmpty(user.token)) {
      getRecords()
    }
  }, [user])

  function getRecords() {
    const token = user.token
    if (!token) return;
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: user.token, user_id: user._id })
    };

    const api_url = window.base_api + "get_order_requests";

    CRUD(api_url, requestOptions, (res) => {
      if (res && res.remarks === "success") {
        setInspections(res.payload);
      } else {
        setInspections([]);
      }
    })
  }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const active = inspections.filter(i => i.status !== 'Cancelled');
  const canceled = inspections.filter(i => i.status === 'Cancelled');

  const filtered = (showCanceled ? canceled : active).filter(i => {
    const normalizedStatus =
      i.status === 'Pending'
        ? 'Needs to be Called'
        : i.status;

    const matchSearch =
      i.clientName.toLowerCase().includes(search.toLowerCase()) ||
      i.siteAddress.toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      filterStatus === 'All' ||
      normalizedStatus === filterStatus;

    return matchSearch && matchStatus;
  });

  const closeModal = () => setModal(null);

  const handleSave = (data) => {
    // Check if it's an update by looking for an existing orderId or database string identifier
    const isUpdate = !!(data.orderId || (data.id && typeof data.id === 'string'));
    
    const api_endpoint = isUpdate ? "update_order_request" : "create_order_request";
    const api_url = window.base_api + api_endpoint;

    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: user.token,
        _id: user._id,       // Account performing the action (used by backend checkAuth/actionLog)
        user_id: user._id,   // Backup identifier matching both endpoint styles
        ...data,
        orderId: data.orderId || data.id // Ensure target identification matches your backend routing variables
      })
    };

    CRUD(api_url, requestOptions, (res) => {
      if (res && res.remarks === "success") {
        showToast(isUpdate ? 'Inspection updated successfully.' : 'New inspection created!');
        getRecords(); // Refresh data rows immediately from database to ensure UI sync
        closeModal();
      } else {
        showToast(res?.message || 'Failed to process inspection entry.', 'danger');
      }
    });
  };

  const handleCancel = (id) => {
    const api_url = window.base_api + "cancel_order_request";

    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: user.token,
        _id: user._id,
        userId: user._id,
        order_id: id,
      })
    };

    CRUD(api_url, requestOptions, (res) => {
      if (res && res.remarks === "success") {
        showToast('Inspection canceled.', 'warning');
        getRecords();
        closeModal();
      } else {
        showToast(res?.message || 'Failed to cancel the inspection order.', 'danger');
      }
    });
  };

  const handleSendContract = (id) => {
    setInspections(prev => prev.map(i => i.id === id ? { ...i, contractSentToCustomer: true } : i));
    showToast('Contract sent to customer successfully!');
  };

  const handleDownloadContract = () => {
    showToast('Contract downloaded as PDF.');
    window.print();
  };

  const stats = [
    { label: 'Total Active', value: active.length, color: 'stat-blue' },
    { label: 'Scheduled', value: active.filter(i => i.status === 'scheduled').length, color: 'stat-indigo' },
    { label: 'Completed', value: active.filter(i => i.status === 'completed').length, color: 'stat-green' },
    { label: 'Pending Payment', value: active.filter(i => i.status === 'pending_payment').length, color: 'stat-amber' },
  ];

  return (
    <div className="si-root">
      {toast && <div className={`si-toast si-toast--${toast.type}`}>{toast.msg}</div>}

      <div className="si-page-header">
        <div>
          <h1 className="si-page-title">Site Inspections</h1>
          <p className="si-page-sub">Manage and track all customer site inspection orders.</p>
        </div>
        <button className="btn-new" onClick={() => setModal({ type: 'new' })}>
          <span>+</span> New Site Inspection
        </button>
      </div>

      <div className="stats-row">
        {stats.map(s => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <div className="stat-val">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="si-toolbar">
        <div className="si-search-wrap">
          <span className="search-icon">🔍</span>
          <input className="si-search" placeholder="Search client or address..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="toolbar-right">
          <select className="si-filter" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="All">All Status</option>
            {STATUS_OPTIONS.filter(s => s !== 'Canceled').map(s => <option key={s}>{s}</option>)}
          </select>
          <button
            className={`toggle-canceled-btn ${showCanceled ? 'active' : ''}`}
            onClick={() => { setShowCanceled(p => !p); setFilterStatus('All'); }}
          >
            🚫 {showCanceled ? 'Show Active' : `Canceled (${canceled.length})`}
          </button>
        </div>
      </div>

      <div className="si-table-card">
        {showCanceled && (
          <div className="canceled-banner">
            <span>🚫</span> Viewing <strong>Canceled Transactions</strong> — {canceled.length} record{canceled.length !== 1 ? 's' : ''}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="si-empty">
            <div className="empty-icon">📋</div>
            <div className="empty-msg">No inspections found</div>
            <div className="empty-sub">Try adjusting your search or filters</div>
          </div>
        ) : (
          <div className="si-scroll">
            <table className="si-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Client</th>
                  <th>Site Address</th>
                  <th>Created</th>
                  <th>Inspection Date</th>
                  <th>Est. Install Date</th>
                  <th>Status</th>
                  <th>Est. Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="si-row">
                    <td className="td-num">{String(item.id).padStart(4, '0')}</td>
                    <td>
                      <div className="client-name">{item.clientName}</div>
                      <div className="client-addr">{item.clientNumber}</div>
                    </td>
                    <td className="td-addr">{item.siteAddress}</td>
                    <td className="td-date">{item.dateCreated}</td>
                    <td className="td-date">{item.inspectionDate}</td>
                    <td className="td-date">{item.estimatedInstallationDate || '—'}</td>
                    <td><StatusBadge status={item.status === 'Pending' ? 'Needs to be Called' : item.status} /></td>
                    <td className="td-price">{fmtCurrency(item.estimatedTotal)}</td>
                    <td>
                      <div className="action-group">
                        <button className="act-btn act-view" title="View" onClick={() => setModal({ type: 'view', inspection: item })}>👁</button>
                        {item.status !== 'Cancelled' && (
                          <>
                            <button className="act-btn act-edit" title="Edit" onClick={() => setModal({ type: 'edit', inspection: item })}>✏️</button>
                            <button className="act-btn act-cancel" title="Cancel" onClick={() => setModal({ type: 'cancel', inspection: item })}>🗑</button>
                            <button className="act-btn act-contract" title="Generate Contract" onClick={() => setModal({ type: 'contract', inspection: item })}>📄</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal?.type === 'new' && (
        <InspectionFormModal onClose={closeModal} onSave={handleSave} />
      )}
      {modal?.type === 'edit' && (
        <InspectionFormModal initial={modal.inspection} onClose={closeModal} onSave={handleSave} />
      )}
      {modal?.type === 'view' && (
        <ViewModal
          inspection={modal.inspection}
          onClose={closeModal}
          onGenerateContract={() => setModal({ type: 'contract', inspection: modal.inspection })}
        />
      )}
      {modal?.type === 'cancel' && (
        <ConfirmCancelModal
          inspection={modal.inspection}
          onConfirm={() => handleCancel(modal.inspection.id)}
          onClose={closeModal}
        />
      )}
      {modal?.type === 'contract' && (
        <ContractModal
          inspection={modal.inspection}
          onClose={closeModal}
          onSend={() => handleSendContract(modal.inspection.id)}
          onDownload={handleDownloadContract}
        />
      )}
    </div>
  );
};

export default SiteInspection;