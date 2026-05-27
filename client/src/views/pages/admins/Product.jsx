import React, { useState, useMemo, useCallback, useRef, useEffect, useContext } from 'react';
import './Product.css';
import { UserContext } from 'App';
import { isEmpty, CRUD } from 'services/data.services';

const INIT_TYPES = ['Glass & Aluminum', 'Steel Fabrication', 'Wooden Frame'];
const INIT_CATEGORIES = ['Windows', 'Doors', 'Partitions', 'Railings', 'Curtain Walls'];
const INIT_VARIANT_MAP = {
  'Glass & Aluminum': ['Clear Glass', 'Frosted Glass', 'Smoke Glass', 'Tempered Glass', 'Laminated Glass', 'Tinted Glass'],
  'Steel Fabrication': ['Stainless Steel', 'Galvanized Steel', 'Carbon Steel'],
  'Wooden Frame':      ['Solid Wood', 'Plywood', 'MDF Board', 'Engineered Wood'],
};
const UNITS = [
  { value: 'in', label: 'Inches (in)' },
  { value: 'cm', label: 'Centimeters (cm)' },
  { value: 'm',  label: 'Meters (m)' },
];
const ANGLE_LABELS = ['Left', 'Right', 'Top', 'Back'];

function toSqFt(val, unit) {
  const n = parseFloat(val) || 0;
  if (unit === 'in') return n / 12;
  if (unit === 'cm') return n / 30.48;
  if (unit === 'm')  return n / 0.3048;
  return n;
}
function calcEstimated(w, h, price, unit) {
  const sqft = toSqFt(w, unit) * toSqFt(h, unit);
  const p = parseFloat(price) || 0;
  return sqft > 0 && p > 0 ? (sqft * p).toFixed(2) : '';
}

const Icon = {
  Plus:      () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>,
  SmallPlus: () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>,
  Search:    () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
  Edit:      () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash:     () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  Close:     () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>,
  ChevDown:  () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>,
  Upload:    () => <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
  Image:     () => <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  AlertTri:  () => <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Box:       () => <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.3" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  Check:     () => <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>,
  Tag:       () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
};

function ExpandableDropdown({ label, required, value, options, onChange, onAddNew, placeholder, error, addLabel }) {
  const [open, setOpen]         = useState(false);
  const [adding, setAdding]     = useState(false);
  const [newValue, setNewValue] = useState('');
  const [addError, setAddError] = useState('');
  const wrapRef  = useRef();
  const inputRef = useRef();

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) { setOpen(false); setAdding(false); setNewValue(''); setAddError(''); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { if (adding && inputRef.current) inputRef.current.focus(); }, [adding]);

  const handleSelect = (opt) => { onChange(opt); setOpen(false); setAdding(false); setNewValue(''); setAddError(''); };

  const handleConfirmAdd = () => {
    const trimmed = newValue.trim();
    if (!trimmed) { setAddError('Please enter a name.'); return; }
    if (options.map(o => o.toLowerCase()).includes(trimmed.toLowerCase())) { setAddError('Already exists.'); return; }
    onAddNew(trimmed);
    onChange(trimmed);
    setAdding(false);
    setNewValue('');
    setAddError('');
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleConfirmAdd(); }
    if (e.key === 'Escape') { setAdding(false); setNewValue(''); setAddError(''); }
  };

  return (
    <div className="exdrop-wrap" ref={wrapRef}>
      {label && (
        <label className="field-label">
          {label}{required && <span className="field-required"> *</span>}
        </label>
      )}
      <div
        className={`exdrop-trigger${open ? ' open' : ''}${error ? ' error' : ''}`}
        onClick={() => { setOpen(o => !o); setAdding(false); setNewValue(''); setAddError(''); }}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); } }}
      >
        <span className={value ? 'exdrop-value' : 'exdrop-placeholder'}>{value || placeholder || 'Select…'}</span>
        <span className={`exdrop-chevron${open ? ' rotated' : ''}`}><Icon.ChevDown /></span>
      </div>

      {error && <div className="field-error">⚠ {error}</div>}

      {open && (
        <div className="exdrop-menu">
          <div className="exdrop-list">
            {options.map((opt) => (
              <div
                key={opt}
                className={`exdrop-item${opt === value ? ' selected' : ''}`}
                onClick={() => handleSelect(opt)}
              >
                {opt === value && <span className="exdrop-item-check"><Icon.Check /></span>}
                {opt}
              </div>
            ))}
          </div>

          <div className="exdrop-divider" />

          {!adding ? (
            <div className="exdrop-add-btn" onClick={(e) => { e.stopPropagation(); setAdding(true); }}>
              <span className="exdrop-add-icon"><Icon.SmallPlus /></span>
              {addLabel || 'Add new…'}
            </div>
          ) : (
            <div className="exdrop-add-row" onClick={(e) => e.stopPropagation()}>
              <div className="exdrop-add-input-wrap">
                <input
                  ref={inputRef}
                  className={`exdrop-add-input${addError ? ' error' : ''}`}
                  type="text"
                  placeholder="Type name & press Enter"
                  value={newValue}
                  onChange={(e) => { setNewValue(e.target.value); setAddError(''); }}
                  onKeyDown={handleKeyDown}
                />
                <button type="button" className="exdrop-add-confirm" onClick={handleConfirmAdd} title="Add">
                  <Icon.Check />
                </button>
                <button type="button" className="exdrop-add-cancel" onClick={() => { setAdding(false); setNewValue(''); setAddError(''); }} title="Cancel">
                  <Icon.Close />
                </button>
              </div>
              {addError && <div className="exdrop-add-error">⚠ {addError}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UploadCard({ label, hint, image, onChange, onRemove }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) { 
      const r = new FileReader(); 
      r.onload = ev => onChange(ev.target.result); 
      r.readAsDataURL(file); 
    }
  };
  
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) { 
      const r = new FileReader(); 
      r.onload = ev => onChange(ev.target.result); 
      r.readAsDataURL(file); 
    }
  };

  const imgUrl = (image && image.startsWith('/uploads/')) 
    ? (window.base_api.replace('/api/', '') + image) 
    : image;

  return (
    <div
      className={`upload-card${dragging ? ' dragging' : ''}${image ? ' has-image' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !image && inputRef.current?.click()} // Fires custom ref click
    >
      {image ? (
        <>
          <img src={imgUrl} alt={label} className="upload-card__preview" />
          <button type="button" className="upload-remove" onClick={(e) => { e.stopPropagation(); onRemove(); }}>✕</button>
        </>
      ) : (
        <>
          <Icon.Upload />
          <span className="upload-card__label">{label}</span>
          {hint && <span className="upload-card__hint">{hint}</span>}
          
          {/* ADD onClick STOP PROPAGATION HERE TO STOP DOUBLE DIALOGS */}
          <input 
            ref={inputRef} 
            type="file" 
            accept="image/*" 
            onChange={handleFile} 
            onClick={(e) => e.stopPropagation()} 
          />
        </>
      )}
    </div>
  );
}

function DeleteModal({ product, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
        <div className="delete-modal__icon"><Icon.AlertTri /></div>
        <div className="delete-modal__title">Delete Product?</div>
        <div className="delete-modal__desc">
          You are about to permanently delete <span className="delete-modal__name">"{product.name}"</span>. This action cannot be undone.
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button type="button" className="btn-cancel" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn-danger" onClick={onConfirm}>Yes, Delete</button>
        </div>
      </div>
    </div>
  );
}

function ProductModal({ initial, onSave, onClose, productTypes, setProductTypes, categories, setCategories, variantMap, setVariantMap }) {
  const isEdit = !!(initial?._id || initial?.id);

  const defaultForm = {
    type: productTypes[0] || '',
    name: '',
    category: categories[0] || '',
    variant: (variantMap[productTypes[0]] || [])[0] || '',
    description: '',
    width: '', height: '', unit: 'in',
    pricePerSqFt: '', estimatedCost: '',
    active: true,
  };

  const [form, setForm]         = useState(initial || defaultForm);
  const [errors, setErrors]     = useState({});
  const [mainImg, setMainImg]   = useState(initial?.mainImg || null);
  const [angleImgs, setAngleImgs] = useState(initial?.angleImgs || [null, null, null, null]);

  const currentVariants = variantMap[form.type] || [];

  const update = useCallback((field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'type') {
        next.variant = (variantMap[value] || [])[0] || '';
      }
      if (['width', 'height', 'pricePerSqFt', 'unit'].includes(field)) {
        const cost = calcEstimated(
          field === 'width'        ? value : next.width,
          field === 'height'       ? value : next.height,
          field === 'pricePerSqFt' ? value : next.pricePerSqFt,
          field === 'unit'         ? value : next.unit,
        );
        if (cost !== '') next.estimatedCost = cost;
      }
      return next;
    });
    if (errors[field]) setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
  }, [errors, variantMap]);

  const addType = (name) => {
    setProductTypes((prev) => [...prev, name]);
    setVariantMap((prev) => ({ ...prev, [name]: [] }));
  };

  const addCategory = (name) => setCategories((prev) => [...prev, name]);

  const addVariant = (name) => {
    const type = form.type;
    setVariantMap((prev) => ({ ...prev, [type]: [...(prev[type] || []), name] }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())                                              e.name        = 'Product name is required.';
    if (!form.type)                                                     e.type        = 'Product type is required.';
    if (!form.category)                                                 e.category    = 'Category is required.';
    if (!form.variant)                                                  e.variant     = 'Variant is required.';
    if (!form.width  || isNaN(form.width)  || Number(form.width)  <= 0) e.width      = 'Enter a valid width.';
    if (!form.height || isNaN(form.height) || Number(form.height) <= 0) e.height     = 'Enter a valid height.';
    if (!form.pricePerSqFt || Number(form.pricePerSqFt) <= 0)          e.pricePerSqFt = 'Enter a valid price.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSave({ ...form, mainImg, angleImgs });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{isEdit ? 'Edit Product' : 'Add New Product'}</div>
            <div className="modal-subtitle">{isEdit ? 'Update product details below.' : 'Fill in the details to create a new product.'}</div>
          </div>
          <button type="button" className="modal-close" onClick={onClose}><Icon.Close /></button>
        </div>

        <div className="modal-body">
          <div className="section-label">Product Information</div>
          <div className="form-row">
            <ExpandableDropdown
              label="Product Type"
              required
              value={form.type}
              options={productTypes}
              onChange={(v) => update('type', v)}
              onAddNew={addType}
              error={errors.type}
              addLabel="Add new product type…"
            />
            <ExpandableDropdown
              label="Category"
              required
              value={form.category}
              options={categories}
              onChange={(v) => update('category', v)}
              onAddNew={addCategory}
              error={errors.category}
              addLabel="Add new category…"
            />
          </div>

          <div className="form-col">
            <label className="field-label">Product Name <span className="field-required">*</span></label>
            <input
              className={`field-input${errors.name ? ' error' : ''}`}
              type="text"
              placeholder="e.g. Tempered Glass Sliding Door"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
            />
            {errors.name && <div className="field-error">⚠ {errors.name}</div>}
          </div>

          <ExpandableDropdown
            label="Variant"
            required
            value={form.variant}
            options={currentVariants}
            onChange={(v) => update('variant', v)}
            onAddNew={addVariant}
            error={errors.variant}
            placeholder={currentVariants.length === 0 ? 'Add a variant first…' : 'Select variant…'}
            addLabel={`Add new variant for "${form.type}"…`}
          />
       
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '-0.5rem', marginBottom: '0.85rem' }}>
            <Icon.Tag /> Variants are scoped to the selected product type.
          </div>

          <div className="form-col">
            <label className="field-label">Description</label>
            <textarea
              className="field-textarea"
              placeholder="Describe this product — materials, use case, special features..."
              value={form.description || ''}
              onChange={(e) => update('description', e.target.value)}
            />
          </div>

          <div className="section-label" style={{ marginTop: '0.75rem' }}>Measurements & Pricing</div>
          <div className="measurements-row" style={{ marginBottom: '0.85rem' }}>
            <div>
              <label className="field-label">Width <span className="field-required">*</span></label>
              <input className={`field-input${errors.width ? ' error' : ''}`} type="number" min="0" placeholder="0" value={form.width} onChange={(e) => update('width', e.target.value)} />
              {errors.width && <div className="field-error">⚠ {errors.width}</div>}
            </div>
            <div>
              <label className="field-label">Height <span className="field-required">*</span></label>
              <input className={`field-input${errors.height ? ' error' : ''}`} type="number" min="0" placeholder="0" value={form.height} onChange={(e) => update('height', e.target.value)} />
              {errors.height && <div className="field-error">⚠ {errors.height}</div>}
            </div>
            <div>
              <label className="field-label">Unit</label>
              <div className="field-select-wrap">
                <select className="field-select" value={form.unit} onChange={(e) => update('unit', e.target.value)}>
                  {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="form-col">
            <label className="field-label">Price Per Square Foot (₱) <span className="field-required">*</span></label>
            <input className={`field-input${errors.pricePerSqFt ? ' error' : ''}`} type="number" min="0" step="0.01" placeholder="0.00" value={form.pricePerSqFt} onChange={(e) => update('pricePerSqFt', e.target.value)} />
            {errors.pricePerSqFt && <div className="field-error">⚠ {errors.pricePerSqFt}</div>}
          </div>

          <div className="cost-display">
            <div>
              <div className="cost-display__label">Estimated Cost</div>
              <div className="cost-display__note">Auto-calculated · you can override below</div>
            </div>
            <div className="cost-display__value">
              ₱{form.estimatedCost !== '' ? Number(form.estimatedCost).toLocaleString('en-PH', { minimumFractionDigits: 2 }) : '—'}
            </div>
          </div>

          <div className="form-col">
            <label className="field-label">Override Estimated Cost (₱)</label>
            <input className="field-input" type="number" min="0" step="0.01" placeholder="Leave blank to use auto-calculated" value={form.estimatedCost} onChange={(e) => update('estimatedCost', e.target.value)} />
          </div>

          <div className="section-label" style={{ marginTop: '0.75rem' }}>Product Images</div>
          <div className="upload-main-wrap" style={{ marginBottom: '0.75rem' }}>
            <label className="field-label" style={{ marginBottom: '0.5rem' }}>Main Product Image</label>
            <UploadCard label="Main Image" hint="Drag & drop or click to upload" image={mainImg} onChange={setMainImg} onRemove={() => setMainImg(null)} />
          </div>

          <label className="field-label" style={{ marginBottom: '0.5rem' }}>Viewing Angles</label>
          <div className="upload-grid">
            {ANGLE_LABELS.map((lbl, i) => (
              <UploadCard
                key={lbl}
                label={`${lbl} Angle`}
                image={angleImgs[i]}
                onChange={(src) => { const n = [...angleImgs]; n[i] = src; setAngleImgs(n); }}
                onRemove={() => { const n = [...angleImgs]; n[i] = null; setAngleImgs(n); }}
              />
            ))}
          </div>

          <div className="section-label" style={{ marginTop: '0.75rem' }}>Status</div>
          <label className="toggle-row">
            <div className="toggle-switch">
              <input type="checkbox" checked={form.active} onChange={(e) => update('active', e.target.checked)} />
              <div className="toggle-track"><div className="toggle-thumb" /></div>
            </div>
            <div className="toggle-info">
              <div className="toggle-info__title">Active Product</div>
              <div className="toggle-info__desc">{form.active ? 'This product is live and visible.' : 'This product is hidden from customers.'}</div>
            </div>
          </label>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="button" className="btn-submit" onClick={handleSubmit}>
              <Icon.Check />
              {isEdit ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product, onEdit, onDelete, index }) {
  const mainImgUrl = (product.mainImg && product.mainImg.startsWith('/uploads/')) 
    ? (window.base_api.replace('/api/', '') + product.mainImg) 
    : product.mainImg;

  return (
    <div className="product-card" style={{ animationDelay: `${index * 0.04}s` }}>
      <div className="card-image">
        {product.mainImg
          ? <img src={mainImgUrl} alt={product.name} />
          : <div className="card-image__placeholder"><Icon.Image /><span>No Image</span></div>
        }
        <span className={`card-status-badge ${product.active ? 'active' : 'inactive'}`}>
          {product.active ? 'Active' : 'Inactive'}
        </span>
        <div className="card-actions">
          <button type="button" className="card-action-btn edit" title="Edit" onClick={() => onEdit(product)}><Icon.Edit /></button>
          <button type="button" className="card-action-btn delete" title="Delete" onClick={() => onDelete(product)}><Icon.Trash /></button>
        </div>
      </div>
      <div className="card-body">
        <span className="card-type-badge">{product.type}</span>
        <div className="card-name">{product.name}</div>
        <div className="card-meta">
          <span>{product.category}</span>
          <span className="dot" />
          <span>{product.variant}</span>
        </div>
        {product.description && (
          <div style={{ fontSize: '0.77rem', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: '0.2rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {product.description}
          </div>
        )}
        <div className="card-footer">
          <div>
            <div className="card-price-label">Est. Cost</div>
            <div className="card-price">₱{product.estimatedCost ? Number(product.estimatedCost).toLocaleString('en-PH', { minimumFractionDigits: 2 }) : '—'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="card-price-label">{product.width} × {product.height} {product.unit}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>₱{product.pricePerSqFt || '—'}/sq ft</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, type, visible }) {
  if (!visible) return null;
  return (
    <div className={`toast ${type}`}>
      <span className="toast__icon">{type === 'success' ? '✓' : '✕'}</span>
      {message}
    </div>
  );
}

const Products = () => {
  const { user } = useContext(UserContext);
  const [productTypes, setProductTypes] = useState(INIT_TYPES);
  const [categories,   setCategories]   = useState(INIT_CATEGORIES);
  const [variantMap,   setVariantMap]   = useState(INIT_VARIANT_MAP);

  const [products,     setProducts]     = useState([]);
  const [searchTerm,   setSearchTerm]   = useState('');
  const [filterCat,    setFilterCat]    = useState('All');
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast,        setToast]        = useState({ visible: false, message: '', type: 'success' });

  function _getProducts(currentUser, callback) {
    if (!currentUser || !currentUser.token) return;

    const payload = {
      token: currentUser.token,
      _id: currentUser._id,
      archive: 0
    };
  
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    };

    CRUD(window.base_api + "get_products", requestOptions, (res) => {
      if(res.remarks === "success") {
        callback(res.payload || []);
      } else {
        console.error("Failed to fetch products:", res.message);
        callback([]);
      }
    });
  }

  useEffect(() => {
    if(user && !isEmpty(user.token)) {
      _getProducts(user, setProducts);
    }
  }, [user]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  }, []);

  const openAdd  = () => { setEditTarget(null); setModalOpen(true); };
  const openEdit = (p)  => { setEditTarget(p);   setModalOpen(true); };

  const handleSave = useCallback((productData) => {
    if (!user || !user.token) return;
    const isEditing = !!(productData._id || productData.id);

    const payload = {
      token: user.token,
      userId: user._id,
      product: productData,
      fullName: `${user.firstName} ${user.lastName}`,
    };

    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    };

    const endpoint = isEditing ? "update_product" : "add_product";

    CRUD(window.base_api + endpoint, requestOptions, (res) => {
      if (res.remarks === "success") {
        _getProducts(user, setProducts);
        setModalOpen(false);
        showToast(isEditing ? 'Product updated successfully.' : 'Product created successfully.', 'success');
      } else {
        console.error("Failed to save product:", res.message);
        showToast("Error saving product: " + (res.message || "Unknown error"), 'error');
      }
    });
  }, [user, showToast]);

  const handleDelete = useCallback(() => {
    if (!deleteTarget || !user || !user.token) return;
    const targetId = deleteTarget._id || deleteTarget.id;

    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: user.token, _id: user._id, fullName: `${user.firstName} ${user.lastName}` })
    };

    CRUD(window.base_api + `delete_product/${targetId}`, requestOptions, (res) => {
      if (res.remarks === "success") {
        _getProducts(user, setProducts);
        setDeleteTarget(null);
        showToast('Product deleted successfully.', 'success');
      } else {
        console.error("Failed to delete product:", res.message);
        showToast("Error removing item: " + (res.message || "Unknown error"), 'error');
      }
    });
  }, [deleteTarget, user, showToast]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCat = filterCat === 'All' || p.category === filterCat;
      const matchesSearch = !q
        || p.name?.toLowerCase().includes(q)
        || p.category?.toLowerCase().includes(q)
        || p.variant?.toLowerCase().includes(q)
        || p.type?.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [products, searchTerm, filterCat]);

  const stats = useMemo(() => ({
    total:    products.length,
    active:   products.filter((p) => p.active).length,
    inactive: products.filter((p) => !p.active).length,
  }), [products]);

  const allFilterCats = ['All', ...categories];

  return (
    <div className="pms-page">
      <div className="pms-header">
        <div>
          <div className="pms-header__title">Product Management</div>
          <div className="pms-header__subtitle">Glass & Aluminum Business · Admin Panel</div>
        </div>
        <button type="button" className="btn-add" onClick={openAdd}>
          <Icon.Plus /> Add New Product
        </button>
      </div>

      {products.length > 0 && (
        <div className="pms-stats">
          <div className="stat-card"><div className="stat-card__value">{stats.total}</div><div className="stat-card__label">Total Products</div></div>
          <div className="stat-card"><div className="stat-card__value" style={{ color: 'var(--success)' }}>{stats.active}</div><div className="stat-card__label">Active</div></div>
          <div className="stat-card"><div className="stat-card__value" style={{ color: 'var(--text-muted)' }}>{stats.inactive}</div><div className="stat-card__label">Inactive</div></div>
          <div className="stat-card"><div className="stat-card__value">{filtered.length}</div><div className="stat-card__label">Showing</div></div>
        </div>
      )}

      <div className="pms-toolbar">
        <div className="pms-search-wrap">
          <span className="pms-search-icon"><Icon.Search /></span>
          <input className="pms-search" type="text" placeholder="Search by name, category, variant, type…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="pms-filters">
          {allFilterCats.map((cat) => (
            <button key={cat} type="button" className={`filter-chip${filterCat === cat ? ' active' : ''}`} onClick={() => setFilterCat(cat)}>{cat}</button>
          ))}
        </div>
      </div>

      <div className="pms-grid">
        {filtered.length === 0 ? (
          <div className="pms-empty">
            <div className="pms-empty__icon"><Icon.Box /></div>
            <div className="pms-empty__title">{products.length === 0 ? 'No products yet' : 'No results found'}</div>
            <div className="pms-empty__desc">{products.length === 0 ? 'Click "Add New Product" to get started.' : 'Try adjusting your search or filter.'}</div>
          </div>
        ) : (
          filtered.map((p, i) => <ProductCard key={p._id || p.id} product={p} index={i} onEdit={openEdit} onDelete={setDeleteTarget} />)
        )}
      </div>

      {modalOpen && (
        <ProductModal
          initial={editTarget}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
          productTypes={productTypes}
          setProductTypes={setProductTypes}
          categories={categories}
          setCategories={setCategories}
          variantMap={variantMap}
          setVariantMap={setVariantMap}
        />
      )}

      {deleteTarget && (
        <DeleteModal product={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}

      <Toast message={toast.message} type={toast.type} visible={toast.visible} />
    </div>
  );
};

export default Products;