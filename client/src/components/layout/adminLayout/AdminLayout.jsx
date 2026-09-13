import React, { useContext, useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardCheck,
  Activity,
  Package,
  Receipt,
  Settings as SettingsIcon,
  UserCircle,
  LogOut,
  ChevronLeft,
} from 'lucide-react';
import { UserContext } from '../../../App'; // Adjust this import path to point to your App.js
import './AdminLayout.css';
import NotificationBell from '../../NotificationBell/NotificationBell';

// Single source of truth for the sidebar links: icon, destination, and the
// permission key used by hasViewAccess. Add/remove modules here only.
const NAV_ITEMS = [
  {
    key: 'Dashboard',
    to: '/admin',
    label: 'Dashboard',
    icon: LayoutDashboard,
    isActive: (path) => path === '/admin' || path === '/admin/dashboard',
  },
  {
    key: 'Site Inspection',
    to: '/admin/site-inspections',
    label: 'Site Inspection',
    icon: ClipboardCheck,
    isActive: (path) => path.includes('inspections'),
  },
  {
    key: 'Progress Monitor',
    to: '/admin/monitor',
    label: 'Progress Monitor',
    icon: Activity,
    isActive: (path) => path.includes('monitor'),
  },
  {
    key: 'Products',
    to: '/admin/products',
    label: 'Products',
    icon: Package,
    isActive: (path) => path.includes('products'),
  },
  {
    key: 'Transactions',
    to: '/admin/transactions',
    label: 'Transactions',
    icon: Receipt,
    isActive: (path) => path.includes('transactions'),
  },
  {
    key: 'Settings',
    to: '/admin/settings',
    label: 'Settings',
    icon: SettingsIcon,
    isActive: (path) => path.includes('settings'),
  },
  {
    key: 'Profile',
    to: '/admin/profile',
    label: 'Profile',
    icon: UserCircle,
    isActive: (path) => path.includes('profile'),
  },
];

const SIDEBAR_COLLAPSE_KEY = 'acgc-admin-sidebar-collapsed';

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, permissions, permissionsLoaded } = useContext(UserContext);

  // Foldable sidebar state, remembered across visits/refreshes.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      // ignore storage failures (e.g. private browsing)
    }
  }, [collapsed]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  useEffect(() => {
    console.log(permissions);
  }, [permissions]);

  // Fallback while system checks clearances
  if (!permissionsLoaded) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading navigation panel...</div>;
  }

  const roleNormalized = user?.role?.trim().toLowerCase();
  const assignedModules = permissions?.modules || user?.modules;

  // Helper function to check if a navigation item should be visible
  const hasViewAccess = (moduleKey) => {
    // Full Admins automatically see all sidebar links
    if (roleNormalized === 'admin') return true;

    // Staff must have the module present and explicit View access set to 1
    return assignedModules?.[moduleKey] && assignedModules[moduleKey]["View"] == 1;
  };

  return (
    <div className="admin-layout">
      <aside className={`admin-sidebar${collapsed ? ' admin-sidebar--collapsed' : ''}`}>
        <button
          type="button"
          className="admin-sidebar-toggle"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft size={14} strokeWidth={2.5} />
        </button>

        <div className="admin-sidebar-header">
          <div className="admin-sidebar-header-row">
            <Link to="/admin" className="admin-sidebar-brand">
              <span className="admin-sidebar-logo">
                <img src="/images/acgc-logo.png" alt="ACGC logo" />
              </span>
              <span className="admin-sidebar-title">
                <span className="admin-sidebar-title-main">ACGC</span>
                <span className="admin-sidebar-title-sub">Glass &amp; Aluminum Services</span>
              </span>
            </Link>

            <NotificationBell userId={user?._id} token={user?.token} role="admin" />
          </div>
        </div>

        <nav className="admin-sidebar-nav">
          {NAV_ITEMS.map(({ key, to, label, icon: Icon, isActive }) => (
            hasViewAccess(key) && (
              <Link
                key={key}
                to={to}
                className={`admin-sidebar-link${isActive(location.pathname) ? ' admin-sidebar-link--active' : ''}`}
                data-tooltip={label}
              >
                <span className="admin-sidebar-link-icon"><Icon size={18} strokeWidth={2} /></span>
                <span className="admin-sidebar-link-label">{label}</span>
              </Link>
            )
          ))}
        </nav>

        <button type="button" onClick={handleLogout} className="admin-sidebar-logout" data-tooltip="Logout">
          <span className="admin-sidebar-link-icon"><LogOut size={18} strokeWidth={2} /></span>
          <span className="admin-sidebar-link-label">Logout</span>
        </button>
      </aside>
      <main className="admin-layout-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
