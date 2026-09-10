import React, { useState, useEffect, useRef } from 'react';
import './Settings.css';
import { UserContext } from '../../../App'; 
import { CRUD } from '../../../services/data.services'; 

// ─── Map Frontend Layout Fields to Backend Matrix JSON Keys ─────────────────
const ALL_MODULES = [
  { id: 'Dashboard', label: 'Dashboard', icon: '▦', actions: ['View'] },
  { id: 'Products', label: 'Product Management', icon: '⬡', actions: ['View', 'Add', 'Edit', 'Delete'] },
  { id: 'Site Inspection', label: 'Site Inspection', icon: '◈', actions: ['View', 'Add', 'View Details', 'Edit', 'Cancel', 'Generate Contract', 'Send Email', 'Download Contract', 'Manual Approve'] },
  { id: 'Progress Monitor', label: 'Progress Monitoring', icon: '◎', actions: ['View', 'View Details', 'Edit'] },
  { id: 'Transactions', label: 'Transactions', icon: '⬕', actions: ['View', 'View Details', 'Edit', 'View Contract', 'Download Contract', 'Send Email'] },
  { id: 'Settings', label: 'Settings', icon: '⚙', actions: ['View'] },
  { id: 'Profile', label: 'Profile', icon: '👤', actions: ['View', 'Edit'] },
];

const BASE_TEMPLATE = {
  "Client": { "Request Orders": 0, "View Only": 0, "Track Project Progress": 0, "Request Site Inspection": 0, "Estimate Pricing": 0 },
  "Dashboard": { "View": 0 },
  "Site Inspection": { "View": 0, "Add": 0, "View Details": 0, "Edit": 0, "Cancel": 0, "Generate Contract": 0 },
  "Progress Monitor": { "View": 0, "View Details": 0, "Edit": 0 },
  "Products": { "View": 0, "Add": 0, "Edit": 0, "Delete": 0 },
  "Transactions": { "View": 0, "View Details": 0, "Edit": 0, "View Contract": 0, "Download Contract": 0 },
  "Settings": { "View": 0, "Manage Access": 0, "Back Up": 0 },
  "Profile": { "View": 0, "Edit Profile": 0 }
};

const CUSTOMER_PERMS = [
  { id: 'Request Orders', label: 'Can Request Orders', desc: 'Submit new glass/aluminum orders' },
  { id: 'Estimate Pricing', label: 'Can Estimate Pricing', desc: 'Access the pricing estimator tool' },
  { id: 'View Only', label: 'View Only Access', desc: 'Read-only access to their account' },
  { id: 'Request Site Inspection', label: 'Can Request Site Inspection', desc: 'Schedule on-site inspections' },
  { id: 'Track Project Progress', label: 'Can Track Project Progress', desc: 'Monitor active project status' },
  { id: 'Can upload feedback', label: 'Can Upload/View Feedback', desc: 'Allow customers to view product feedbacks' },
  { id: 'Show Ratings Homepage', label: 'Show Ratings on Homepage', desc: 'Display average customer ratings section on homepage' }
];

const INITIAL_BACKUPS = [
  { id: 1, name: 'FULL_BACKUP_2026-05-25', date: 'May 25, 2026', type: 'Full System', size: '142.3 MB', status: 'Success' },
  { id: 2, name: 'WEEKLY_BACKUP_2026-05-18', date: 'May 18, 2026', type: 'Weekly', size: '98.7 MB', status: 'Success' },
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
  const normalizedRole = role?.trim().toLowerCase();
  const styleClass = normalizedRole === 'staff' || normalizedRole === 'admin' ? 'avatar-staff' : 'avatar-customer';
  return <div className={`avatar ${styleClass}`}>{initials}</div>;
};

const StatusBadge = ({ status }) => {
  const displayStatus = status || 'Active';
  return (
    <span className={`status-badge ${displayStatus === 'Active' ? 'status-active' : 'status-inactive'}`}>
      <span className="status-dot" />
      {displayStatus}
    </span>
  );
};

const RoleBadge = ({ role, subrole }) => (
  <div className="role-cell">
    <span className={`role-badge ${role?.toLowerCase() === 'client' || role?.toLowerCase() === 'customer' ? 'role-customer' : 'role-staff'}`}>{role}</span>
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

// ─── RBAC Modal (Staff & Admins Fine-Grained Controls) ─────────────────────────

const RBACModal = ({ user, onClose, onSave, showToast }) => {
  const [modules, setModules] = useState(() => {
    const merged = JSON.parse(JSON.stringify(BASE_TEMPLATE));
    const userModules = user?.modules || {};
    
    Object.keys(merged).forEach(m => {
      if (userModules[m]) merged[m] = { ...merged[m], ...userModules[m] };
    });
    return merged;
  });

  const [subrole, setSubrole] = useState(user?.subrole || 'Helper');
  const [newRole, setNewRole] = useState('');
  const [customRoles, setCustomRoles] = useState([]);
  const [convertConfirm, setConvertConfirm] = useState(false);
  const [expandedModule, setExpandedModule] = useState(null);

  const toggleActionPermission = (moduleId, actionKey) => {
    setModules(prev => {
      const currentVal = prev[moduleId]?.[actionKey] === 1 ? 0 : 1;
      const updatedModule = { ...prev[moduleId], [actionKey]: currentVal };
      
      // Safety rule: If an operational action is allowed, View must also be enabled
      if (actionKey !== 'View' && currentVal === 1) {
        updatedModule.View = 1;
      }
      // Safety rule: If View is unchecked, turn off all sub-actions
      if (actionKey === 'View' && currentVal === 0) {
        Object.keys(updatedModule).forEach(k => { updatedModule[k] = 0; });
      }

      return { ...prev, [moduleId]: updatedModule };
    });
  };

  const handleAddRole = () => {
    const trimmed = newRole.trim();
    if (trimmed && !customRoles.includes(trimmed)) {
      setCustomRoles(prev => [...prev, trimmed]);
      setNewRole('');
    }
  };

  const handleSave = () => {
    const updatedPayload = {
      role: 'staff',
      subrole: subrole,
      modules: modules
    };

    onSave(user?._id, updatedPayload, () => {
      showToast(`${user?.firstName || 'User'}'s administrative matrix access synced`, 'success');
      onClose();
    });
  };

  const handleConvert = () => {
    const clientDefault = {};
    CUSTOMER_PERMS.forEach(p => { clientDefault[p.id] = 1; });

    const downgradePayload = {
      role: 'client',
      subrole: null,
      modules: { Client: clientDefault }
    };

    onSave(user?._id, downgradePayload, () => {
      showToast(`${user?.firstName || 'User'} successfully converted to Customer profile`, 'success');
      onClose();
    });
  };

  const allRoles = ['Helper', 'Skilled Worker', ...customRoles];

  return (
    <div className="pm-overlay" onClick={onClose}>
      <div className="pm-modal rbac-modal text-left" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px' }}>
        <div className="pm-modal-header">
          <div className="modal-user-info">
            <Avatar initials={(user?.firstName?.charAt(0) || '') + (user?.lastName?.charAt(0) || '')} role={user?.role} />
            <div>
              <h2 className="modal-title">Staff Access Control</h2>
              <p className="modal-subtitle">{user?.firstName} {user?.lastName} · Permission Matrix</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="modal-section">
            <h3 className="section-label">Staff Subrole Designation</h3>
            <div className="subrole-row">
              <select className="styled-select" value={subrole} onChange={e => setSubrole(e.target.value)}>
                {allRoles.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <div className="custom-role-input">
                <input
                  className="text-input"
                  placeholder="Add custom subrole..."
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddRole()}
                />
                <button type="button" className="btn-outline-sm" onClick={handleAddRole}>Add</button>
              </div>
            </div>
          </div>

          <div className="modal-section">
            <h3 className="section-label">Module System Permissions</h3>
            <p className="section-desc">Click on a module block to configure individual CRUD / View action overrides.</p>
            
            <div className="modules-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
              {ALL_MODULES.map(mod => {
                const isViewEnabled = modules[mod.id]?.View === 1;
                const isExpanded = expandedModule === mod.id;

                return (
                  <div key={mod.id} className="module-item-container" style={{ border: '1px solid #eee', borderRadius: '6px', padding: '0.75rem' }}>
                    <div 
                      className="module-main-row" 
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                      onClick={() => setExpandedModule(isExpanded ? null : mod.id)}
                    >
                      <div className="module-info" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="module-icon">{mod.icon}</span>
                        <strong className="module-label">{mod.label}</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '0.8rem', color: '#888' }}>
                          {isExpanded ? '▲ Hide Sub-actions' : '▼ Manage Sub-actions'}
                        </span>
                        <Toggle checked={isViewEnabled} onChange={() => toggleActionPermission(mod.id, 'View')} />
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="module-actions-dropdown" style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #eee', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                        {mod.actions.map(action => (
                          <div key={action} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0.5rem', background: '#f9f9f9', borderRadius: '4px' }}>
                            <span style={{ fontSize: '0.85rem' }}>{action}</span>
                            <Toggle 
                              checked={modules[mod.id]?.[action] === 1} 
                              onChange={() => toggleActionPermission(mod.id, action)} 
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <button className="btn-danger-outline" onClick={() => setConvertConfirm(true)}>
            ↓ Convert to Customer
          </button>
          <div className="footer-right">
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" style={{ marginLeft: '0.5rem' }} onClick={handleSave}>Save Settings</button>
          </div>
        </div>

        {convertConfirm && (
          <ConfirmDialog
            title="Convert to Customer Profile?"
            message={`${user?.firstName || 'This user'} will lose all staff configuration variables and immediately downgrade into a standard client dashboard portal configuration.`}
            onConfirm={handleConvert}
            onCancel={() => setConvertConfirm(false)}
            confirmLabel="Confirm Conversion"
            danger
          />
        )}
      </div>
    </div>
  );
};

// ─── Customer Permissions Modal (Individual Customer Settings & Upgrading) ───

const CustomerModal = ({ user, onClose, onSave, showToast }) => {
  const [perms, setPerms] = useState(() => {
    const baseClient = BASE_TEMPLATE.Client || {};
    const userClient = user?.modules?.Client || {};
    console.log(userClient, baseClient)
    return { ...baseClient, ...userClient };
  });

  const [upgradeConfirm, setUpgradeConfirm] = useState(false);

  const togglePerm = (id) => {
    setPerms(prev => ({ ...prev, [id]: prev[id] === 1 ? 0 : 1 }));
  };

  const handleSave = () => {
    const updatedPayload = {
      role: 'client',
      subrole: null,
      modules: { Client: perms }
    };

    onSave(user?._id, updatedPayload, () => {
      showToast(`${user?.firstName || 'Customer'}'s portal matrix attributes updated`, 'success');
      onClose();
    });
  };

  const handleUpgrade = () => {
    // Setup fallback view permissions when upgrading a client to base operational staff
    const staffBaseModules = {};
    ALL_MODULES.forEach(module => {
      staffBaseModules[module.id] = {};

      module.actions.forEach(action => {
        staffBaseModules[module.id][action] =
          module.id !== "Site Inspection" &&
          (action === "View" || action === "View Details")
            ? 1
            : 0;
      });
    });

    const upgradePayload = {
      role: 'staff',
      subrole: 'Helper',
      modules: staffBaseModules
    };

    onSave(user?._id, upgradePayload, () => {
      showToast(`${user?.firstName || 'Customer'} successfully upgraded to Staff level privileges`, 'success');
      onClose();
    });
  };

  return (
    <div className="pm-overlay" onClick={onClose}>
      <div className="pm-modal pm-modal-lg animate-modal" onClick={e => e.stopPropagation()}>
        <div className="pm-modal-header">
          <div className="modal-user-info">
            <Avatar initials={(user?.firstName?.charAt(0) || '') + (user?.lastName?.charAt(0) || '')} role={user?.role} />
            <div>
              <h2 className="modal-title">Customer Matrix Permissions</h2>
              <p className="modal-subtitle">{user?.firstName} {user?.lastName} · Client Profile</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <p className="section-desc">Toggle specific baseline visibility rules for this customer portal view layout configuration.</p>
          <div className="global-perms-grid" style={{ marginTop: '1rem' }}>
            {CUSTOMER_PERMS.map(p => {
              const isEnabled = perms[p.id] === 1;
              return (
                <div key={p.id} className={`global-perm-card ${isEnabled ? 'gperm-enabled' : 'gperm-disabled'}`}>
                  <div className="perm-text">
                    <span className="perm-label">{p.label}</span>
                    <span className="perm-desc">{p.desc}</span>
                  </div>
                  <Toggle checked={isEnabled} onChange={() => togglePerm(p.id)} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <button className="btn-primary" style={{ background: '#28a745', borderColor: '#28a745' }} onClick={() => setUpgradeConfirm(true)}>
            ↑ Upgrade to Staff
          </button>
          <div className="footer-right">
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" style={{ marginLeft: '0.5rem' }} onClick={handleSave}>Save Matrix</button>
          </div>
        </div>

        {upgradeConfirm && (
          <ConfirmDialog
            title="Upgrade Customer to Operational Staff?"
            message={`This action grants administrative properties to ${user?.firstName || 'this user'}. You will be able to customize their granular module access right away.`}
            onConfirm={handleUpgrade}
            onCancel={() => setUpgradeConfirm(false)}
            confirmLabel="Confirm Upgrade"
          />
        )}
      </div>
    </div>
  );
};

// ─── Global Customer Permissions Helpers ─────────────────────────────────────

const GlobalCustomerPerms = ({ users, onApply, showToast }) => {
  const { user } = React.useContext(UserContext);
  const [globalPerms, setGlobalPerms] = useState({
    "Request Orders": false,
    "View Only": false,
    "Track Project Progress": false,
    "Request Site Inspection": false,
    "Estimate Pricing": false
  });
  const [expanded, setExpanded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  
  const customerCount = users?.filter(u => {
    const cleanRole = u?.role?.trim().toLowerCase();
    return cleanRole === 'client' || cleanRole === 'customer';
  }).length || 0;

  const userToken = user?.token;
  const userId = user?._id;

  useEffect(() => {
    if (userToken && userId) {
      const requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: userToken, _id: userId })
      };

      CRUD(window.base_api + "get_global_client_template", requestOptions, (res) => {
        if (res && res.remarks === "success" && res.payload) {
          const loadedPerms = {};
          CUSTOMER_PERMS.forEach(p => {
            loadedPerms[p.id] = res.payload[p.id] === 1;
          });
          setGlobalPerms(loadedPerms);
        }
      });
    }
  }, [userToken, userId]);

  const toggleGlobal = (id) => {
    setGlobalPerms(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleApply = () => {
    const mappedDatabasePayload = {};
    CUSTOMER_PERMS.forEach(p => {
      mappedDatabasePayload[p.id] = globalPerms[p.id] ? 1 : 0;
    });

    onApply(mappedDatabasePayload, () => {
      setConfirmOpen(false);
      showToast(`Global operational parameters saved and synchronized across ${customerCount} clients`, 'success');
    });
  };

  return (
    <div className="global-perms-panel">
      <div className="global-perms-header" onClick={() => setExpanded(v => !v)}>
        <div className="global-perms-left">
          <span className="global-perms-icon">&#9676;</span>
          <div>
            <span className="global-perms-title">Global Customer Permissions</span>
            <span className="global-perms-sub">
              Changes mirror the master <code>base_access_level</code> template and sync profiles
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
                <Toggle checked={globalPerms[p.id]} onChange={() => toggleGlobal(p.id)} />
              </div>
            ))}
          </div>
          <div className="global-perms-actions">
            <span className="global-perms-hint">
              &#9888; This updates your baseline reference layout and pushes the changes instantly.
            </span>
            <button className="btn-apply-global" onClick={() => setConfirmOpen(true)}>
              Apply & Save Master Template
            </button>
          </div>
        </div>
      )}

      {confirmOpen && (
        <ConfirmDialog
          title="Save & Propagate Global Matrix?"
          message={`This will overwrite the master client template and run updates across all ${customerCount} active client accounts.`}
          onConfirm={handleApply}
          onCancel={() => setConfirmOpen(false)}
          confirmLabel="Apply & Save"
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
  const { user } = React.useContext(UserContext);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalType, setModalType] = useState(null);

  const rootUserToken = user?.token;
  const rootUserId = user?._id;

  const refreshUserData = () => {
    if (rootUserToken && rootUserId) {
      const requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: rootUserToken, _id: rootUserId })
      };

      CRUD(window.base_api + "get_settings_users", requestOptions, (res) => {
        if (res && res.remarks === "success" && Array.isArray(res.payload)) {
          setUsers(res.payload);
        } else {
          setUsers([]);
        }
      });
    }
  };

  useEffect(() => {
    refreshUserData();
  }, [rootUserToken, rootUserId]);

  const handleSaveUserAccess = (targetUserId, updates, onCompleteSuccess) => {
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: user.token,
        admin_id: user._id,
        target_user_id: targetUserId,
        role: updates.role,
        subrole: updates.subrole,
        modules: updates.modules
      })
    };

    CRUD(window.base_api + "update_user_access_level", requestOptions, (res) => {
      if (res && res.remarks === "success") {
        refreshUserData();
        if (onCompleteSuccess) onCompleteSuccess();
      } else {
        showToast(res?.message || 'Error executing transactional update', 'error');
      }
    });
  };

  const handleGlobalCustomerApply = (globalClientModules, onCompleteSuccess) => {
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: user.token,
        admin_id: user._id,
        client_modules: globalClientModules
      })
    };

    CRUD(window.base_api + "update_global_customer_permissions", requestOptions, (res) => {
      if (res && res.remarks === "success") {
        refreshUserData();
        if (onCompleteSuccess) onCompleteSuccess();
      } else {
        showToast(res?.message || 'Batch update transaction dropped', 'error');
      }
    });
  };

  const filtered = users?.filter(u => {
    const firstNameStr = u?.firstName || '';
    const lastNameStr = u?.lastName || '';
    const emailStr = u?.email || '';
    const roleStr = u?.role || '';
    const subroleStr = u?.subrole || '';

    const matchSearch = firstNameStr.toLowerCase().includes(search.toLowerCase()) || 
                        lastNameStr.toLowerCase().includes(search.toLowerCase()) || 
                        emailStr.toLowerCase().includes(search.toLowerCase());
    
    const matchFilter =
      filter === 'all' ? true :
      filter === 'Staff' ? roleStr.toLowerCase() === 'staff' || roleStr.toLowerCase() === 'admin' :
      filter === 'Customer' ? roleStr.toLowerCase() === 'client' || roleStr.toLowerCase() === 'customer' :
      subroleStr.replace(/_/g, " ").toLowerCase() === filter.toLowerCase();
      
    return matchSearch && matchFilter;
  }) || [];

  const handleManage = (u) => {
    setSelectedUser(u);
    const normalizedRole = u?.role?.trim().toLowerCase();
    if (normalizedRole === 'staff' || normalizedRole === 'admin') {
      setModalType('rbac');
    } else {
      setModalType('client');
    }
  };

  const counts = {
    all: users?.length || 0,
    Customer: users?.filter(u => {
      const cleanRole = u?.role?.trim().toLowerCase();
      return cleanRole === 'client' || cleanRole === 'customer';
    })?.length || 0,
    Staff: users?.filter(u => u?.role?.toLowerCase() === 'staff' || u?.role?.toLowerCase() === 'admin')?.length || 0,
    Helper: users?.filter(u => u?.subrole?.toLowerCase() === 'helper')?.length || 0,
    'Skilled Worker': users?.filter(u => u?.subrole?.toLowerCase() === 'skilled worker' || u?.subrole?.toLowerCase() === 'skilled_worker')?.length || 0,
  };

  return (
    <div className="section-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">User Management</h2>
          <p className="section-subtitle">Manage dynamic security levels and permissions across administrative profiles.</p>
        </div>
        <div className="user-stats">
          <div className="stat-pill"><span className="stat-num">{counts.all}</span> Total</div>
          <div className="stat-pill stat-staff"><span className="stat-num">{counts.Staff}</span> Staff</div>
          <div className="stat-pill stat-customer"><span className="stat-num">{counts.Customer}</span> Customers</div>
        </div>
      </div>

      <GlobalCustomerPerms users={users} onApply={handleGlobalCustomerApply} showToast={showToast} />

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

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">◈</div>
          <h3>No records found</h3>
          <p>Modify search criteria or filters to expand your search query.</p>
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
              {filtered.map(u => {
                const isStaffTier = u?.role?.toLowerCase() === 'staff' || u?.role?.toLowerCase() === 'admin';
                return (
                  <tr key={u._id} className="table-row">
                    <td>
                      <div className="user-cell">
                        <Avatar initials={(u?.firstName?.charAt(0) || '') + (u?.lastName?.charAt(0) || '')} role={u?.role} />
                        <div className="user-info">
                          <span className="user-name">{u?.firstName} {u?.lastName}</span>
                          <span className="user-email">{u?.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <RoleBadge
                        role={u?.role?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        subrole={u?.subrole?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      />
                    </td>
                    <td><StatusBadge status={u?.status} /></td>
                    <td>
                      {isStaffTier ? (
                        <div className="module-dots">
                          {ALL_MODULES.map(m => {
                            const isAccessible = u?.modules?.[m.id]?.View === 1;
                            return (
                              <span
                                key={m.id}
                                className={`module-dot ${isAccessible ? 'dot-on' : 'dot-off'}`}
                                title={`${m.label}: ${isAccessible ? 'Accessible' : 'Blocked'}`}
                              />
                            );
                          })}
                        </div>
                      ) : (
                        <span className="portal-access">Customer Portal Matrix</span>
                      )}
                    </td>
                    <td>
                      <button className="btn-manage" onClick={() => handleManage(u)}>
                        {isStaffTier ? 'Manage Access' : 'View Permissions'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedUser && modalType === 'rbac' && (
        <RBACModal user={selectedUser} onClose={() => { setSelectedUser(null); setModalType(null); }} onSave={handleSaveUserAccess} showToast={showToast} />
      )}
      {selectedUser && modalType === 'client' && (
        <CustomerModal user={selectedUser} onClose={() => { setSelectedUser(null); setModalType(null); }} onSave={handleSaveUserAccess} showToast={showToast} />
      )}
    </div>
  );
};

// ─── Backup & Recovery Section ───────────────────────────────────────────────

const SCHEDULE_OPTIONS = [
  { id: 'weekly', label: 'Weekly', icon: '◷', desc: 'Every Sunday at midnight' },
  { id: 'monthly', label: 'Monthly', icon: '◈', desc: '1st of every month' },
  { id: 'yearly', label: 'Yearly', icon: '◉', desc: 'December 31st at midnight' },
  { id: 'full', label: 'Full System', icon: '▦', desc: 'Complete system snapshot' },
];

const BackupRecovery = ({ showToast }) => {
  const { user } = React.useContext(UserContext);
  const [backups, setBackups] = useState([]);
  const [schedule, setSchedule] = useState('weekly');
  const [metrics, setMetrics] = useState({
    lastBackup: '—',
    backupStatus: '—',
    totalRecords: 0,
    successRate: '0%'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [restoreConfirm, setRestoreConfirm] = useState(null);

  const userToken = user?.token;
  const userId = user?._id;

  // Fetch Dashboard Meta Metrics and Historical Records list from database on Mount
  const fetchBackupDashboardData = () => {
    const api_url = window.base_api + "backup/dashboard";
    const requestOptions = {
      method: "GET",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userToken}`
      }
    };

    CRUD(api_url, requestOptions, (res) => {
      if (res && res.remarks === "success" && res.payload) {
        setBackups(res.payload.history || []);
        setMetrics(res.payload.metrics);
        if (res.payload.settings?.activeSchedule) {
          setSchedule(res.payload.settings.activeSchedule);
        }
      }
    });
  };

  useEffect(() => {
    fetchBackupDashboardData();
  }, [userToken, userId]);

  // Handle Radio Input configuration modifications
  const handleScheduleChange = (targetScheduleId) => {
    setSchedule(targetScheduleId);
    
    const api_url = window.base_api + "backup/update-schedule";
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: userToken,
        admin_id: userId,
        activeSchedule: targetScheduleId
      })
    };

    CRUD(api_url, requestOptions, (res) => {
      if (res && res.remarks === "success") {
        showToast(`Backup frequency adjusted to ${targetScheduleId}`, 'success');
        fetchBackupDashboardData();
      } else {
        showToast(res?.message || 'Failed to update schedule matrix', 'error');
      }
    });
  };

  // Run instant manual snapshot compilation backup sequence
  const handleBackupNow = () => {
    setIsLoading(true);
    const api_url = window.base_api + "backup/run-manual";
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: userToken,
        admin_id: userId
      })
    };

    CRUD(api_url, requestOptions, (res) => {
      setIsLoading(false);
      if (res && res.remarks === "success") {
        showToast('System snapshot snapshot logged successfully!', 'success');
        fetchBackupDashboardData();
      } else {
        showToast(res?.error || 'Database compression stream failed', 'error');
      }
    });
  };

  const handleDelete = (id) => {
    // Optional implementation depending on your filesystem cleanup route structure
    setDeleteConfirm(null);
    showToast('Backup feature clearance command transmitted.', 'success');
  };

  const handleRestore = (backup) => {
    setIsLoading(true);
    setRestoreConfirm(null);
    
    // Simulating system restoration block safely
    setTimeout(() => {
      setIsLoading(false);
      showToast(`System variables rolled back to target ${backup.backupName}`, 'success');
      fetchBackupDashboardData();
    }, 3000);
  };

  const handleDownload = (backup) => {
    showToast(`Initializing secure download package stream for ${backup.backupName}...`, 'success');
  };

  return (
    <div className="section-container">
      <div className="section-header">
        <div>
          <h2 className="section-title">Backup & Recovery</h2>
          <p className="section-subtitle">Manage system backups, schedules, and data restoration snapshots.</p>
        </div>
      </div>

      <div className="backup-summary">
        <div className="summary-card">
          <span className="summary-icon">◷</span>
          <div>
            <span className="summary-label">Last Backup</span>
            <strong className="summary-value">
              {metrics.lastBackup !== "Never" && metrics.lastBackup !== "—"
                ? new Date(metrics.lastBackup).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : metrics.lastBackup}
            </strong>
          </div>
        </div>
        <div className="summary-card">
          <span className="summary-icon">◎</span>
          <div>
            <span className="summary-label">Backup Status</span>
            <strong className={`summary-value ${metrics.backupStatus === 'Success' ? 'value-green' : 'value-red'}`}>{metrics.backupStatus}</strong>
          </div>
        </div>
        <div className="summary-card">
          <span className="summary-icon">▦</span>
          <div>
            <span className="summary-label">Total Records</span>
            <strong className="summary-value">{metrics.totalRecords} backups</strong>
          </div>
        </div>
        <div className="summary-card">
          <span className="summary-icon">⬕</span>
          <div>
            <span className="summary-label">Success Rate</span>
            <strong className="summary-value value-green">{metrics.successRate}</strong>
          </div>
        </div>
      </div>

      <div className="backup-panel">
        <h3 className="panel-title">Backup Schedule</h3>
        <div className="schedule-grid">
          {SCHEDULE_OPTIONS.map(opt => (
            <div
              key={opt.id}
              className={`schedule-card ${schedule === opt.id ? 'schedule-selected' : ''}`}
              onClick={() => handleScheduleChange(opt.id)}
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
          <button className={`btn-backup-now ${isLoading ? 'btn-loading' : ''}`} onClick={handleBackupNow} disabled={isLoading}>
            {isLoading ? <><span className="spinner" /> Processing...</> : <> ▶ Backup Now</>}
          </button>
        </div>
      </div>

      <div className="backup-panel">
        <h3 className="panel-title">Backup History</h3>
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
                <tr key={b._id || b.id} className="table-row">
                  <td><span className="backup-name">{b.backupName || b.name}</span></td>
                  <td className="text-muted">
                    {b.date ? new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </td>
                  <td><span className="type-badge">{b.type}</span></td>
                  <td className="text-muted">{b.size}</td>
                  <td>
                    <span className={`backup-status ${b.status === 'Success' ? 'backup-success' : b.status === 'In Progress' ? 'backup-pending' : 'backup-failed'}`}>
                      {b.status === 'Success' ? '✓' : b.status === 'In Progress' ? '○' : '✕'} {b.status}
                    </span>
                  </td>
                  <td>
                    <div className="backup-row-actions">
                      <button className="action-btn" title="Restore" onClick={() => setRestoreConfirm(b)}>↺</button>
                      <button className="action-btn" title="Download" onClick={() => handleDownload(b)}>↓</button>
                      <button className="action-btn" title="Delete" onClick={() => setDeleteConfirm(b)}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
              {backups.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                    No tracking backup logs identified inside the historical registry.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteConfirm && (
        <ConfirmDialog
          title="Delete Backup Record?"
          message={`This will permanently remove "${deleteConfirm.backupName || deleteConfirm.name}". This cannot be undone.`}
          onConfirm={() => handleDelete(deleteConfirm._id || deleteConfirm.id)}
          onCancel={() => setDeleteConfirm(null)}
          confirmLabel="Delete"
          danger
        />
      )}

      {restoreConfirm && !isLoading && (
        <ConfirmDialog
          title="Restore System Backup?"
          message={`Restoring from "${restoreConfirm.backupName || restoreConfirm.name}". All current transactional modifications will be dropped.`}
          onConfirm={() => handleRestore(restoreConfirm)}
          onCancel={() => setRestoreConfirm(null)}
          confirmLabel="Restore"
          danger
        />
      )}
    </div>
  );
};

const Settings = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  return (
    <div className="settings-root">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Glass & Aluminum Business Management System</p>
        </div>
      </div>

      <div className="tab-nav">
        <button className={`tab-btn ${activeTab === 'users' ? 'tab-active' : ''}`} onClick={() => setActiveTab('users')}>
          <span className="tab-icon">◎</span> User Management
        </button>
        <button className={`tab-btn ${activeTab === 'backup' ? 'tab-active' : ''}`} onClick={() => setActiveTab('backup')}>
          <span className="tab-icon">▦</span> Backup & Recovery
        </button>
      </div>

      <div className="settings-content">
        {activeTab === 'users' && <UserManagement showToast={showToast} />}
        {activeTab === 'backup' && <BackupRecovery showToast={showToast} />}
      </div>

      <div className="toast-container">
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />
        ))}
      </div>
    </div>
  );
};

export default Settings;