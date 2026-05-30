import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import './SiteInspection.css';
import { UserContext } from 'App';
import { CRUD, isEmpty } from 'services/data.services';
import html2pdf from 'html2pdf.js';

const PAYMENT_TERMS_OPTIONS = [
  '50% downpayment, 50% upon completion',
  'Full payment',
  'Installment (3 months)',
  'Installment (6 months)',
  'Custom arrangement',
];

const STATUS_OPTIONS = ['Needs to be Called', 'Scheduled', 'Completed', 'Pending Payment', 'Cancelled'];

const today = new Date().toISOString().split('T')[0];

// ─── Helpers ────────────────────────────────────────────────────────────────
const calcRowTotal = (row) => {
  const w = parseFloat(row.width) || 0;
  const h = parseFloat(row.height) || 0;
  const rate = parseFloat(row.pricePerSqFt) || 0;
  const qty = parseInt(row.qty) || 1;

  if (w === 0 || h === 0 || rate === 0) return 0;

  // Convert given dimensions systematically to Feet (sq.ft tracking)
  const toFeet = (val, unit) => {
    const u = String(unit).toLowerCase().trim();
    if (u === 'ft' || u === 'feet') return val;
    if (u === 'm' || u === 'meter') return val * 3.28084;
    if (u === 'in' || u === 'inch') return val / 12; // Handles both 'in' and 'inch'
    if (u === 'cm') return val / 30.48;
    return val;
  };

  const calculatedArea = toFeet(w, row.unit) * toFeet(h, row.unit);
  return calculatedArea * rate * qty;
};

const calcGrandTotal = (rows) => {
  if (!Array.isArray(rows)) return 0;
  return rows.reduce((sum, row) => sum + calcRowTotal(row), 0);
};

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
  const { user } = useContext(UserContext);
  const [products, setProducts] = useState([]);

  // Fetch active products from the DB on component mount
  useEffect(() => {
    if (!user || !user.token) return;

    const apiUri = (window.base_api || `http://localhost:5000/api/`).replace('/api/', '') + '/api/get_products';
    const payload = {
      token: user.token,
      _id: user._id,
      archive: 0 // Fetch only active, non-archived products
    };

    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    };

    CRUD(apiUri, requestOptions, (res) => {
      if (res && res.remarks === 'success' && Array.isArray(res.payload)) {
        setProducts(res.payload);
      }
    });
  }, [user]);

  // Append a fresh custom or blank row tracking frame
  const addRow = () =>
    setRows(prev => [
      ...prev, 
      { id: Date.now(), product: '', width: '', height: '', qty: 1, pricePerSqFt: '', unit: 'in' }
    ]);

  const removeRow = (id) => setRows(prev => prev.filter(r => r.id !== id));

  const update = (id, field, value) =>
    setRows(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)));

  // Overwrites custom entry dimensions dynamically when a base product item is chosen
  const handleProductSelection = (id, selectedName) => {
    const matchingProduct = products.find(p => p.name === selectedName);
    
    if (matchingProduct) {
      setRows(prev => prev.map(r => {
        if (r.id === id) {
          return {
            ...r,
            product: matchingProduct.name,
            width: matchingProduct.width || '',
            height: matchingProduct.height || '',
            unit: matchingProduct.unit || 'in',
            pricePerSqFt: matchingProduct.pricePerSqFt || ''
          };
        }
        return r;
      }));
    } else {
      // Allows falling back to a custom product option if needed
      update(id, 'product', selectedName);
    }
  };

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
                {/* Product Dropdown Selection with Override Support */}
                <td>
                  {editable ? (
                    <select 
                      className="meas-input" 
                      value={row.product} 
                      onChange={e => handleProductSelection(row.id, e.target.value)}
                    >
                      <option value="">-- Select Active Product --</option>
                      {products.map(p => (
                        <option key={p._id?.$oid || p._id} value={p.name}>
                          {p.name} {p.variant ? `(${p.variant})` : ''}
                        </option>
                      ))}
                      {/* Preserves rendering if custom items already exist in data rows */}
                      {row.product && !products.some(p => p.name === row.product) && (
                        <option value={row.product}>{row.product} (Custom Entry)</option>
                      )}
                    </select>
                  ) : (
                    <span>{row.product}</span>
                  )}
                </td>

                {/* Overridable Width Field */}
                <td>
                  {editable ? (
                    <input 
                      className="meas-input num" 
                      type="number" 
                      value={row.width} 
                      onChange={e => update(row.id, 'width', e.target.value)} 
                      placeholder="0" 
                    />
                  ) : (
                    <span>{row.width}</span>
                  )}
                </td>

                {/* Overridable Height Field */}
                <td>
                  {editable ? (
                    <input 
                      className="meas-input num" 
                      type="number" 
                      value={row.height} 
                      onChange={e => update(row.id, 'height', e.target.value)} 
                      placeholder="0" 
                    />
                  ) : (
                    <span>{row.height}</span>
                  )}
                </td>

                {/* Overridable Measuring Unit Dropdown Column */}
                <td>
                  {/* {editable ? (
                    <select 
                      className="meas-input" 
                      style={{ minWidth: '75px' }} 
                      value={row.unit || 'in'} 
                      onChange={e => update(row.id, 'unit', e.target.value)}
                    >
                      <option value="in">in</option>
                      <option value="cm">cm</option>
                      <option value="ft">ft</option>
                      <option value="m">m</option>
                    </select>
                  ) : ( */}
                    <span className="paid-chip" style={{ background: '#e2e8f0', color: '#4a5568' }}>
                      {row.unit || 'in'}
                    </span>
                  {/* )} */}
                </td>

                {/* Quantity Factor Tracker */}
                <td>
                  {editable ? (
                    <input 
                      className="meas-input num" 
                      type="number" 
                      min="1" 
                      value={row.qty} 
                      onChange={e => update(row.id, 'qty', e.target.value)} 
                    />
                  ) : (
                    <span>{row.qty}</span>
                  )}
                </td>

                {/* Overridable Rate Parameter Per Square Foot */}
                <td>
                  {/* {editable ? (
                    <input 
                      className="meas-input num" 
                      type="number" 
                      value={row.pricePerSqFt} 
                      onChange={e => update(row.id, 'pricePerSqFt', e.target.value)} 
                      placeholder="0" 
                    />
                  ) : ( */}
                    <span>{row.pricePerSqFt}</span>
                  {/* )} */}
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
function ContractModal({ inspection, onClose, onSend, permissions }) {
  const contractPaperRef = useRef(null);
  console.log(inspection);
  
  const grand = inspection.manualOverride && inspection.manualOverride !== ""
    ? parseFloat(inspection.manualOverride)
    : (inspection.estimatedTotal || calcGrandTotal(inspection.measurements));
  const dp = grand * 0.5;
  const contractDate = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(inspection.contractSentToCustomer || false);

  const handleDownloadPDF = () => {
    const element = contractPaperRef.current;
    if (!element) return;

    const options = {
      margin:       [0.3, 0.3, 0.3, 0.3], 
      filename:     `Contract_SI-${String(inspection.id).padStart(4, '0')}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        letterRendering: true,
        windowWidth: 816, 
        windowHeight: 1056 
      },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' },
      pagebreak:    { mode: ['avoid-all', 'css'] } 
    };

    const exporter = window.html2pdf ? window.html2pdf : html2pdf;
    
    if (exporter) {
      exporter().set(options).from(element).save();
    } else {
      alert("PDF download engine is loading. Please try again.");
    }
  };

  const handleSend = () => {
    const element = contractPaperRef.current;
    if (!element) return;

    const exporter = window.html2pdf ? window.html2pdf : html2pdf;
    if (!exporter) {
      alert("PDF engine is still loading. Please try again.");
      return;
    }

    setSending(true);

    const options = {
      margin:       [0.3, 0.3, 0.3, 0.3],
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    exporter().set(options).from(element).outputPdf('blob').then((pdfBlob) => {
      const formData = new FormData();
      formData.append('contractFile', pdfBlob, `Contract_SI-${String(inspection.id).padStart(4, '0')}.pdf`);
      formData.append('inspectionId', inspection.id);
      formData.append('orderId', inspection.id || '');
      formData.append('customerEmail', inspection.customerEmail || '');
      formData.append('contractId', `CTR-${String(inspection.id).padStart(4, '0')}`);

      const apiUri = (window.base_api || `http://localhost:5000/api/`).replace('/api/', '') + '/api/send_contract_email';

      fetch(apiUri, {
        method: 'POST',
        body: formData,
      })
      .then((res) => res.json())
      .then((data) => {
        setSending(false);
        if (data.remarks === 'success') {
          setSent(true);
          onSend && onSend();
        } else {
          alert(data.message || 'Failed to dispatch contract email.');
        }
      })
      .catch((err) => {
        setSending(false);
        console.error("Error sending contract:", err);
        alert('Network integration failure occurred while preparing document email.');
      });
    });
  };

  // Normalization logic mapping payment option states
  const cleanedTerms = String(inspection.paymentTerms || '').trim();
  const is50PercentDp = cleanedTerms === '50% downpayment, 50% upon completion';
  const isFullPayment = cleanedTerms === 'Full payment';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="contract-modal-box" onClick={e => e.stopPropagation()}>
        {/* Modal Header Actions */}
        <div className="modal-topbar">
          <div>
            <h2 className="modal-title">📄 Service Contract</h2>
            <p className="modal-subtitle">Contract No: CTR-{String(inspection.id).padStart(4, '0')}</p>
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
            <button className="contract-dl-btn" onClick={handleDownloadPDF} hidden={permissions?.modules?.["Site Inspection"]?.["Download Contract"] !== 1}>
              ⬇️ Download PDF
            </button>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        {/* Scrollable Contract Body Wrapper */}
        <div className="contract-modal-body">
          <div 
            className="contract-paper-inner" 
            ref={contractPaperRef} 
            style={{ 
              background: '#ffffff', 
              padding: '24px',
              fontSize: '13px', 
              lineHeight: '1.4',
              pageBreakInside: 'avoid'
            }}
          >
            {/* Header */}
            <div className="contract-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div className="contract-logo">
                <div className="contract-logo-icon">◆</div>
                <div>
                  <div className="contract-biz" style={{ fontSize: '16px', fontWeight: 'bold' }}>ACGC Glass & Aluminum Services</div>
                  <div className="contract-tagline" style={{ fontSize: '11px' }}>Glass &amp; Aluminum Specialists</div>
                </div>
              </div>
              <div className="contract-meta" style={{ textAlign: 'right' }}>
                <div className="contract-title" style={{ fontSize: '16px', fontWeight: 'bold', color: '#2b6cb0' }}>SERVICE CONTRACT</div>
                <div className="contract-num" style={{ fontSize: '12px' }}>Contract No: CTR-{String(inspection.id).padStart(4, '0')}</div>
                <div className="contract-date" style={{ fontSize: '12px' }}>Date: {contractDate}</div>
              </div>
            </div>

            <div className="contract-divider" style={{ margin: '10px 0' }} />

            <div className="contract-parties" style={{ marginBottom: '15px' }}>
              <div>
                <div className="contract-label" style={{ fontSize: '10px', color: '#718096' }}>SERVICE PROVIDER</div>
                <div className="contract-value" style={{ fontWeight: 'bold' }}>GlassAlum Pro Inc.</div>
                <div className="contract-sub">Olongapo City, Zambales</div>
              </div>
              <div>
                <div className="contract-label" style={{ fontSize: '10px', color: '#718096' }}>CLIENT</div>
                <div className="contract-value" style={{ fontWeight: 'bold' }}>{inspection.clientName}</div>
                <div className="contract-sub">{inspection.clientAddress}</div>
              </div>
            </div>

            <div className="contract-section-title" style={{ fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #edf2f7', paddingBottom: '2px', marginBottom: '6px' }}>SCOPE OF WORK</div>
            <div className="contract-site-info" style={{ marginBottom: '10px', fontSize: '12px' }}>
              <span><b>Site Address:</b> {inspection.siteAddress}</span> | <span><b>Inspection Date:</b> {inspection.inspectionDate}</span>
              {inspection.estimatedInstallationDate && (
                <> | <span><b>Est. Installation Date:</b> {inspection.estimatedInstallationDate}</span></>
              )}
            </div>

            <table className="contract-table" style={{ width: '100%', marginBottom: '15px', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f7fafc' }}>
                  <th style={{ padding: '6px' }}>#</th>
                  <th style={{ padding: '6px', textAlign: 'left' }}>Product / Description</th>
                  <th style={{ padding: '6px' }}>W×H (Unit)</th>
                  <th style={{ padding: '6px' }}>Qty</th>
                  <th style={{ padding: '6px' }}>Rate/sqft</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {inspection.measurements.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                    <td style={{ padding: '6px', textAlign: 'center' }}>{i + 1}</td>
                    <td style={{ padding: '6px' }}>{r.product}</td>
                    <td style={{ padding: '6px', textAlign: 'center' }}>{r.width}×{r.height} <small style={{ color: '#666' }}>({r.unit || 'in'})</small></td>
                    <td style={{ padding: '6px', textAlign: 'center' }}>{r.qty}</td>
                    <td style={{ padding: '6px', textAlign: 'center' }}>{fmtCurrency(r.pricePerSqFt)}</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>{fmtCurrency(calcRowTotal(r))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 'bold', background: '#f7fafc' }}>
                  <td colSpan="5" style={{ padding: '8px', textAlign: 'right' }}>TOTAL CONTRACT AMOUNT</td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#2b6cb0' }}>{fmtCurrency(grand)}</td>
                </tr>
              </tfoot>
            </table>

            {/* PAYMENT TERMS WRAPPER */}
            <div className="contract-payment-box" style={{ background: '#f8fafc', padding: '10px', borderRadius: '4px', marginBottom: '12px' }}>
              <div className="contract-section-title" style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>PAYMENT TERMS</div>
              <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '500', color: '#2d3748' }}>{inspection.paymentTerms}</p>
              
              {/* Scenario 1: Standard 50% split milestone mapping */}
              {is50PercentDp && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
                    <span>50% Downpayment Required:</span>
                    <strong>{fmtCurrency(dp)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span>Balance Upon Completion:</span>
                    <strong>{fmtCurrency(grand - dp)}</strong>
                  </div>
                </>
              )}

              {/* Scenario 2: Standard Full Payment matching display layout */}
              {isFullPayment && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>Total Due Amount:</span>
                  <strong>{fmtCurrency(grand)}</strong>
                </div>
              )}

              {/* Scenario 3: All custom arrangements or installments displaying the critical payment date line */}
              {!is50PercentDp && !isFullPayment && (
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#e53e3e', fontWeight: '600', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #edf2f7', paddingTop: '4px' }}>
                  <span>Payment Schedule Constraint:</span>
                  <span>Required payment date is by: {inspection.paymentDate ? new Date(inspection.paymentDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Specified Project Milestone Schedule'}</span>
                </div>
              )}
            </div>

            {/* WARRANTY SECTION */}
            <div className="contract-section-title" style={{ fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #edf2f7', paddingBottom: '2px', marginBottom: '4px' }}>WARRANTY</div>
            
            {inspection.warrantyTerms && Array.isArray(inspection.warrantyTerms) && inspection.warrantyTerms.length > 0 ? (
              inspection.warrantyTerms.map((term, index) => (
                <div key={index} className="contract-warranty-box" style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '11px' }}>
                  <div style={{ fontSize: '14px' }}>🛡️</div>
                  <div>
                    <strong>{term.title || 'Warranty Term'}:</strong> {term.description || term}
                  </div>
                </div>
              ))
            ) : (
              <div className="contract-warranty-box" style={{ display: 'flex', gap: '8px', marginBottom: '12px', fontSize: '11px' }}>
                <div style={{ fontSize: '16px' }}>🛡️</div>
                <div>
                  <strong>90-Day Warranty:</strong> GlassAlum Pro Inc. provides a 90-day warranty on all installed products and workmanship starting from installation completion.
                </div>
              </div>
            )}

            {/* DYNAMIC WARNINGS / CRITICAL CONDITIONS BANNER BLOCK (Bypassed if Full Payment) */}
            {!isFullPayment && (
              inspection.conditions && Array.isArray(inspection.conditions) && inspection.conditions.length > 0 ? (
                inspection.conditions.map((cond, index) => (
                  <div key={index} className="contract-warranty-box" style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '11px', backgroundColor: '#fef3c7', padding: '10px', borderRadius: '4px', border: '1px solid #fde68a', color: '#92400e' }}>
                    <div style={{ fontSize: '14px' }}>⚠️</div>
                    <div>
                      <strong>{cond.type || 'NOTICE'}:</strong> {cond.text || cond}
                    </div>
                  </div>
                ))
              ) : (
                <div className="contract-warranty-box" style={{ display: 'flex', gap: '8px', marginBottom: '12px', fontSize: '11px', backgroundColor: '#f0c400', padding: '10px', borderRadius: '4px' }}>
                  <div style={{ fontSize: '16px' }}>⚠️</div>
                  <div>
                    <strong>WARNING:</strong> 50% Down Payment is Required to start the project based on the store policy.
                  </div>
                </div>
              )
            )}

            {inspection.notes && (
              <div style={{ marginBottom: '12px' }}>
                <div className="contract-section-title" style={{ fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #edf2f7', paddingBottom: '2px', marginBottom: '4px' }}>NOTES &amp; SPECIAL INSTRUCTIONS</div>
                <p style={{ margin: '0', fontSize: '11px', color: '#4a5568' }}>{inspection.notes}</p>
              </div>
            )}

            {/* Signature Block */}
            <div className="contract-section-title" style={{ fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #edf2f7', paddingBottom: '2px', marginBottom: '10px' }}>CLIENT ACKNOWLEDGMENT</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '15px' }}>
              <div style={{ width: '45%' }}>
                <div style={{ borderTop: '1px solid #4a5568', marginTop: '30px', paddingTop: '4px', fontSize: '11px', textAlign: 'center' }}>
                  Client Signature &amp; Printed Name
                </div>
                <div style={{ fontSize: '10px', textAlign: 'center', color: '#718096', marginTop: '2px' }}>{inspection.clientName}</div>
              </div>
              <div style={{ width: '50%', background: '#f7fafc', padding: '8px', borderRadius: '4px', fontSize: '10px', color: '#718096', lineHeight: '1.3' }}>
                <strong>Admin Note:</strong> This contract is officially issued by GlassAlum Pro Inc. Administration. Signature is implicit upon automated generation.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
// ─── View Modal ──────────────────────────────────────────────────────────────
function ViewModal({ inspection, onClose, onGenerateContract, permissions }) {
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
            <button className="gen-contract-btn" onClick={onGenerateContract} hidden={(permissions?.modules?.["Site Inspection"]?.["Generate Contract"] !== 1 && !inspection.estimatedInstallationDate) || !inspection.estimatedInstallationDate}>📄 Generate Contract</button>
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

function ConfirmManualApproveModal({ inspection, onConfirm, onClose }) {
  const [dragging, setDragging] = useState(false);
  const [proof, setProof] = useState(null); 
  const inputRef = useRef(null);

  // Optimized file handling parser helper
  const processIncomingFiles = (files) => {
    if (!files || files.length === 0) return;
    const targetFile = files[0];
    
    setProof({
      id: Date.now() + '-' + Math.random(),
      file: targetFile,
      name: targetFile.name,
      url: URL.createObjectURL(targetFile)
    });
  };

  const onRemove = () => {
    if (proof?.url) URL.revokeObjectURL(proof.url); 
    setProof(null);
  };

  const handleSubmitApproval = () => {
    console.log(proof)
    if (!proof) {
      alert("Please upload or drag a PDF or Image contract/receipt to complete the manual approval process.");
      return;
    }
    onConfirm(inspection.id || inspection._id, proof.file);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box small-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', borderRadius: '12px' }}>
        
        {/* Modal Header */}
        <div style={{ marginBottom: '16px' }}>
          <h2 className="modal-title" style={{ fontSize: '18px', fontWeight: '600', color: '#1a202c', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🔒</span> Confirm Manual Approval
          </h2>
          <p className="modal-desc" style={{ fontSize: '13px', color: '#718096', marginTop: '6px', lineHeight: '1.4' }}>
            You are manually approving the contract for Order <strong>{inspection.orderId || `SI-${inspection.id}`}</strong>. Please upload the signed contract or payment receipt record to proceed.
          </p>
        </div>

        {/* Drag and Drop Zone Wrapper */}
        <div className="pm-proof-wrap" style={{ marginBottom: '24px' }}>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { 
              e.preventDefault(); 
              setDragging(false); 
              // FIXED: Dragged items live exclusively inside e.dataTransfer.files
              if (e.dataTransfer && e.dataTransfer.files) {
                processIncomingFiles(e.dataTransfer.files);
              }
            }}
            onClick={() => inputRef.current.click()}
            className={`pm-dropzone ${dragging ? 'pm-dragging' : ''}`}
            style={{
              border: dragging ? '2px dashed #2b6cb0' : '2px dashed #cbd5e0',
              backgroundColor: dragging ? '#ebf8ff' : '#f7fafc',
              borderRadius: '8px',
              padding: '24px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*,application/pdf"
              className="pm-hidden"
              style={{ display: 'none' }}
              // FIXED: Input browser selections live inside e.target.files
              onChange={(e) => processIncomingFiles(e.target.files)}
            />
            
            <div className="pm-dropzone-label" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#4a5568', fontSize: '13px' }}>
              <svg className="pm-dropzone-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '36px', height: '36px', color: '#a0aec0' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Drag &amp; drop signed contract/receipt here, or <span className="pm-browse-link" style={{ color: '#2b6cb0', fontWeight: '600', textDecoration: 'underline' }}>browse</span></span>
              <span style={{ fontSize: '11px', color: '#a0aec0' }}>Supports PDF, PNG, JPG up to 10MB</span>
            </div>
          </div>

          {/* Uploaded File View Layout Block */}
          {proof && (
            <div className="pm-proof-grid" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#4a5568' }}>Selected Document:</span>
              <div className="pm-proof-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#edf2f7', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', maxHeight: "100px" }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '0'}}>
                  <span style={{ fontSize: '16px' }}>{proof.file.type === "application/pdf" ? "📄" : "🖼️"}</span>
                  <span style={{ fontSize: '13px', color: '#2d3748', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proof.name}</span>
                </div>
                <button 
                  type="button"
                  className="pm-proof-remove" 
                  onClick={(e) => { e.stopPropagation(); onRemove(); }}
                  style={{ background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: '14px', padding: '0 4px', fontWeight: 'bold' }}
                  title="Remove file"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
          <button type="button" className="btn-danger" onClick={onClose} style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '500' }}>
            Cancel
          </button>
          <button 
            type="button"
            className="btn-primary" 
            onClick={handleSubmitApproval}
            style={{ 
              padding: '8px 16px', 
              borderRadius: '6px', 
              fontSize: '13px', 
              fontWeight: '500', 
              backgroundColor: !proof ? '#cbd5e0' : '#2b6cb0', 
              color: '#fff',
              cursor: !proof ? 'not-allowed' : 'pointer'
            }}
            disabled={!proof}
          >
            Complete Approval
          </button>
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
    if (form.paymentTerms === 'Custom arrangement' && !form.paymentDate) e.paymentDate = 'Required';
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
    && form.paymentTerms !== 'Full payment'
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
                <input type="date" className={`fi ${errors.inspectionDate ? 'fi--err' : ''}`} value={form.inspectionDate} min={today} onChange={e => { set('inspectionDate', e.target.value); set('status', 'Scheduled'); setErrors(x=>({...x,inspectionDate:''})); }} />
                {errors.inspectionDate && <span className="err-msg">{errors.inspectionDate}</span>}
              </div>
              <div className="form-field">
                <label>Est. Installation Date</label>
                <input type="date" className="fi" value={form.estimatedInstallationDate} min={form.inspectionDate || today} onChange={e => set('estimatedInstallationDate', e.target.value)} />
                <span className="field-hint">Estimated date when installation will begin.</span>
              </div>
              <div className="form-field">
                <label>Status</label>
                {/* <select className="fi" value={form.status} onChange={e => set('status', e.target.value)} disabled>
                  {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select> */}
                <div><StatusBadge status={form.status === 'Pending' ? 'Needs to be Called' : form.status} /></div>
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
                <label>Agreed Payment Date<span className="req">*</span></label>
                <input type="date" className="fi" value={form.paymentDate} min={today} onChange={e => set('paymentDate', e.target.value)} />
                {errors.paymentDate && <span className="err-msg">{errors.paymentDate}</span>}
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
  const { user, permissions } = useContext(UserContext)
  const [inspections, setInspections] = useState([]);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [toast, setToast] = useState(null);
  const [showCanceled, setShowCanceled] = useState(false);
  const nextId = useRef(0);
  // console.log(permissions)
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
  ;}

  const handleManualApprove = (id, selectedFile) => {
    // Guard clause to ensure an administrative verification file is selected
    if (!selectedFile) {
      showToast('Please attach a verification receipt file before approving.', 'danger');
      return;
    }

    const api_url = window.base_api + "manual_approve_order";

    // Use FormData to allow file streams alongside text payloads
    const formData = new FormData();
    formData.append('orderId', id);
    formData.append('receiptFile', selectedFile); // Must match upload.single('receiptFile')

    // Retain your user context validations if needed by the api layer
    formData.append('token', user.token);
    formData.append('_id', user._id);
    formData.append('contractId', `CTR-${String(id).padStart(4, '0')}`);
    formData.append('userId', user._id);

    const requestOptions = {
      method: "POST",
      body: formData,
      // CRITICAL: Do NOT set "Content-Type" header here. 
      // The browser will automatically assign multi-part/form-data with the correct boundary identifier.
    };

    CRUD(api_url, requestOptions, (res) => {
      if (res && res.remarks === "success") {
        showToast('Inspection Order Manually Approved.', 'success');
        getRecords();
        closeModal();
      } else {
        showToast(res?.message || 'Failed to approve the inspection order.', 'danger');
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
    { label: 'Scheduled', value: active.filter(i => i.status === 'Scheduled').length, color: 'stat-indigo' },
    { label: 'Completed', value: active.filter(i => i.status === 'Completed').length, color: 'stat-green' },
    { label: 'Pending Payment', value: active.filter(i => i.status === 'Pending Payment').length, color: 'stat-amber' },
  ];

  return (
    <div className="si-root">
      {toast && <div className={`si-toast si-toast--${toast.type}`} style={{ zIndex: 999999 }}>{toast.msg}</div>}

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
                        <button className="act-btn act-view" title="View" onClick={() => setModal({ type: 'view', inspection: item })} hidden={permissions?.modules?.["Site Inspection"]?.["View Details"] !== 1}>👁</button>
                        {item.status !== 'Cancelled' && (
                          <>
                            <button className="act-btn act-edit" title="Edit" onClick={() => setModal({ type: 'edit', inspection: item })} hidden={permissions?.modules?.["Site Inspection"]?.["Edit"] !== 1}>✏️</button>
                            <button className="act-btn act-edit" title="Manual Approve" onClick={() => setModal({ type: 'manual-approve', inspection: item })} hidden={item.customerHasAccount != false || permissions?.modules?.["Site Inspection"]?.["Edit"] !== 1}>✔️</button>
                            <button className="act-btn act-cancel" title="Cancel" onClick={() => setModal({ type: 'cancel', inspection: item })} hidden={permissions?.modules?.["Site Inspection"]?.["Cancel"] !== 1}>🗑</button>
                            <button className="act-btn act-contract" title="Generate Contract" onClick={() => setModal({ type: 'contract', inspection: item })} hidden={(permissions?.modules?.["Site Inspection"]?.["Generate Contract"] !== 1 && !item.estimatedInstallationDate) || !item.estimatedInstallationDate}>📄</button>
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
          permissions={permissions}
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
          permissions={permissions}
        />
      )}
      {modal?.type === 'manual-approve' && (
        <ConfirmManualApproveModal
          inspection={modal.inspection}
          onConfirm={handleManualApprove}
          onClose={closeModal}
        />
      )} 
    </div>
  );
};

export default SiteInspection;