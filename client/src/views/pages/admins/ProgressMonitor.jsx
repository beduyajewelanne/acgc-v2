import React, { useState, useRef, useContext, useEffect } from 'react';
import './ProgressMonitor.css';
import { CRUD, isEmpty } from 'services/data.services'
import {UserContext} from "App"
// ─── Static Dummy Data ────────────────────────────────────────────────────────
const INITIAL_PROJECTS = [
  {
    id: 1,
    client: 'Sunrise Condo Corp.',
    product: 'Glass Partition System',
    siteInspection: '2025-04-10',
    estimatedInstall: '2025-06-15',
    status: 'Fabrication',
    notes: 'Full-height tempered glass partitions for 3rd floor open office. Client requested frosted finish on lower half. Structural anchoring confirmed with building engineer.',
    stages: [
      { id: 's1', name: 'Cutting',      done: true,  completedAt: '2025-04-20', proofs: [] },
      { id: 's2', name: 'Fabrication',  done: true,  completedAt: '2025-05-05', proofs: [] },
      { id: 's3', name: 'Installation', done: false, completedAt: null,         proofs: [] },
    ],
  },
  {
    id: 2,
    client: 'Blue Horizon Hotels',
    product: 'Aluminum Window Frames',
    siteInspection: '2025-03-28',
    estimatedInstall: '2025-05-30',
    status: 'Installation',
    notes: 'Replacing 48 window frames across floors 2–6. Powder-coated matte black finish. Site access restricted on weekends.',
    stages: [
      { id: 's1', name: 'Cutting',      done: true, completedAt: '2025-04-08', proofs: [] },
      { id: 's2', name: 'Fabrication',  done: true, completedAt: '2025-04-25', proofs: [] },
      { id: 's3', name: 'Installation', done: true, completedAt: '2025-05-18', proofs: [] },
    ],
  },
  {
    id: 3,
    client: 'Metro Business Park',
    product: 'Curtain Wall Facade',
    siteInspection: '2025-05-01',
    estimatedInstall: '2025-08-20',
    status: 'Cutting',
    notes: 'Large-scale structural glazing on the east and south facade. Requires crane access. Coordination with general contractor needed for scaffolding.',
    stages: [
      { id: 's1', name: 'Cutting',      done: true,  completedAt: '2025-05-15', proofs: [] },
      { id: 's2', name: 'Fabrication',  done: false, completedAt: null,         proofs: [] },
      { id: 's3', name: 'Installation', done: false, completedAt: null,         proofs: [] },
    ],
  },
  {
    id: 4,
    client: 'Greenfield Residences',
    product: 'Sliding Glass Doors',
    siteInspection: '2025-02-14',
    estimatedInstall: '2025-04-10',
    status: 'Delayed',
    notes: 'Sliding glass door units for 12 residential units. Delay caused by supplier backlog on specialty hardware. Client notified and rescheduled.',
    stages: [
      { id: 's1', name: 'Cutting',      done: true,  completedAt: '2025-03-01', proofs: [] },
      { id: 's2', name: 'Fabrication',  done: false, completedAt: null,         proofs: [] },
      { id: 's3', name: 'Installation', done: false, completedAt: null,         proofs: [] },
    ],
  },
  {
    id: 5,
    client: 'Vista Tower LLC',
    product: 'Frameless Glass Railing',
    siteInspection: '2025-01-20',
    estimatedInstall: '2025-03-15',
    status: 'Completed',
    notes: 'Frameless balcony railing system for rooftop amenity deck. 316 stainless steel standoffs used. All safety certifications passed.',
    stages: [
      { id: 's1', name: 'Cutting',      done: true, completedAt: '2025-02-01', proofs: [] },
      { id: 's2', name: 'Fabrication',  done: true, completedAt: '2025-02-18', proofs: [] },
      { id: 's3', name: 'Installation', done: true, completedAt: '2025-03-10', proofs: [] },
    ],
  },
  {
    id: 6,
    client: 'Coastal Villas HOA',
    product: 'Aluminum Louver System',
    siteInspection: '2025-05-10',
    estimatedInstall: '2025-07-25',
    status: 'Pending',
    notes: 'Fixed aluminum louvers for outdoor pergola. Anodized silver finish. Awaiting HOA approval for final design sign-off before proceeding.',
    stages: [
      { id: 's1', name: 'Cutting',      done: false, completedAt: null, proofs: [] },
      { id: 's2', name: 'Fabrication',  done: false, completedAt: null, proofs: [] },
      { id: 's3', name: 'Installation', done: false, completedAt: null, proofs: [] },
    ],
  },
];

// ─── Status Config ─────────────────────────────────────────────────────────────
// NOTE: Using inline style objects instead of dynamic Tailwind class strings
// to avoid purge/JIT issues with dynamically constructed class names.
const STATUS_CONFIG = {
  Pending:      { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' },
  Cutting:      { bg: '#fef3c7', text: '#b45309', dot: '#fbbf24' },
  Fabrication:  { bg: '#dbeafe', text: '#1d4ed8', dot: '#3b82f6' },
  Installation: { bg: '#ede9fe', text: '#6d28d9', dot: '#8b5cf6' },
  Completed:    { bg: '#d1fae5', text: '#065f46', dot: '#10b981' },
  Delayed:      { bg: '#fee2e2', text: '#b91c1c', dot: '#ef4444' },
};
const ALL_STATUSES = Object.keys(STATUS_CONFIG);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const calcProgress = (stages) => {
  if (!stages.length) return 0;
  return Math.round((stages.filter((s) => s.done).length / stages.length) * 100);
};

const fmt = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const todayISO = () => new Date().toISOString().split('T')[0];

// ─── StatusBadge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' };
  return (
    <span
      className="pm-status-badge"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      <span className="pm-status-dot" style={{ backgroundColor: cfg.dot }} />
      {status}
    </span>
  );
};

// ─── ProgressBar ──────────────────────────────────────────────────────────────
const ProgressBar = ({ pct }) => {
  const color =
    pct === 100 ? '#10b981'
    : pct >= 66  ? '#8b5cf6'
    : pct >= 33  ? '#3b82f6'
    :              '#fbbf24';

  return (
    <div className="pm-progress-wrap">
      <div className="pm-progress-track">
        <div
          className="pm-progress-fill"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="pm-progress-label">{pct}%</span>
    </div>
  );
};

// ─── ProofUpload ──────────────────────────────────────────────────────────────
const ProofUpload = ({ proofs, onAdd, onRemove }) => {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);

  // --- Updated: Functional Upload Core Handler ---
  const handleFiles = async (files) => {
    // Process each selected/dropped file individually 
    for (const file of Array.from(files)) {
      // Build standard multipart/form-data payload stream wrapper
      const formData = new FormData();
      formData.append("proofFile", file);

      try {
        const response = await fetch(window.base_api + "upload_proof_file", {
          method: "POST",
          body: formData, // Browser handles configuration headers automatically
        });

        const data = await response.json();
        
        if (data.remarks === "success") {
          // Pass the persistent network reference details to your modal state layer
          onAdd({
            id: data.proof.id,
            url: `/uploads/${data.proof.fileName}`, // Dynamic web route access path matching server storage
            name: data.proof.originalName
          });
        } else {
          console.error("Server upload verification rejected file processing:", data.message);
        }
      } catch (err) {
        console.error("Network infrastructure error uploading media asset file stream:", err);
      }
    }
  };

  // --- UI Structure Remains Identical ---
  return (
    <div className="pm-proof-wrap">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current.click()}
        className={`pm-dropzone${dragging ? ' pm-dragging' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="pm-hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="pm-dropzone-label">
          <svg className="pm-dropzone-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Drop images or <span className="pm-browse-link">browse</span>
        </div>
      </div>

      {proofs.length > 0 && (
        <div className="pm-proof-grid">
          {proofs.map((p) => (
            <div key={p.id} className="pm-proof-thumb">
              {/* Renders server URL pathway pointer instead of an unstable local runtime string blob */}
              <img src={window.base_api.replace('/api/', '') + p.url} alt={p.name} className="pm-proof-img" />
              <button className="pm-proof-remove" onClick={() => onRemove(p.id)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── ViewModal ────────────────────────────────────────────────────────────────
const ViewModal = ({ project, onClose }) => {
  const pct = calcProgress(project.stages);

  return (
    <div className="pm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pm-modal pm-modal-lg animate-modal">

        <div className="pm-modal-header">
          <div>
            <p className="pm-modal-eyebrow pm-eyebrow-blue">Project Details</p>
            <h2 className="pm-modal-title">{project?.clientName}</h2>
            <p className="pm-modal-subtitle">{project?.itemDetails?.name}</p>
          </div>
          <button onClick={onClose} className="pm-close-btn">
            <svg className="pm-icon-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="pm-modal-body">
          <div className="pm-info-grid">
            {[
              { label: 'Site Inspection',   value: fmt(project.inspectionDate) },
              { label: 'Est. Installation', value: fmt(project.estimatedInstallationDate) },
            ].map(({ label, value }) => (
              <div key={label} className="pm-info-cell">
                <p className="pm-info-label">{label}</p>
                <div className="pm-info-value">{value}</div>
              </div>
            ))}
            <div className="pm-info-cell">
              <p className="pm-info-label">Current Status</p>
              <div className="pm-info-value"><StatusBadge status={project.projectStatus} /></div>
            </div>
            <div className="pm-info-cell">
              <p className="pm-info-label">Completion</p>
              <div className="pm-info-value">{pct}%</div>
            </div>
          </div>

          <div className="pm-section">
            <p className="pm-section-label">Overall Progress</p>
            <ProgressBar pct={pct} />
          </div>

          {project.notes && (
            <div className="pm-section">
              <p className="pm-section-label">Project Notes</p>
              <p className="pm-notes-text">{project.notes}</p>
            </div>
          )}

          <div className="pm-section">
            <p className="pm-section-label">Progress Timeline</p>
            <div className="pm-timeline">
              {project.stages.map((stage, i) => (
                <div key={stage.id} className="pm-timeline-row">
                  <div className={`pm-timeline-dot${stage.done ? ' pm-dot-done' : ''}`}>
                    {stage.done ? (
                      <svg className="pm-check-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="pm-dot-num">{i + 1}</span>
                    )}
                  </div>

                  <div className="pm-timeline-content">
                    <div className="pm-timeline-top">
                      <p className={`pm-stage-name${stage.done ? ' pm-stage-done-text' : ' pm-stage-pending-text'}`}>
                        {stage.name}
                      </p>
                      {stage.done && stage.completedAt ? (
                        <span className="pm-completed-badge">{fmt(stage.completedAt)}</span>
                      ) : (
                        <span className="pm-pending-text">Pending</span>
                      )}
                    </div>

                    {stage.proofs.length > 0 && (
                      <div className="pm-proof-row">
                        {stage.proofs.map((p) => (
                          <img key={p.id} src={window.base_api.replace('/api/', '') + p.url} alt={p.name} className="pm-proof-thumb-sm" />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── EditModal ────────────────────────────────────────────────────────────────
const EditModal = ({ project, onClose, onSave }) => {
  // Track which stage IDs were already done when the modal opened — these are locked.
  const lockedIds = useRef(new Set(project.stages.filter((s) => s.done).map((s) => s.id)));

  const [stages, setStages] = useState(
    project.stages.map((s) => ({ ...s, proofs: [...(s.proofs || [])] }))
  );
  const [status, setStatus]     = useState(project.progressStatus);
  const [estDate, setEstDate]   = useState(project.estimatedInstallationDate);
  const [newStageName, setNewStageName] = useState('');
  const [insertAfterIdx, setInsertAfterIdx] = useState(-1); // -1 = beginning
  const [saving, setSaving]     = useState(false);

  // Drag state
  const dragIdx = useRef(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  // ── Toggle: locked (already-done) stages cannot be unchecked ──────────────
  const toggleStage = (id) => {
    if (lockedIds.current.has(id)) return; // locked — ignore
    setStages((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, done: !s.done, completedAt: !s.done ? todayISO() : null } : s
      )
    );
  };

  const addProof = (stageId, proof) =>
    setStages((prev) =>
      prev.map((s) => (s.id === stageId ? { ...s, proofs: [...s.proofs, proof] } : s))
    );

  const removeProof = (stageId, proofId) =>
    setStages((prev) =>
      prev.map((s) =>
        s.id === stageId ? { ...s, proofs: s.proofs.filter((p) => p.id !== proofId) } : s
      )
    );

  // ── Add stage at chosen position (only among non-locked slots) ─────────────
  const addStage = () => {
    const name = newStageName.trim();
    if (!name) return;
    const newStage = { id: 's' + Date.now(), name, done: false, completedAt: null, proofs: [] };
    setStages((prev) => {
      // insertAfterIdx is relative to the full stages array.
      // -1 means insert at the very beginning (after all locked stages though —
      // we never allow inserting before a locked/done stage).
      const lockedCount = prev.filter((s) => lockedIds.current.has(s.id)).length;
      // Clamp: cannot insert before the last locked stage
      const clampedIdx = Math.max(insertAfterIdx, lockedCount - 1);
      const insertPos = clampedIdx + 1; // splice position
      const next = [...prev];
      next.splice(insertPos, 0, newStage);
      return next;
    });
    setNewStageName('');
  };

  // ── Drag-and-drop reorder (only pending stages can move) ───────────────────
  const handleDragStart = (e, idx) => {
    if (lockedIds.current.has(stages[idx].id)) {
      e.preventDefault();
      return;
    }
    dragIdx.current = idx;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    // Disallow dropping onto or before a locked stage
    if (lockedIds.current.has(stages[idx].id)) return;
    e.dataTransfer.dropEffect = 'move';
    setDragOverIdx(idx);
  };

  const handleDrop = (e, idx) => {
    e.preventDefault();
    setDragOverIdx(null);
    const from = dragIdx.current;
    if (from === null || from === idx) return;
    if (lockedIds.current.has(stages[idx].id)) return; // target is locked
    setStages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    dragIdx.current = null;
  };

  const handleDragEnd = () => {
    setDragOverIdx(null);
    dragIdx.current = null;
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      onSave({ ...project, stages, progressStatus: status, estimatedInstall: estDate });
      setSaving(false);
      onClose();
    }, 600);
  };

  const pct = calcProgress(stages);
  // Position options for the insert-position selector (only non-locked slots)
  const lockedCount = stages.filter((s) => lockedIds.current.has(s.id)).length;

  return (
    <div className="pm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pm-modal pm-modal-sm animate-modal">

        <div className="pm-modal-header">
          <div>
            <p className="pm-modal-eyebrow pm-eyebrow-violet">Edit Progress</p>
            <h2 className="pm-modal-title">{project.client}</h2>
          </div>
          <button onClick={onClose} className="pm-close-btn">
            <svg className="pm-icon-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="pm-modal-body">
          {/* Live Progress */}
          <div className="pm-live-progress-box">
            <div className="pm-live-progress-header">
              <p className="pm-section-label" style={{ marginBottom: 0 }}>Live Progress</p>
              <span className="pm-live-pct">{pct}%</span>
            </div>
            <ProgressBar pct={pct} />
          </div>

          {/* Status Selector */}
          <div className="pm-section">
            <label className="pm-section-label">Project Status</label>
            <div className="pm-status-pills">
              {ALL_STATUSES.map((s) => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className="pm-status-pill"
                    style={{
                      backgroundColor: cfg.bg,
                      color: cfg.text,
                      outline: status === s ? `2px solid #60a5fa` : 'none',
                      outlineOffset: status === s ? '2px' : '0',
                      opacity: status === s ? 1 : 0.65,
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Estimated Install Date */}
          <div className="pm-section">
            <label className="pm-section-label">Estimated Installation Date</label>
            <input
              type="date"
              min={todayISO()}
              value={estDate}
              onChange={(e) => setEstDate(e.target.value)}
              className="pm-date-input"
            />
          </div>

          {/* Stages */}
          <div className="pm-section">
            <div className="pm-stages-header">
              <label className="pm-section-label">Progress Stages</label>
              {lockedCount < stages.length && (
                <span className="pm-drag-hint">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Drag to reorder pending stages
                </span>
              )}
            </div>
            <div className="pm-stages-list">
              {stages.map((stage, idx) => {
                const isLocked = lockedIds.current.has(stage.id);
                const isDragTarget = dragOverIdx === idx && !isLocked;
                return (
                  <div
                    key={stage.id}
                    draggable={!isLocked}
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={[
                      'pm-stage-card',
                      stage.done ? 'pm-stage-card-done' : '',
                      isLocked ? 'pm-stage-card-locked' : 'pm-stage-card-draggable',
                      isDragTarget ? 'pm-stage-card-dragover' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    <div className="pm-stage-row">
                      {/* Drag handle — only for non-locked */}
                      {!isLocked && (
                        <span className="pm-drag-handle" title="Drag to reorder">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="9"  cy="5"  r="1" fill="currentColor" stroke="none"/>
                            <circle cx="15" cy="5"  r="1" fill="currentColor" stroke="none"/>
                            <circle cx="9"  cy="12" r="1" fill="currentColor" stroke="none"/>
                            <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none"/>
                            <circle cx="9"  cy="19" r="1" fill="currentColor" stroke="none"/>
                            <circle cx="15" cy="19" r="1" fill="currentColor" stroke="none"/>
                          </svg>
                        </span>
                      )}
                      {isLocked && (
                        <span className="pm-lock-icon" title="This stage is completed and locked">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <rect x="3" y="11" width="18" height="11" rx="2"/>
                            <path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round"/>
                          </svg>
                        </span>
                      )}

                      <button
                        onClick={() => toggleStage(stage.id)}
                        className={[
                          'pm-stage-toggle',
                          stage.done ? 'pm-stage-toggle-done' : '',
                          isLocked ? 'pm-stage-toggle-locked' : '',
                        ].filter(Boolean).join(' ')}
                        title={isLocked ? 'Completed stages cannot be unchecked' : ''}
                        style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
                      >
                        {stage.done && (
                          <svg className="pm-check-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>

                      <div className="pm-stage-info">
                        <div className="pm-stage-name-row">
                          <p className={`pm-stage-name${stage.done ? ' pm-stage-done-text' : ''}`}>
                            {stage.name}
                          </p>
                          {isLocked && (
                            <span className="pm-locked-badge">Locked</span>
                          )}
                        </div>
                        {stage.done && stage.completedAt && (
                          <p className="pm-stage-date">Completed {fmt(stage.completedAt)}</p>
                        )}
                      </div>
                    </div>

                    <div className="pm-proof-section">
                      <p className="pm-proof-label">Proof of Work</p>
                      <ProofUpload
                        proofs={stage.proofs}
                        onAdd={(proof) => addProof(stage.id, proof)}
                        onRemove={(proofId) => removeProof(stage.id, proofId)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add New Stage */}
          <div className="pm-section">
            <label className="pm-section-label">Add New Stage</label>
            <div className="pm-add-stage-col">
              <select
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                className="pm-text-input" // Keeps your styling intact
              >
                <option value="" disabled>-- Select a Preset Stage --</option>
                
                {/* Dynamically loop through your STATUS_CONFIG keys to render options */}
                {Object.keys(STATUS_CONFIG).map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
              {/* Position selector */}
              <div className="pm-insert-row">
                <label className="pm-insert-label">Insert after:</label>
                <select
                  value={insertAfterIdx}
                  onChange={(e) => setInsertAfterIdx(Number(e.target.value))}
                  className="pm-insert-select"
                >
                  {stages.map((s, i) => {
                    const isLocked = lockedIds.current.has(s.id);
                    return (
                      <option key={s.id} value={i} disabled={isLocked && i < lockedCount - 1}>
                        {i + 1}. {s.name}{isLocked ? ' 🔒' : ''}
                      </option>
                    );
                  })}
                  {stages.length === 0 && (
                    <option value={-1}>— (no stages yet)</option>
                  )}
                </select>
                <button onClick={addStage} className="pm-add-btn">+ Add</button>
              </div>
              {lockedCount > 0 && (
                <p className="pm-insert-note">
                  🔒 Completed stages are locked and cannot be repositioned.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="pm-modal-footer">
          <button onClick={onClose} className="pm-cancel-btn">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="pm-save-btn">
            {saving ? (
              <>
                <svg
                  className="pm-spinner-icon pm-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                >
                  <circle
                    style={{ opacity: 0.25 }}
                    cx="12" cy="12" r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    style={{ opacity: 0.75 }}
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Saving…
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── ProgressMonitor (Main Page) ──────────────────────────────────────────────
const ProgressMonitor = () => {
  const { user, permissions } = useContext(UserContext);
  const [projects, setProjects]         = useState(INITIAL_PROJECTS);
  const [viewProject, setViewProject]   = useState(null);
  const [editProject, setEditProject]   = useState(null);
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  useEffect(() => {
    if (!isEmpty(user.token)){
      fetchProjects(user)
    }
  }, [user])

  function fetchProjects(user){
    var token = user.token
    var userId = user._id

    if (!token) return;
    var api_url = window.base_api + 'get_progress_monitor'
    var requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: token,
        user_id: userId
      })
    }
    CRUD(api_url, requestOptions, (res) => {
      if (res && res.remarks === "success") {
        setProjects(res.payload)
      } else {
        setProjects([])
      }
    })
  }

  const handleSave = async (updatedProjectPayload) => {
    const token = user.token;
    const user_id = user._id;

    const api_url = window.base_api + 'update_order_request_progress';
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: token,
        user_id: user_id,
        _id: updatedProjectPayload._id,
        stages: updatedProjectPayload.stages,
        progressStatus: updatedProjectPayload.progressStatus,
        estimatedInstallationDate: updatedProjectPayload.estimatedInstall
      })
    }
    CRUD(api_url, requestOptions, (res) => {
      console.log("Transaction result:", res);
      if (res.remarks == "success") {
        fetchProjects(user); 
      } else {
        console.error("Transaction rejected:", res.message);
      }
    })

  };
  const filtered = projects.filter((p) => {
    const matchesSearch =
      p?.clientName?.toLowerCase()?.includes(search?.toLowerCase()) ||
      p?.itemDetails?.name?.toLowerCase()?.includes(search?.toLowerCase());
    const matchesStatus = filterStatus === 'All' || p.progressStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="pm-page pm-font">

      {/* Page Header */}
      <div className="pm-page-header">
        <div className="pm-header-inner">
          <div>
            <h1 className="pm-page-title">Progress Monitor</h1>
            <p className="pm-page-subtitle">Track all active projects from fabrication to installation</p>
          </div>
          <div className="pm-header-badges">
            <span className="pm-badge pm-badge-blue">
              {projects.length} Projects
            </span>
            <span className="pm-badge pm-badge-green">
              {projects.filter((p) => p.status === 'Completed').length} Completed
            </span>
            <span className="pm-badge pm-badge-red">
              {projects.filter((p) => p.status === 'Delayed').length} Delayed
            </span>
          </div>
        </div>
      </div>

      <div className="pm-content">

        {/* Filters Bar */}
        <div className="pm-filters">
          <div className="pm-search-wrap">
            <svg className="pm-search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-4.35-4.35m0 0A7 7 0 104 11a7 7 0 0012.65 5.65z" />
            </svg>
            <input
              type="text"
              placeholder="Search client or product…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pm-search-input"
            />
          </div>

          <div className="pm-filter-pills">
            {['All', ...ALL_STATUSES].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`pm-filter-btn${filterStatus === s ? ' pm-active' : ''}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Table */}
        <div className="pm-table-wrap">
          <table className="pm-table">
            <thead>
              <tr className="pm-thead-row">
                {['Client', 'Product', 'Site Inspection', 'Est. Installation', 'Progress', 'Status', 'Actions'].map(
                  (h) => (
                    <th key={h} className="pm-th">{h}</th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="pm-tbody">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="pm-empty-row">No projects match your filters.</td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="pm-tr">
                    <td className="pm-td">
                      <p className="pm-td-primary">{p.clientName}</p>
                    </td>
                    <td className="pm-td pm-td-secondary">{p?.itemDetails?.name}</td>
                    <td className="pm-td pm-td-secondary">{fmt(p?.inspectionDate)}</td>
                    <td className="pm-td pm-td-secondary">{fmt(p.estimatedInstallationDate)}</td>
                    <td className="pm-td pm-td-progress">
                      <ProgressBar pct={calcProgress(p.stages)} />
                    </td>
                    <td className="pm-td">
                      <StatusBadge status={p.progressStatus} />
                    </td>
                    <td className="pm-td">
                      <div className="pm-actions">
                        <button onClick={() => setViewProject(p)} title="View" className="pm-action-btn pm-view">
                          <svg className="pm-icon-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button onClick={() => setEditProject(p)} title="Edit" className="pm-action-btn pm-edit">
                          <svg className="pm-icon-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="pm-mobile-cards">
          {filtered.length === 0 ? (
            <div className="pm-empty-row">No projects match your filters.</div>
          ) : (
            filtered.map((p) => (
              <div key={p.id} className="pm-card">
                <div className="pm-card-header">
                  <div>
                    <p className="pm-td-primary">{p?.clientName}</p>
                    <p className="pm-card-sub">{p?.itemDetails?.name}</p>
                  </div>
                  <StatusBadge status={p?.progressStatus} />
                </div>
                <ProgressBar pct={calcProgress(p.stages)} />
                <div className="pm-card-dates">
                  <div><span className="pm-card-date-label">Inspection:</span> {fmt(p.inspectionDate)}</div>
                  <div><span className="pm-card-date-label">Install:</span> {fmt(p?.estimatedInstallationDate)}</div>
                </div>
                <div className="pm-card-actions">
                  <button onClick={() => setViewProject(p)} className="pm-card-btn pm-card-view">View Details</button>
                  <button onClick={() => setEditProject(p)} className="pm-card-btn pm-card-edit">Edit Progress</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {viewProject && (
        <ViewModal project={viewProject} onClose={() => setViewProject(null)} />
      )}
      {editProject && (
        <EditModal
          project={editProject}
          onClose={() => setEditProject(null)}
          onSave={(updated) => { handleSave(updated); setEditProject(null); }}
        />
      )}
    </div>
  );
};

export default ProgressMonitor;
