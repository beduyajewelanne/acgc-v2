import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import './SiteInspection.css';
import { UserContext } from 'App';
import { CRUD } from 'services/data.services';

// ─── Constants & Options ───────────────────────────────────────────────────
const PAYMENT_TERMS_OPTIONS = [
  '50% downpayment, 50% upon completion',
  'Full payment upon completion',
  'Installment (3 months)',
  'Installment (6 months)',
  'Custom arrangement',
];

const STATUS_OPTIONS = ['Needs to be Called', 'Scheduled', 'Completed', 'Pending Payment', 'Canceled'];

const today = new Date().toISOString().split('T')[0];

// ─── Helpers ────────────────────────────────────────────────────────────────
function calcRowTotal(row) {
  const width = parseFloat(row.width) || 0;
  const height = parseFloat(row.height) || 0;
  const price = parseFloat(row.pricePerSqFt) || 0;
  const qty = parseInt(row.qty) || 0;
  
  // Standard metric logic matching image_f39ec2.png: (W * H) / 929.03 * price * qty
  const sqFt = (width * height) / 929.03;
  return sqFt * price * qty;
}

function calcGrandTotal(rows) {
  return (rows || []).reduce((sum, r) => sum + calcRowTotal(r), 0);
}

function fmtCurrency(n) {
  return '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    case 'Canceled':           return { cls: 'badge-canceled',  icon: '🚫' };
    case 'Needs to be Called': return { cls: 'badge-call',      icon: '📞' };
    default:                   return { cls: 'badge-default',   icon: '•' };
  }
}

function mapDbStatusToUi(dbStatus) {
  if (!dbStatus) return 'Needs to be Called';
  const norm = dbStatus.toLowerCase().trim();
  if (norm === 'pending') return 'Needs to be Called';
  if (norm === 'scheduled') return 'Scheduled';
  if (norm === 'completed') return 'Completed';
  if (norm === 'pending payment' || norm === 'pending_payment') return 'Pending Payment';
  if (norm === 'canceled' || norm === 'cancelled') return 'Canceled';
  return 'Needs to be Called';
}

function mapUiStatusToDb(uiStatus) {
  if (uiStatus === 'Needs to be Called') return 'Pending';
  return uiStatus;
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
      { id: Date.now(), product: '', width: '', height: '', qty: 1, pricePerSqFt: '' },
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
    setRows(prev => [...prev, { id: Date.now(), product: '', width: '', height: '', qty: 1, pricePerSqFt: '' }]);
  const removeRow = (id) => setRows(prev => prev.filter(r => r.id !== id));
  
  const update = (id, field, value) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)));
  };

  return (
    <div className="meas-wrapper">
      <div className="meas-scroll">
        <table className="meas-table">
          <thead>
            <tr>
              <th>Product / Description</th>
              <th>Width (cm)</th>
              <th>Height (cm)</th>
              <th>Qty</th>
              <th>Price/sqft (₱)</th>
              <th style={{ minWidth: '120px' }}>Est. Total</th>
              {editable && <th></th>}
            </tr>
          </thead>
          <tbody>
            {(rows || []).map(row => (
              <tr key={row.id}>
                <td>
                  {editable
                    ? <input className="meas-input" value={row.product || ''} onChange={e => update(row.id, 'product', e.target.value)} placeholder="e.g. Sliding Door" />
                    : <span>{row.product}</span>}
                </td>
                <td>
                  {editable
                    ? <input className="meas-input num" type="number" value={row.width ?? ''} onChange={e => update(row.id, 'width', e.target.value)} placeholder="0" />
                    : <span>{row.width}</span>}
                </td>
                <td>
                  {editable
                    ? <input className="meas-input num" type="number" value={row.height ?? ''} onChange={e => update(row.id, 'height', e.target.value)} placeholder="0" />
                    : <span>{row.height}</span>}
                </td>
                <td>
                  {editable
                    ? <input className="meas-input num" type="number" min="1" value={row.qty ?? 1} onChange={e => update(row.id, 'qty', e.target.value)} />
                    : <span>{row.qty}</span>}
                </td>
                <td>
                  {editable
                    ? <input className="meas-input num" type="number" value={row.pricePerSqFt ?? ''} onChange={e => update(row.id, 'pricePerSqFt', e.target.value)} placeholder="0" />
                    : <span>{row.pricePerSqFt}</span>}
                </td>
                {/* Visual fix applied below to prevent line crushing or overflowing */}
                <td className="meas-total" style={{ whiteSpace: 'nowrap', fontWeight: '600' }}>
                  {fmtCurrency(calcRowTotal(row))}
                </td>
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
        <strong style={{ fontSize: '1.1rem' }}>{fmtCurrency(calcGrandTotal(rows))}</strong>
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
    onSend && onSend(() => {
      setSending(false);
      setSent(true);
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="contract-modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-topbar">
          <div>
            <h2 className="modal-title">📄 Service Contract</h2>
            <p className="modal-subtitle">Contract No: {String(inspection.orderId || inspection.id).slice(-8)}</p>
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
            <button className="contract-dl-btn" onClick={onDownload}>⬇️ Download PDF</button>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        {inspection.customerHasAccount ? (
          <div className="contract-info-banner contract-info-banner--blue">
            <span>👤</span>
            <span>Customer has an account · <strong>{inspection.customerEmail}</strong> · You can send the contract directly.</span>
          </div>
        ) : (
          <div className="contract-info-banner contract-info-banner--amber">
            <span>📧</span>
            <span>Customer has no web account. Download the contract and dispatch manually.</span>
          </div>
        )}

        <div className="contract-modal-body">
          <div className="contract-paper-inner">
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
                <div className="contract-num">Contract ID: {inspection.orderId || inspection.id}</div>
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
                {(inspection.measurements || []).map((r, i) => (
                  <tr key={r.id || i}>
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
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Close</button>
          <button className="contract-print-btn" onClick={() => window.print()}>🖨️ Print</button>
          <button className="contract-dl-btn-lg" onClick={onDownload}>⬇️ Download</button>
        </div>
      </div>
    </div>
  );
}

// ─── View Modal ──────────────────────────────────────────────────────────────
function ViewModal({ inspection, onClose, onGenerateContract }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--large" onClick={e => e.stopPropagation()}>
        <div className="modal-topbar">
          <div>
            <h2 className="modal-title">Inspection Details</h2>
            <p className="modal-subtitle">ID: {inspection.orderId || inspection.id} · Created {inspection.dateCreated}</p>
          </div>
          <div className="modal-topbar-actions">
            <button className="gen-contract-btn" onClick={onGenerateContract}>📄 Generate Contract</button>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="modal-body">
          <div className="detail-section">
            <div className="detail-section-title">Client Information</div>
            <div className="detail-grid">
              <div><span className="detail-label">Client Name</span><span className="detail-val">{inspection.clientName}</span></div>
              <div><span className="detail-label">Client Number</span><span className="detail-val">{inspection.clientNumber || '—'}</span></div>
              <div><span className="detail-label">Site Address</span><span className="detail-val">{inspection.siteAddress}</span></div>
              <div><span className="detail-label">Inspection Date</span><span className="detail-val">{inspection.inspectionDate}</span></div>
              <div><span className="detail-label">Status</span><StatusBadge status={inspection.status} /></div>
            </div>
          </div>

          <div className="detail-section">
            <div className="detail-section-title">Measurements Bundle</div>
            <MeasurementTable rows={inspection.measurements} setRows={() => {}} editable={false} />
          </div>

          <div className="detail-section">
            <div className="detail-section-title">Payment Summary</div>
            <div className="payment-summary-box">
              <div className="payment-row">
                <span>Estimated Grand Total</span>
                <strong>{fmtCurrency(inspection.estimatedTotal)}</strong>
              </div>
              <div className="payment-row highlight">
                <span>50% Downpayment Due</span>
                <strong>{fmtCurrency(inspection.estimatedTotal * 0.5)}</strong>
              </div>
              <div className="payment-row">
                <span>Payment Terms</span>
                <span>{inspection.paymentTerms}</span>
              </div>
            </div>
          </div>
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
          <h2 className="modal-title">Cancel Action</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="confirm-body">
            <div className="confirm-icon">🚫</div>
            <p className="confirm-msg">Are you sure you want to cancel inspection logs for order <strong>{inspection.orderId || inspection.id}</strong>?</p>
            <div className="confirm-actions">
              <button className="btn-ghost" onClick={onClose}>Go Back</button>
              <button className="btn-danger" onClick={onConfirm}>Confirm Cancel</button>
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
    isEdit ? { ...initial, manualOverride: '' } : emptyForm()
  );
  
  // Real-time responsive dynamic updates hooked across row tracking lists
  const [measurements, setMeasurements] = useState(form.measurements || []);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const computed = calcGrandTotal(measurements);
  const finalTotal = form.manualOverride !== '' ? parseFloat(form.manualOverride) || 0 : computed;
  const downpayment = finalTotal * 0.5;

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const validate = () => {
    const e = {};
    if (!form.clientName?.trim()) e.clientName = 'Required';
    if (!form.siteAddress?.trim()) e.siteAddress = 'Required';
    if (!form.inspectionDate) e.inspectionDate = 'Required';
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    onSave({
      ...form,
      measurements,
      estimatedTotal: finalTotal,
      dateCreated: isEdit ? form.dateCreated : today,
    }, () => {
      setSaving(false);
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--large" onClick={e => e.stopPropagation()}>
        <div className="modal-topbar">
          <div>
            <h2 className="modal-title">{isEdit ? 'Edit Grouped Inspection' : 'New Site Inspection'}</h2>
            <p className="modal-subtitle">ID: {isEdit ? form.orderId : 'New Record Generation File'}</p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-section">
            <div className="form-section-title">Client Identity Profile</div>
            <div className="form-grid-3">
              <div className="form-field">
                <label>Client Name <span className="req">*</span></label>
                <input className={`fi ${errors.clientName ? 'fi--err' : ''}`} value={form.clientName || ''} onChange={e => set('clientName', e.target.value)} />
              </div>
              <div className="form-field">
                <label>Contact Number</label>
                <input className="fi" value={form.clientNumber || ''} onChange={e => set('clientNumber', e.target.value)} />
              </div>
              <div className="form-field">
                <label>Site Target Address <span className="req">*</span></label>
                <input className={`fi ${errors.siteAddress ? 'fi--err' : ''}`} value={form.siteAddress || ''} onChange={e => set('siteAddress', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">Measurements Configuration</div>
            <p className="section-hint">Row adjustments update the structural calculations panel below in real time.</p>
            {/* Direct row listener binds calculation updates instantaneously */}
            <MeasurementTable rows={measurements} setRows={setMeasurements} editable={true} />
          </div>

          <div className="form-section">
            <div className="form-section-title">Calculation Matrix Overview</div>
            <div className="total-highlight">
              <div className="total-row">
                <span>Calculated Total</span>
                <strong>{fmtCurrency(computed)}</strong>
              </div>
              <div className="total-row total-row--dp">
                <span>50% Downpayment Matrix</span>
                <strong>{fmtCurrency(downpayment)}</strong>
              </div>
            </div>

            <div className="form-grid-2 mt-12">
              <div className="form-field">
                <label>Operational Status</label>
                <select className="fi" value={form.status} onChange={e => set('status', e.target.value)}>
                  {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Payment Selection Options</label>
                <select className="fi" value={form.paymentTerms} onChange={e => set('paymentTerms', e.target.value)}>
                  {PAYMENT_TERMS_OPTIONS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Commit Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Workspace Component ────────────────────────────────────────────────
const SiteInspection = () => {
  const { user } = useContext(UserContext);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showCanceled, setShowCanceled] = useState(false);

  const fetchGroupedRequests = useCallback(() => {
    if (!user?.token) return;
    try {
      CRUD(window.base_api + "get_order_requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: user.token, user_id: user._id })
      }, (res) => {
        if (res.remarks === "success" && Array.isArray(res.payload)) {
          const processed = res.payload.map(item => ({
            ...item,
            status: mapDbStatusToUi(item.status)
          }));
          setInspections(processed);
        }
        setLoading(false);
      });
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchGroupedRequests(); }, [fetchGroupedRequests]);

  const handleSave = (data, cb) => {
    if (!user?.token) return;
    CRUD(window.base_api + "update_order_request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, token: user.token, user_id: user._id, status: mapUiStatusToDb(data.status) })
    }, (res) => {
      if (res.remarks === "success") {
        fetchGroupedRequests();
        setModal(null);
      }
      if (cb) cb();
    });
  };

  const handleCancel = (item) => {
    if (!user?.token) return;
    CRUD(window.base_api + "update_order_request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: user.token, user_id: user._id, orderId: item.orderId, status: "Canceled" })
    }, () => {
      fetchGroupedRequests();
      setModal(null);
    });
  };

  const active = inspections.filter(i => i.status !== 'Canceled');
  const canceled = inspections.filter(i => i.status === 'Canceled');
  const currentSet = showCanceled ? canceled : active;

  const filtered = currentSet.filter(i => 
    (i.clientName.toLowerCase().includes(search.toLowerCase()) || i.orderId.toLowerCase().includes(search.toLowerCase())) &&
    (filterStatus === 'All' || i.status === filterStatus)
  );

  if (loading) return <div className="si-root"><p>Loading site records data...</p></div>;

  return (
    <div className="si-root">
      <div className="si-page-header">
        <div>
          <h1 className="si-page-title">Grouped Site Inspections</h1>
          <p className="si-page-sub">Orders sharing identical IDs remain grouped together dynamically.</p>
        </div>
      </div>

      <div className="si-toolbar">
        <input className="si-search" style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }} placeholder="Search order ID or client name..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="toolbar-right" style={{ display: 'flex', gap: '10px' }}>
          <select className="si-filter" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="All">All Active Statuses</option>
            {STATUS_OPTIONS.filter(s => s !== 'Canceled').map(s => <option key={s}>{s}</option>)}
          </select>
          <button className="toggle-canceled-btn" onClick={() => setShowCanceled(!showCanceled)}>
            {showCanceled ? '👁 View Active' : `🚫 Show Canceled (${canceled.length})`}
          </button>
        </div>
      </div>

      <div className="si-table-card">
        <table className="si-table">
          <thead>
            <tr>
              <th>Order Tracking ID</th>
              <th>Client Information</th>
              <th>Address Location</th>
              <th>Items</th>
              <th>Status Badge</th>
              <th>Grand Total</th>
              <th>Action Panel</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.orderId} className="si-row">
                <td style={{ fontWeight: '600', color: '#4f46e5' }}>{item.orderId}</td>
                <td>
                  <div className="client-name">{item.clientName}</div>
                  <div style={{ fontSize: '0.8rem', color: '#666' }}>{item.clientNumber}</div>
                </td>
                <td>{item.siteAddress}</td>
                <td style={{ fontSize: '0.85rem', color: '#444' }}>
                  {item.measurements.length} Architectural Line item(s)
                </td>
                <td><StatusBadge status={item.status} /></td>
                <td style={{ fontWeight: '700' }}>{fmtCurrency(item.estimatedTotal)}</td>
                <td>
                  <div className="action-group">
                    <button className="act-btn act-view" onClick={() => setModal({ type: 'view', inspection: item })}>👁</button>
                    {item.status !== 'Canceled' && (
                      <>
                        <button className="act-btn act-edit" onClick={() => setModal({ type: 'edit', inspection: item })}>✏️</button>
                        <button className="act-btn act-cancel" onClick={() => setModal({ type: 'cancel', inspection: item })}>🗑</button>
                        <button className="act-btn act-contract" onClick={() => setModal({ type: 'contract', inspection: item })}>📄</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal?.type === 'view' && <ViewModal inspection={modal.inspection} onClose={() => setModal(null)} onGenerateContract={() => setModal({ type: 'contract', inspection: modal.inspection })} />}
      {modal?.type === 'edit' && <InspectionFormModal initial={modal.inspection} onClose={() => setModal(null)} onSave={handleSave} />}
      {modal?.type === 'cancel' && <ConfirmCancelModal inspection={modal.inspection} onConfirm={() => handleCancel(modal.inspection)} onClose={() => setModal(null)} />}
      {modal?.type === 'contract' && <ContractModal inspection={modal.inspection} onClose={() => setModal(null)} onDownload={() => window.print()} />}
    </div>
  );
};

export default SiteInspection;