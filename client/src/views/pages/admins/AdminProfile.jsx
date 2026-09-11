import React, { useState, useMemo, useEffect, useRef, useContext } from 'react';
import './AdminProfile.css';
import {CRUD} from "services/data.services";
import {UserContext} from 'App'

// ── Icons ─────────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    style={{ display: 'inline-block', flexShrink: 0 }}>
    <path d={d} />
  </svg>
);

const IC = {
  eye:      'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  eyeOff:   'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22',
  edit:     'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
  close:    'M18 6 6 18M6 6l12 12',
  search:   'M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z',
  filter:   'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  check:    'M20 6 9 17l-5-5',
  shield:   'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  lock:     'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4',
  mail:     'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm16 2-8 5-8-5',
  user:     'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
  calendar: 'M3 9h18M3 5h18a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm4 0V3m10 2V3',
  clock:    'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 5v5l3 3',
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  login:    'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3',
  package:  'M21 16V8a2 2 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96 12 12.01l8.73-5.05M12 22.08V12',
  users:    'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  clip:     'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z',
  trend:    'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6',
  alert:    'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
};

// Dynamic mapping configuration setups updated to intercept specific contextual category identifiers
const MOD_ICONS  = { Project: IC.package, Security: IC.shield, Assets: IC.clip, System: IC.activity };
const MOD_COLORS = { Project: '#3b82f6', Security: '#ef4444', Assets: '#f59e0b', System: '#64748b' };

// ── Static data ───────────────────────────────────────────────────────────────
const INIT_USER = { name: 'Rafael Cristobal', role: 'Super Admin', email: 'rafael.cristobal@acgc.com', status: 'Active', joined: 'January 12, 2024', lastLogin: 'May 27, 2026 · 08:00 AM', avatar: 'RC' };

// ── Helpers ───────────────────────────────────────────────────────────────────
function pwStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' };
  let s = 0;
  if (pw.length >= 8)          s++;
  if (/[A-Z]/.test(pw))        s++;
  if (/[0-9]/.test(pw))        s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return [
    { score: s, label: 'Too short', color: '#ef4444' },
    { score: s, label: 'Weak',      color: '#f97316' },
    { score: s, label: 'Fair',      color: '#f59e0b' },
    { score: s, label: 'Good',      color: '#84cc16' },
    { score: s, label: 'Strong',    color: '#10b981' },
  ][s];
}
const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// ── Sub-components ────────────────────────────────────────────────────────────
const Badge = ({ status }) => <span className={`ap-badge ap-badge--${status.toLowerCase()}`}>{status}</span>;

const PwInput = ({ label, value, onChange, placeholder, error }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="ap-fg">
      <label className="ap-label">{label}</label>
      <div className="ap-input-wrap">
        <span className="ap-input-ico"><Icon d={IC.lock} size={14} /></span>
        <input
          type={show ? 'text' : 'password'}
          className={'ap-input ap-input--ico' + (error ? ' ap-input--err' : '')}
          placeholder={placeholder} value={value}
          onChange={e => onChange(e.target.value)}
        />
        <button type="button" className="ap-pw-toggle" onClick={() => setShow(v => !v)}>
          <Icon d={show ? IC.eyeOff : IC.eye} size={14} />
        </button>
      </div>
      {error && <p className="ap-err-msg">{error}</p>}
    </div>
  );
};

// ── Modal ─────────────────────────────────────────────────────────────────────
const Modal = ({ user, onSave, onClose }) => {
  const [email,     setEmail]     = useState(user.email);
  const [curPw,     setCurPw]     = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [confPw,    setConfPw]    = useState('');
  const [errs,      setErrs]      = useState({});
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const strength = pwStrength(newPw);

  const validate = () => {
    const e = {};
    if (!validEmail(email))         e.email  = 'Enter a valid email address.';
    if (newPw && newPw.length < 8)  e.newPw  = 'Password must be at least 8 characters.';
    if (newPw && newPw !== confPw)  e.confPw = 'Passwords do not match.';
    if (newPw && !curPw)            e.curPw  = 'Current password is required.';
    return e;
  };

  // --- Updated: Handles Real Network Request to Backend API ---
  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrs(e); return; }
    
    setLoading(true);
    setErrs({});

    try {
      const response = await fetch(window.base_api + "update_admin_account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: user.token,
          user_id: user._id,
          email: email.trim(),
          currentPassword: curPw ? curPw : undefined,
          newPassword: newPw ? newPw : undefined
        })
      });

      const data = await response.json();

      if (data.remarks === "success") {
        // Pass the updated user parameters up to the main application state
        onSave({ email: email.trim() });
      } else {
        // Map backend validation rejections directly to UI fields
        if (data.field === "currentPassword") {
          setErrs({ curPw: data.message });
        } else if (data.field === "email") {
          setErrs({ email: data.message });
        } else {
          alert(data.message || "An error occurred while updating profile configurations.");
        }
      }
    } catch (err) {
      console.error("Network connection error updating account records:", err);
      alert("Failed to reach server pipeline infrastructure. Please check connection.");
    } finally {
      setLoading(false);
    }
  };

  const overlayStyle = {
    position:        'fixed',
    top:             0,
    left:            0,
    right:           0,
    bottom:          0,
    width:           '100vw',
    height:          '100vh',
    background:      'rgba(15,23,42,0.55)',
    backdropFilter:  'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    zIndex:          2147483647,
    padding:         '20px',
    boxSizing:       'border-box',
  };

  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ap-modal">
        <div className="ap-modal__hd">
          <div className="ap-modal__hd-left">
            <div className="ap-modal__icon"><Icon d={IC.edit} size={17} /></div>
            <div>
              <h2 className="ap-modal__title">Edit Profile</h2>
              <p className="ap-modal__sub">Update your email or password</p>
            </div>
          </div>
          <button className="ap-icon-btn" onClick={onClose}><Icon d={IC.close} size={17} /></button>
        </div>

        <div className="ap-modal__body">
          <div className="ap-fg">
            <label className="ap-label">Email Address</label>
            <div className="ap-input-wrap">
              <span className="ap-input-ico"><Icon d={IC.mail} size={14} /></span>
              <input
                type="email"
                className={'ap-input ap-input--ico' + (errs.email ? ' ap-input--err' : '')}
                placeholder="your@email.com" value={email}
                onChange={e => { setEmail(e.target.value); setErrs(p => ({ ...p, email: '' })); }}
              />
            </div>
            {errs.email && <p className="ap-err-msg">{errs.email}</p>}
          </div>

          <div className="ap-divider"><span>Change Password <em className="ap-opt">Optional</em></span></div>

          <PwInput label="Current Password" value={curPw}
            onChange={v => { setCurPw(v); setErrs(p => ({ ...p, curPw: '' })); }}
            placeholder="Enter current password" error={errs.curPw} />

          <PwInput label="New Password" value={newPw}
            onChange={v => { setNewPw(v); setErrs(p => ({ ...p, newPw: '' })); }}
            placeholder="Min. 8 characters" error={errs.newPw} />

          {newPw && (
            <>
              <div className="ap-strength">
                <div className="ap-strength__bars">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="ap-strength__bar"
                      style={{ background: i <= strength.score ? strength.color : '#e2e8f0' }} />
                  ))}
                </div>
                <span style={{ color: strength.color, fontSize: '.74rem', fontWeight: 700 }}>{strength.label}</span>
              </div>
              <ul className="ap-reqs">
                {[
                  [newPw.length >= 8,           'At least 8 characters'],
                  [/[A-Z]/.test(newPw),         'One uppercase letter'],
                  [/[0-9]/.test(newPw),         'One number'],
                  [/[^A-Za-z0-9]/.test(newPw),  'One special character'],
                ].map(([ok, txt]) => (
                  <li key={txt} className={'ap-req' + (ok ? ' ap-req--ok' : '')}>
                    <Icon d={ok ? IC.check : IC.close} size={11} color={ok ? '#10b981' : '#94a3b8'} />
                    {txt}
                  </li>
                ))}
              </ul>
            </>
          )}

          <PwInput label="Confirm New Password" value={confPw}
            onChange={v => { setConfPw(v); setErrs(p => ({ ...p, confPw: '' })); }}
            placeholder="Re-enter new password" error={errs.confPw} />

          {newPw && confPw && newPw === confPw && !errs.confPw && (
            <p className="ap-match"><Icon d={IC.check} size={12} color="#10b981" /> Passwords match</p>
          )}
        </div>

        <div className="ap-modal__ft">
          <button className="ap-btn ap-btn--ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="ap-btn ap-btn--primary" onClick={handleSave} disabled={loading}>
            {loading ? <><span className="ap-spinner" /> Saving…</> : <><Icon d={IC.check} size={14} /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Toast ─────────────────────────────────────────────────────────────────────
const Toast = ({ message, type, onClose }) => (
  <div className={`ap-toast ap-toast--${type}`}>
    <Icon d={type === 'success' ? IC.check : IC.alert} size={15} />
    <span>{message}</span>
    <button className="ap-toast__x" onClick={onClose}><Icon d={IC.close} size={13} /></button>
  </div>
);

const Avatar = ({ name }) => (
  <div className="ap-avatar-mini">{name.charAt(0).toUpperCase()}</div>
);

// ── Main ──────────────────────────────────────────────────────────────────────
const AdminProfile = () => {
  const {user, permission} = useContext(UserContext);
  const [userData,       setUser]       = useState(user);
  const [logs,       setLogs]           = useState([]);
  const [showModal,  setShowModal]      = useState(false);
  const [toast,      setToast]          = useState(null);
  const [search,     setSearch]         = useState('');
  const [modFilter,  setModFilter]      = useState('All');
  const [dateFil,    setDateFil]        = useState('');

  // Helper inside main scope to map production strings to internal color keys
  const getModuleFromAction = (actionType = '') => {
    const type = actionType.toLowerCase();
    if (type.includes('project') || type.includes('order') || type.includes('workflow')) return 'Project';
    if (type.includes('auth') || type.includes('login') || type.includes('password') || type.includes('permission')) return 'Security';
    if (type.includes('file') || type.includes('proof') || type.includes('upload') || type.includes('inspection')) return 'Assets';
    return 'System';
  };

  // Dynamically assemble available filters based on your parsed DB actions instead of static INIT_LOGS array
  const modules = useMemo(() => {
    const uniqueModules = new Set(logs.map(l => getModuleFromAction(l.actionType)));
    return ['All', ...Array.from(uniqueModules)];
  }, [logs]);

  useEffect(() => {
    if (user.token) {
      fetchLogs(user);
    }
  }, [user])

  function fetchLogs(user) {
    const token = user.token
    const user_id = user._id;

    if (!token) return

    const api_url = window.base_api + "get_logs";
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, user_id })
    };

    CRUD(api_url, requestOptions, (res) => {
      if (res.remarks === "success") {
        setLogs(res.payload);
      } else {
        console.error("Failed to fetch logs:", res.message);
        setLogs([])
      }
    });
  }

  // --- Updated: Production DB Matching Filtering Pipeline ---
  const filtered = useMemo(() => logs.filter(l => {
    const actionStr = l.actionType || '';
    const descStr = l.description || '';
    const computedMod = getModuleFromAction(actionStr);
    
    // Check if user search matches description or code categories
    const matchesSearch = actionStr.toLowerCase().includes(search.toLowerCase()) || 
                          descStr.toLowerCase().includes(search.toLowerCase()) ||
                          computedMod.toLowerCase().includes(search.toLowerCase());

    // Compare date portions of ISO strings safely
    const logDateISO = l.createdAt ? l.createdAt.slice(0, 10) : ''; // Extracts 'YYYY-MM-DD'
    const matchesDate = !dateFil || logDateISO === dateFil;
    const matchesModule = modFilter === 'All' || computedMod === modFilter;

    return matchesSearch && matchesModule && matchesDate;
  }), [logs, search, modFilter, dateFil]);

  const notify = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Updated: Mocks a data entry format matching your Mongo payload patterns
  const handleSave = ({ email }) => {
    const newLog = { 
      _id: 'mock' + Date.now(),
      actionType: 'Update Profile Settings', 
      description: 'Modified account layout verification parameters for profile email coordination.',
      createdAt: new Date().toISOString()
    };
    setUser(u => ({ ...u, email }));
    setLogs(l => [newLog, ...l]);
    setShowModal(false);
    notify('Profile updated successfully.');
  };

  return (
    <div className="ap-root">
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 2147483647 }}>
          <Toast {...toast} onClose={() => setToast(null)} />
        </div>
      )}

      {showModal && <Modal user={userData} onSave={handleSave} onClose={() => setShowModal(false)} />}

      <div className="ap-ph">
        <div>
          <h1 className="ap-ph__title">Admin Profile</h1>
          <p className="ap-ph__sub">Manage your account details and activity history</p>
        </div>
        <button className="ap-btn ap-btn--primary ap-btn--sm" onClick={() => setShowModal(true)}>
          <Icon d={IC.edit} size={14} /> Edit Profile
        </button>
      </div>

      <div className="ap-card">
        <div className="ap-card__accent" />
        <div className="ap-card__avatar-col">
          <div className="ap-avatar">
            <span>{userData.firstName?.trim().charAt(0).toUpperCase() || 'A'}</span>
            <span className="ap-avatar__dot" />
          </div>
          <span className="ap-status-pill"><span className="ap-status-dot" />{userData.status || 'Active'}</span>
        </div>

        <div className="ap-card__info">
          <div className="ap-card__name-row">
            <h2 className="ap-card__name">{userData.name || (userData.firstName + ' ' + userData.lastName)}</h2>
            <span className="ap-role-badge"><Icon d={IC.shield} size={11} />{userData.role}</span>
          </div>
          <div className="ap-fields">
            {[
              { icon: IC.mail,     label: 'Email Address', value: userData.email,     disabled: false },
              { icon: IC.user,     label: 'Full Name',     value: userData.firstName + ' ' + userData.lastName,      disabled: true  },
              { icon: IC.shield,   label: 'Role',          value: userData.role ? (userData.role.trim().charAt(0).toUpperCase() + userData.role.trim().slice(1)) : '',      disabled: true  },
              { icon: IC.clock,    label: 'Last Login',    value: userData.lastLogin ? new Date(userData.lastLogin).toLocaleDateString() : 'Never', disabled: false },
              { icon: IC.calendar, label: 'Member Since',  value: userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A',    disabled: false },
            ].map(f => (
              <div key={f.label} className={'ap-field' + (f.disabled ? ' ap-field--ro' : '')}>
                <span className="ap-field__ico"><Icon d={f.icon} size={13} /></span>
                <div>
                  <span className="ap-field__lbl">
                    {f.label}
                    {f.disabled && <span className="ap-ro-tag">Read-only</span>}
                  </span>
                  <span className="ap-field__val">{f.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ap-card__stats">
          {[
            { label: 'Total Actions', value: logs.length },
            { 
              label: 'This Month',    
              value: logs.filter(l => {
                const currentMonthStr = new Date().toISOString().slice(0, 7);
                return l.createdAt && l.createdAt.startsWith(currentMonthStr);
              }).length 
            },
          ].map(s => (
            <div key={s.label} className="ap-stat">
              <span className="ap-stat__val">{s.value}</span>
              <span className="ap-stat__lbl">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="ap-log">
        <div className="ap-log__hd">
          <div>
            <h2 className="ap-log__title">Activity Log</h2>
            <p className="ap-log__sub">{filtered.length} entries found</p>
          </div>
          <div className="ap-log__controls">
            <div className="ap-search">
              <Icon d={IC.search} size={13} color="#94a3b8" />
              <input 
                className="ap-search__input" 
                placeholder="Search activities…"
                value={search} 
                onChange={e => setSearch(e.target.value)} 
              />
            </div>
            <div className="ap-sel-wrap">
              <Icon d={IC.filter} size={12} color="#64748b" />
              <select className="ap-sel" value={modFilter} onChange={e => setModFilter(e.target.value)}>
                {modules.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="ap-sel-wrap">
              <Icon d={IC.calendar} size={12} color="#64748b" />
              <input type="date" className="ap-sel" value={dateFil} onChange={e => setDateFil(e.target.value)} />
            </div>
            {(search || modFilter !== 'All' || dateFil) && (
              <button 
                className="ap-btn ap-btn--ghost ap-btn--sm"
                onClick={() => { setSearch(''); setModFilter('All'); setDateFil(''); }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="ap-log__scroll">
          {filtered.length === 0 ? (
            <div className="ap-empty">
              <div className="ap-empty__ico"><Icon d={IC.activity} size={28} color="#cbd5e1" /></div>
              <p className="ap-empty__t">No activities found</p>
              <p className="ap-empty__s">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="ap-timeline">
              {filtered.map((log, idx) => {
                const computedModule = getModuleFromAction(log.actionType);
                
                const dateObj = log.createdAt ? new Date(log.createdAt) : new Date();
                const displayDate = dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
                const displayTime = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

                return (
                  <div key={log._id || log.id} className="ap-tl-item" style={{ '--d': `${idx * 35}ms` }}>
                    <div className="ap-tl-spine">
                      <div className="ap-tl-dot" style={{ background: MOD_COLORS[computedModule] || '#3b82f6' }}>
                        <Icon d={MOD_ICONS[computedModule] || IC.activity} size={10} color="#fff" />
                      </div>
                      {idx < filtered.length - 1 && <div className="ap-tl-line" />}
                    </div>
                    <div className="ap-log-card">
                      <div className="ap-log-card__l">
                        <p className="ap-log-card__action" style={{ fontWeight: '600', color: '#1e293b' }}>
                          {log.actionType}
                        </p>
                        <p className="ap-log-card__desc" style={{ fontSize: '13px', color: '#64748b', marginTop: '2px', marginBottom: '8px' }}>
                          {log.description}
                        </p>
                        <div className="ap-log-card__meta">
                          <span className="ap-chip" style={{ '--c': MOD_COLORS[computedModule] || '#3b82f6' }}>
                            {computedModule}
                          </span>
                          <span className="ap-meta-item">
                            <Icon d={IC.calendar} size={11} color="#94a3b8" />
                            {displayDate}
                          </span>
                          <span className="ap-meta-item">
                            <Icon d={IC.clock} size={11} color="#94a3b8" />
                            {displayTime}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;