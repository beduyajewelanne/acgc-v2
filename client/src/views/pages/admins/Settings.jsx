import React, { useState, useEffect, useRef } from 'react';
import './Settings.css';
import { UserContext } from 'App';
import { CRUD } from 'services/data.services';
// ─── Static Dummy Data ────────────────────────────────────────────────────────

const ALL_MODULES = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦' },
  { id: 'products', label: 'Product Management', icon: '⬡' },
  { id: 'inspection', label: 'Site Inspection', icon: '◈' },
  { id: 'progress', label: 'Progress Monitoring', icon: '◎' },
  { id: 'transactions', label: 'Transactions', icon: '⬕' },
  { id: 'reports', label: 'Reports', icon: '▤' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];

const CUSTOMER_PERMS = [
  { id: 'canRequestOrders', label: 'Can Request Orders', desc: 'Submit new glass/aluminum orders' },
  { id: 'canEstimatePricing', label: 'Can Estimate Pricing', desc: 'Access the pricing estimator tool' },
  { id: 'viewOnly', label: 'View Only Access', desc: 'Read-only access to their account' },
  { id: 'canRequestInspection', label: 'Can Request Site Inspection', desc: 'Schedule on-site inspections' },
  { id: 'canTrackProgress', label: 'Can Track Project Progress', desc: 'Monitor active project status' },
];

const INITIAL_USERS = [
  {
    id: 1, name: 'Marco Reyes', email: 'marco.reyes@glasspro.ph',
    role: 'Staff', subrole: 'Skilled Worker', status: 'Active',
    avatar: 'MR',
    modules: { dashboard: true, products: true, inspection: true, progress: true, transactions: false, reports: false, settings: false },
    permissions: {},
  },
  {
    id: 2, name: 'Liza Santos', email: 'liza.santos@glasspro.ph',
    role: 'Staff', subrole: 'Helper', status: 'Active',
    avatar: 'LS',
    modules: { dashboard: true, products: false, inspection: true, progress: true, transactions: false, reports: false, settings: false },
    permissions: {},
  },
  {
    id: 3, name: 'Rodrigo Bautista', email: 'r.bautista@glasspro.ph',
    role: 'Staff', subrole: 'Skilled Worker', status: 'Inactive',
    avatar: 'RB',
    modules: { dashboard: true, products: true, inspection: false, progress: false, transactions: true, reports: true, settings: false },
    permissions: {},
  },
  {
    id: 4, name: 'Ana Torres', email: 'ana.torres@client.com',
    role: 'Customer', subrole: null, status: 'Active',
    avatar: 'AT',
    modules: {},
    permissions: { canRequestOrders: true, canEstimatePricing: true, viewOnly: false, canRequestInspection: true, canTrackProgress: true },
  },
  {
    id: 5, name: 'Jose Dela Cruz', email: 'jose.delacruz@client.com',
    role: 'Customer', subrole: null, status: 'Active',
    avatar: 'JD',
    modules: {},
    permissions: { canRequestOrders: false, canEstimatePricing: false, viewOnly: true, canRequestInspection: false, canTrackProgress: true },
  },
  {
    id: 6, name: 'Maria Gonzales', email: 'mgonzales@client.com',
    role: 'Customer', subrole: null, status: 'Inactive',
    avatar: 'MG',
    modules: {},
    permissions: { canRequestOrders: true, canEstimatePricing: true, viewOnly: false, canRequestInspection: true, canTrackProgress: true },
  },
  {
    id: 7, name: 'Carlo Mendez', email: 'carlo.m@glasspro.ph',
    role: 'Staff', subrole: 'Helper', status: 'Active',
    avatar: 'CM',
    modules: { dashboard: true, products: false, inspection: true, progress: true, transactions: false, reports: false, settings: false },
    permissions: {},
  },
];

const INITIAL_BACKUPS = [
  { id: 1, name: 'FULL_BACKUP_2026-05-25', date: 'May 25, 2026', type: 'Full System', size: '142.3 MB', status: 'Success' },
  { id: 2, name: 'WEEKLY_BACKUP_2026-05-18', date: 'May 18, 2026', type: 'Weekly', size: '98.7 MB', status: 'Success' },
  { id: 3, name: 'WEEKLY_BACKUP_2026-05-11', date: 'May 11, 2026', type: 'Weekly', size: '91.2 MB', status: 'Success' },
  { id: 4, name: 'MONTHLY_BACKUP_2026-04-30', date: 'Apr 30, 2026', type: 'Monthly', size: '210.5 MB', status: 'Success' },
  { id: 5, name: 'WEEKLY_BACKUP_2026-04-27', date: 'Apr 27, 2026', type: 'Weekly', size: '88.9 MB', status: 'Failed' },
  { id: 6, name: 'YEARLY_BACKUP_2025-12-31', date: 'Dec 31, 2025', type: 'Yearly', size: '1.04 GB', status: 'Success' },
];

// ─── Utility Components ───────────────────────────────────────────────────────

const Toast = ({ message, type, onClose }) => (
  <div className={`toast toast-${type}`}>
    <span className="toast-icon">{type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
    <span>{message}</span>
    <button className="toast-close" onClick={onClose}>×</button>
  </div>
);

const Toggle = ({ checked, onChange, disabled }) => (
  <button
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    className={`toggle-switch ${checked ? 'toggle-on' : 'toggle-off'} ${disabled ? 'toggle-disabled' : ''}`}
    onClick={() => !disabled && onChange(!checked)}
  >
    <span className="toggle-thumb" />
  </button>
);

const Avatar = ({ initials, role }) => {
  const colors = {
    'Staff': 'avatar-staff',
    'Customer': 'avatar-customer',
  };
  return (
    <div className={`avatar ${colors[role] || 'avatar-default'}`}>
      {initials}
    </div>
  );
};

const StatusBadge = ({ status }) => (
  <span className={`status-badge ${status === 'Active' ? 'status-active' : 'status-inactive'}`}>
    <span className="status-dot" />
    {status}
  </span>
);

const RoleBadge = ({ role, subrole }) => (
  <div className="role-cell">
    <span className={`role-badge ${role === 'Staff' ? 'role-staff' : 'role-customer'}`}>{role}</span>
    {subrole && <span className="subrole-badge">{subrole}</span>}
  </div>
);

const ConfirmDialog = ({ title, message, onConfirm, onCancel, confirmLabel = 'Confirm', danger = false }) => (
  <div className="modal-overlay" onClick={onCancel}>
    <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
      <h3 className="confirm-title">{title}</h3>
      <p className="confirm-message">{message}</p>
      <div className="confirm-actions">
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </div>
  </div>
);

// ─── RBAC Modal ───────────────────────────────────────────────────────────────

const RBACModal = ({ user, onClose, onSave, showToast }) => {
  const [modules, setModules] = useState({ ...user.modules });
  const [subrole, setSubrole] = useState(user.subrole || 'Helper');
  const [customRoles, setCustomRoles] = useState([]);
  const [newRole, setNewRole] = useState('');
  const [convertConfirm, setConvertConfirm] = useState(false);

  const toggleModule = (id) => setModules(prev => ({ ...prev, [id]: !prev[id] }));

  const handleAddRole = () => {
    const trimmed = newRole.trim();
    if (trimmed && !customRoles.includes(trimmed)) {
      setCustomRoles(prev => [...prev, trimmed]);
      setNewRole('');
    }
  };

  const handleSave = () => {
    onSave(user.id, { modules, subrole });
    showToast('Staff permissions updated successfully', 'success');
    onClose();
  };

  const handleConvert = () => {
    onSave(user.id, { role: 'Customer', subrole: null, modules: {}, permissions: { canRequestOrders: true, canEstimatePricing: true, viewOnly: false, canRequestInspection: true, canTrackProgress: true } });
    showToast(`${user.name} has been downgraded to Customer`, 'success');
    onClose();
  };

  const allRoles = ['Helper', 'Skilled Worker', ...customRoles];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal rbac-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-user-info">
            <Avatar initials={user.avatar} role={user.role} />
            <div>
              <h2 className="modal-title">Staff Access Control</h2>
              <p className="modal-subtitle">{user.name} · {user.email}</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Subrole */}
          <div className="modal-section">
            <h3 className="section-label">Staff Subrole</h3>
            <div className="subrole-row">
              <select
                className="styled-select"
                value={subrole}
                onChange={e => setSubrole(e.target.value)}
              >
                {allRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <div className="custom-role-input">
                <input
                  className="text-input"
                  placeholder="Add custom subrole..."
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddRole()}
                />
                <button className="btn-outline-sm" onClick={handleAddRole}>Add</button>
              </div>
            </div>
            {customRoles.length > 0 && (
              <div className="custom-roles-list">
                {customRoles.map(r => (
                  <span key={r} className="custom-role-tag">
                    {r}
                    <button onClick={() => setCustomRoles(prev => prev.filter(x => x !== r))}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Module Access */}
          <div className="modal-section">
            <h3 className="section-label">Module Access Control</h3>
            <p className="section-desc">Toggle which admin modules this staff member can access.</p>
            <div className="modules-grid">
              {ALL_MODULES.map(mod => (
                <div key={mod.id} className={`module-card ${modules[mod.id] ? 'module-enabled' : 'module-disabled'}`}>
                  <div className="module-info">
                    <span className="module-icon">{mod.icon}</span>
                    <span className="module-label">{mod.label}</span>
                  </div>
                  <Toggle checked={!!modules[mod.id]} onChange={() => toggleModule(mod.id)} />
                </div>
              ))}
            </div>
          </div>

          {/* Access Preview */}
          <div className="modal-section">
            <h3 className="section-label">Access Preview</h3>
            <div className="access-preview">
              {ALL_MODULES.map(mod => (
                <div key={mod.id} className={`preview-item ${modules[mod.id] ? 'preview-allowed' : 'preview-blocked'}`}>
                  <span>{mod.icon} {mod.label}</span>
                  <span className="preview-status">{modules[mod.id] ? '✓ Accessible' : '✕ Blocked'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-danger-outline" onClick={() => setConvertConfirm(true)}>
            ↓ Downgrade to Customer
          </button>
          <div className="footer-right">
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={handleSave}>Save Changes</button>
          </div>
        </div>

        {convertConfirm && (
          <ConfirmDialog
            title="Downgrade to Customer?"
            message={`${user.name} will lose all staff privileges and be converted to a Customer account.`}
            onConfirm={handleConvert}
            onCancel={() => setConvertConfirm(false)}
            confirmLabel="Downgrade"
            danger
          />
        )}
      </div>
    </div>
  );
};

// ─── Customer Permissions Modal ───────────────────────────────────────────────

const CustomerModal = ({ user, onClose, onSave, showToast }) => {
  const [perms, setPerms] = useState({ ...user.permissions });
  const [upgradeConfirm, setUpgradeConfirm] = useState(false);

  const toggle = (id) => setPerms(prev => ({ ...prev, [id]: !prev[id] }));

  const handleSave = () => {
    onSave(user.id, { permissions: perms });
    showToast('Customer permissions updated successfully', 'success');
    onClose();
  };

  const handleUpgrade = () => {
    onSave(user.id, {
      role: 'Staff', subrole: 'Helper', permissions: {},
      modules: { dashboard: true, products: false, inspection: false, progress: true, transactions: false, reports: false, settings: false }
    });
    showToast(`${user.name} has been upgraded to Staff`, 'success');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal customer-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-user-info">
            <Avatar initials={user.avatar} role={user.role} />
            <div>
              <h2 className="modal-title">Customer Permissions</h2>
              <p className="modal-subtitle">{user.name} · {user.email}</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="modal-section">
            <h3 className="section-label">Feature Access</h3>
            <p className="section-desc">Control what this customer can do within the customer portal.</p>
            <div className="perms-list">
              {CUSTOMER_PERMS.map(p => (
                <div key={p.id} className={`perm-card ${perms[p.id] ? 'perm-enabled' : 'perm-disabled'}`}>
                  <div className="perm-text">
                    <span className="perm-label">{p.label}</span>
                    <span className="perm-desc">{p.desc}</span>
                  </div>
                  <Toggle checked={!!perms[p.id]} onChange={() => toggle(p.id)} />
                </div>
              ))}
            </div>
          </div>

          <div className="modal-section">
            <h3 className="section-label">Portal Preview</h3>
            <div className="portal-preview">
              {CUSTOMER_PERMS.map(p => (
                <div key={p.id} className={`preview-item ${perms[p.id] ? 'preview-allowed' : 'preview-blocked'}`}>
                  <span>{p.label}</span>
                  <span className="preview-status">{perms[p.id] ? '✓ Enabled' : '✕ Disabled'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-upgrade" onClick={() => setUpgradeConfirm(true)}>
            ↑ Upgrade to Staff
          </button>
          <div className="footer-right">
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={handleSave}>Save Changes</button>
          </div>
        </div>

        {upgradeConfirm && (
          <ConfirmDialog
            title="Upgrade to Staff?"
            message={`${user.name} will be promoted to Staff with Helper subrole and basic module access.`}
            onConfirm={handleUpgrade}
            onCancel={() => setUpgradeConfirm(false)}
            confirmLabel="Upgrade"
          />
        )}
      </div>
    </div>
  );
};

// ─── Global Customer Permissions Helpers ─────────────────────────────────────

const deriveGlobalPerms = (users) => {
  const customers = users.filter(u => u.role === 'Customer');
  if (!customers.length) return Object.fromEntries(CUSTOMER_PERMS.map(p => [p.id, false]));
  return Object.fromEntries(
    CUSTOMER_PERMS.map(p => [p.id, customers.every(c => c.permissions[p.id])])
  );
};

const GlobalCustomerPerms = ({ users, onApply, showToast }) => {
  const [globalPerms, setGlobalPerms] = React.useState(() => deriveGlobalPerms(users));
  const [expanded, setExpanded] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const customerCount = users.filter(u => u.role === 'Customer').length;

  React.useEffect(() => {
    setGlobalPerms(deriveGlobalPerms(users));
  }, [users]);

  const toggle = (id) => setGlobalPerms(prev => ({ ...prev, [id]: !prev[id] }));

  const handleApply = () => {
    onApply(globalPerms);
    setConfirmOpen(false);
    showToast(`Global permissions applied to all ${customerCount} customers`, 'success');
  };

  return (
    <div className="global-perms-panel">
      <div className="global-perms-header" onClick={() => setExpanded(v => !v)}>
        <div className="global-perms-left">
          <span className="global-perms-icon">&#9676;</span>
          <div>
            <span className="global-perms-title">Global Customer Permissions</span>
            <span className="global-perms-sub">
              Changes apply to all <strong>{customerCount}</strong> customer accounts at once
            </span>
          </div>
        </div>
        <div className="global-perms-right">
          <div className="global-perm-dots">
            {CUSTOMER_PERMS.map(p => (
              <span
                key={p.id}
                className={`gperm-dot ${globalPerms[p.id] ? 'gperm-dot-on' : 'gperm-dot-off'}`}
                title={p.label}
              />
            ))}
          </div>
          <span className="global-perms-cta">Manage All</span>
          <span className={`expand-chevron ${expanded ? 'chevron-open' : ''}`}>&#8250;</span>
        </div>
      </div>

      {expanded && (
        <div className="global-perms-body">
          <div className="global-perms-grid">
            {CUSTOMER_PERMS.map(p => (
              <div key={p.id} className={`global-perm-card ${globalPerms[p.id] ? 'gperm-enabled' : 'gperm-disabled'}`}>
                <div className="perm-text">
                  <span className="perm-label">{p.label}</span>
                  <span className="perm-desc">{p.desc}</span>
                </div>
                <Toggle checked={!!globalPerms[p.id]} onChange={() => toggle(p.id)} />
              </div>
            ))}
          </div>
          <div className="global-perms-actions">
            <span className="global-perms-hint">
              &#9888; This will overwrite all individual customer permission settings.
            </span>
            <button className="btn-apply-global" onClick={() => setConfirmOpen(true)}>
              Apply to All Customers
            </button>
          </div>
        </div>
      )}

      {confirmOpen && (
        <ConfirmDialog
          title="Apply to All Customers?"
          message={`This will overwrite the permissions of all ${customerCount} customer accounts with the current global settings. Individual overrides will be replaced.`}
          onConfirm={handleApply}
          onCancel={() => setConfirmOpen(false)}
          confirmLabel="Apply to All"
        />
      )}
    </div>
  );
};

// ─── User Management Section ──────────────────────────────────────────────────

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Users' },
  { value: 'Customer', label: 'Customers' },
  { value: 'Staff', label: 'Staff' },
  { value: 'Helper', label: 'Helpers' },
  { value: 'Skilled Worker', label: 'Skilled Workers' },
];

const UserManagement = ({ showToast }) => {
  const { user, setUser } = React.useContext(UserContext);
  const [users, setUsers] = useState(INITIAL_USERS);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalType, setModalType] = useState(null); // 'rbac' | 'customer'

  useEffect(() => {
    if (user.token !== '' || user.token !== null) {
      _getUsers(user, setUsers);
    }
  }, [user])

  function _getUsers(user, callback) {
    callback([])
    var token = user.token;
    var _id = user._id;

    var requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, _id })
    };

    CRUD(window.base_api + "get_settings_users", requestOptions, (res) => {
      if (res && res.remarks === "success") {
        callback(res.payload);
      } else {
        callback([])
      }
    });
  }

  const filtered = users?.filter(u => {
    const matchSearch = u?.firstName?.toLowerCase().includes(search.toLowerCase()) || u?.lastName?.toLowerCase().includes(search.toLowerCase()) || u?.email?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all' ? true :
      filter === 'Staff' ? u.role === 'staff' :
      filter === 'Customer' ? u.role === 'customer' :
      u.subrole === filter;
    return matchSearch && matchFilter;
  });

  const handleManage = (user) => {
    setSelectedUser(user);
    setModalType(user.role === 'Staff' ? 'rbac' : 'customer');
  };

  const handleSave = (id, updates) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  };

  const handleGlobalPerms = (globalPerms) => {
    setUsers(prev => prev.map(u =>
      u.role === 'Customer' ? { ...u, permissions: { ...globalPerms } } : u
    ));
  };

  const counts = {
    all: users?.length || 0,
    Customer: users?.filter(u => u.role === 'customer')?.length || 0,
    Staff: users?.filter(u => u.role === 'staff')?.length || 0,
    Helper: users?.filter(u => u.subrole === 'helper')?.length || 0,
    'Skilled Worker': users?.filter(u => u.subrole === 'skilled_worker')?.length || 0,
  };

  return (
    <div className="section-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">User Management</h2>
          <p className="section-subtitle">Manage roles, permissions, and access for all system users.</p>
        </div>
        <div className="user-stats">
          <div className="stat-pill"><span className="stat-num">{counts.all}</span> Total</div>
          <div className="stat-pill stat-staff"><span className="stat-num">{counts.Staff}</span> Staff</div>
          <div className="stat-pill stat-customer"><span className="stat-num">{counts.Customer}</span> Customers</div>
        </div>
      </div>

      {/* Global Customer Permissions */}
      <GlobalCustomerPerms users={users} onApply={handleGlobalPerms} showToast={showToast} />

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            className={`filter-tab ${filter === opt.value ? 'filter-tab-active' : ''}`}
            onClick={() => setFilter(opt.value)}
          >
            {opt.label}
            <span className="filter-count">{counts[opt.value] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="search-row">
        <div className="search-wrap">
          <span className="search-icon">⌕</span>
          <input
            className="search-input"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="search-clear" onClick={() => setSearch('')}>×</button>}
        </div>
        <span className="result-count">{filtered.length} user{filtered.length !== 1 ? 's' : ''} found</span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">◈</div>
          <h3>No users found</h3>
          <p>Try adjusting your search or filter criteria.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Module Access</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="table-row">
                  <td>
                    <div className="user-cell">
                      <Avatar initials={u.firstName?.charAt(0) + u.lastName?.charAt(0)} role={u.role} />
                      <div className="user-info">
                        <span className="user-name">{u.firstName} {u.lastName}</span>
                        <span className="user-email">{u.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <RoleBadge
                      role={u.role
                        ?.replace(/_/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                      subrole={u.subrole
                        ?.replace(/_/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    />
                  </td>
                  <td><StatusBadge status={u.status} /></td>
                  <td>
                    {u.role === 'Staff' ? (
                      <div className="module-dots">
                        {ALL_MODULES.map(m => (
                          <span
                            key={m.id}
                            className={`module-dot ${u.modules[m.id] ? 'dot-on' : 'dot-off'}`}
                            title={`${m.label}: ${u.modules[m.id] ? 'Accessible' : 'Blocked'}`}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="portal-access">Customer Portal</span>
                    )}
                  </td>
                  <td>
                    <button className="btn-manage" onClick={() => handleManage(u)}>
                      {u.role === 'Staff' ? 'Manage Access' : 'View Permissions'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {selectedUser && modalType === 'rbac' && (
        <RBACModal user={selectedUser} onClose={() => { setSelectedUser(null); setModalType(null); }} onSave={handleSave} showToast={showToast} />
      )}
      {selectedUser && modalType === 'customer' && (
        <CustomerModal user={selectedUser} onClose={() => { setSelectedUser(null); setModalType(null); }} onSave={handleSave} showToast={showToast} />
      )}
    </div>
  );
};

// ─── Backup & Recovery Section ────────────────────────────────────────────────

const SCHEDULE_OPTIONS = [
  { id: 'weekly', label: 'Weekly', icon: '◷', desc: 'Every Sunday at midnight' },
  { id: 'monthly', label: 'Monthly', icon: '◈', desc: '1st of every month' },
  { id: 'yearly', label: 'Yearly', icon: '◉', desc: 'December 31st at midnight' },
  { id: 'full', label: 'Full System', icon: '▦', desc: 'Complete system snapshot' },
];

const BackupRecovery = ({ showToast }) => {
  const [backups, setBackups] = useState(INITIAL_BACKUPS);
  const [schedule, setSchedule] = useState('weekly');
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [restoreConfirm, setRestoreConfirm] = useState(null);

  const last = backups[0];

  const simulateAction = (action, duration = 2000) => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      action();
    }, duration);
  };

  const handleBackupNow = () => {
    simulateAction(() => {
      const now = new Date();
      const label = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const typeMap = { weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly', full: 'Full System' };
      const newBackup = {
        id: Date.now(),
        name: `${schedule.toUpperCase()}_BACKUP_${now.toISOString().split('T')[0]}`,
        date: label,
        type: typeMap[schedule],
        size: `${(Math.random() * 100 + 80).toFixed(1)} MB`,
        status: 'Success',
      };
      setBackups(prev => [newBackup, ...prev]);
      showToast('Backup completed successfully!', 'success');
    }, 2500);
  };

  const handleDelete = (id) => {
    setBackups(prev => prev.filter(b => b.id !== id));
    setDeleteConfirm(null);
    showToast('Backup record deleted.', 'success');
  };

  const handleRestore = (backup) => {
    simulateAction(() => {
      setRestoreConfirm(null);
      showToast(`System restored from ${backup.name}`, 'success');
    }, 3000);
  };

  const handleDownload = (backup) => {
    simulateAction(() => showToast(`Downloading ${backup.name}...`, 'success'), 1000);
  };

  const successCount = backups.filter(b => b.status === 'Success').length;
  const totalSize = backups.reduce((acc, b) => {
    const num = parseFloat(b.size);
    const unit = b.size.includes('GB') ? 1024 : 1;
    return acc + (isNaN(num) ? 0 : num * unit);
  }, 0);

  return (
    <div className="section-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">Backup & Recovery</h2>
          <p className="section-subtitle">Manage system backups, schedules, and data restoration.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="backup-summary">
        <div className="summary-card">
          <span className="summary-icon">◷</span>
          <div>
            <span className="summary-label">Last Backup</span>
            <strong className="summary-value">{last?.date ?? '—'}</strong>
          </div>
        </div>
        <div className="summary-card">
          <span className="summary-icon">◎</span>
          <div>
            <span className="summary-label">Backup Status</span>
            <strong className={`summary-value ${last?.status === 'Success' ? 'value-green' : 'value-red'}`}>{last?.status ?? '—'}</strong>
          </div>
        </div>
        <div className="summary-card">
          <span className="summary-icon">▦</span>
          <div>
            <span className="summary-label">Total Records</span>
            <strong className="summary-value">{backups.length} backups</strong>
          </div>
        </div>
        <div className="summary-card">
          <span className="summary-icon">⬕</span>
          <div>
            <span className="summary-label">Success Rate</span>
            <strong className="summary-value value-green">{backups.length ? Math.round((successCount / backups.length) * 100) : 0}%</strong>
          </div>
        </div>
      </div>

      {/* Schedule Selection */}
      <div className="backup-panel">
        <h3 className="panel-title">Backup Schedule</h3>
        <div className="schedule-grid">
          {SCHEDULE_OPTIONS.map(opt => (
            <div
              key={opt.id}
              className={`schedule-card ${schedule === opt.id ? 'schedule-selected' : ''}`}
              onClick={() => setSchedule(opt.id)}
            >
              <span className="schedule-icon">{opt.icon}</span>
              <div>
                <strong className="schedule-label">{opt.label}</strong>
                <span className="schedule-desc">{opt.desc}</span>
              </div>
              <div className="schedule-radio">
                {schedule === opt.id && <div className="radio-dot" />}
              </div>
            </div>
          ))}
        </div>

        <div className="backup-actions">
          <button
            className={`btn-backup-now ${isLoading ? 'btn-loading' : ''}`}
            onClick={handleBackupNow}
            disabled={isLoading}
          >
            {isLoading ? (
              <><span className="spinner" /> Processing...</>
            ) : (
              <> ▶ Backup Now</>
            )}
          </button>
        </div>
      </div>

      {/* Backup History Table */}
      <div className="backup-panel">
        <h3 className="panel-title">Backup History</h3>
        {backups.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">▦</div>
            <h3>No backup records</h3>
            <p>Run your first backup to see history here.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Backup Name</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map(b => (
                  <tr key={b.id} className="table-row">
                    <td>
                      <span className="backup-name">{b.name}</span>
                    </td>
                    <td className="text-muted">{b.date}</td>
                    <td>
                      <span className="type-badge">{b.type}</span>
                    </td>
                    <td className="text-muted">{b.size}</td>
                    <td>
                      <span className={`backup-status ${b.status === 'Success' ? 'backup-success' : 'backup-failed'}`}>
                        {b.status === 'Success' ? '✓' : '✕'} {b.status}
                      </span>
                    </td>
                    <td>
                      <div className="backup-row-actions">
                        <button className="action-btn" title="Restore" onClick={() => setRestoreConfirm(b)}>↺</button>
                        <button className="action-btn" title="Download" onClick={() => handleDownload(b)}>↓</button>
                        <button className="action-btn action-delete" title="Delete" onClick={() => setDeleteConfirm(b)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteConfirm && (
        <ConfirmDialog
          title="Delete Backup Record?"
          message={`This will permanently remove "${deleteConfirm.name}" from the history. This cannot be undone.`}
          onConfirm={() => handleDelete(deleteConfirm.id)}
          onCancel={() => setDeleteConfirm(null)}
          confirmLabel="Delete"
          danger
        />
      )}

      {restoreConfirm && !isLoading && (
        <ConfirmDialog
          title="Restore System Backup?"
          message={`Restoring from "${restoreConfirm.name}" (${restoreConfirm.date}). All current data will be replaced.`}
          onConfirm={() => handleRestore(restoreConfirm)}
          onCancel={() => setRestoreConfirm(null)}
          confirmLabel="Restore"
          danger
        />
      )}
    </div>
  );
};

// ─── Root Settings Component ──────────────────────────────────────────────────

const Settings = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <div className="settings-root">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Glass & Aluminum Business Management System</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-nav">
        <button
          className={`tab-btn ${activeTab === 'users' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <span className="tab-icon">◎</span>
          User Management
        </button>
        <button
          className={`tab-btn ${activeTab === 'backup' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('backup')}
        >
          <span className="tab-icon">▦</span>
          Backup & Recovery
        </button>
      </div>

      {/* Content */}
      <div className="settings-content">
        {activeTab === 'users' && <UserManagement showToast={showToast} />}
        {activeTab === 'backup' && <BackupRecovery showToast={showToast} />}
      </div>

      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </div>
  );
};

export default Settings;
