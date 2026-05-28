import React, { useState, useCallback, createContext, useEffect, useRef, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { getAccessLevels } from './services/data.services';

// Pages
import Login from './views/pages/Login';
import SignUpForm from './views/pages/SignUpForm';
import ForgotPassword from './views/pages/ForgotPassword';

// Layout & Components
import DashboardLayout from './components/layout/DashboardLayout';
import Footer from './components/layout/Footer';
import AboutUs from './components/AboutUs/AboutUs';
import AdminLayout from './components/layout/adminLayout/AdminLayout';

// Customer Pages
import CustomerRoutes from './views/pages/customer/CustomerRoutes';
import BrowseProducts from './views/pages/customer/BrowseProducts';
import CustomerDashboard from './views/pages/customer/CustomerDashboard';
import TrackProducts from './views/pages/customer/TrackProduct';
import { CartProvider } from './context/CartContext';
import CustomerProfile from './views/pages/customer/CustomerProfile';
import Contracts from './views/pages/customer/Contracts';
import Receipts from './views/pages/customer/Receipts';
import MyOrders from './views/pages/customer/MyOrders';
import Cart from './views/pages/customer/Cart';

// Admin Pages
import AdminDashboard from './views/pages/admins/AdminDashboard';
import Products from './views/pages/admins/Product';
import SiteInspection from './views/pages/admins/SiteInspection';
import ProgressMonitor from './views/pages/admins/ProgressMonitor';
import Transactions from './views/pages/admins/Transactions';
import Settings from './views/pages/admins/Settings';
import AdminProfile from './views/pages/admins/AdminProfile';

export const UserContext = createContext();

// 404 Layout Resource State View
const NotFound = () => (
  <div style={{ padding: '80px 20px', textAlign: 'center', fontFamily: 'sans-serif', color: '#1e293b' }}>
    <h1 style={{ fontSize: '4rem', margin: '0 0 10px 0', color: '#0f172a' }}>404</h1>
    <h2 style={{ fontSize: '1.5rem', fontWeight: '500', margin: '0 0 15px 0' }}>Page Not Found</h2>
    <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto 25px auto' }}>
      The asset route resource pathway you are attempting to locate does not exist or your profile lacks operational access privileges.
    </p>
    <a href="/" style={{ display: 'inline-block', background: '#0f172a', color: '#fff', textDecoration: 'none', padding: '10px 20px', borderRadius: '6px', fontSize: '0.9rem' }}>
      Return to Homepage
    </a>
  </div>
);

// ─── CUSTOM SECURE ROUTE BALANCER WRAPPER ──────────────────────────────────
const ProtectedRoute = ({ children, allowedRoles, moduleKey }) => {
  const { user, permissions, permissionsLoaded } = useContext(UserContext);
  const localSessionData = localStorage.getItem("userData");

  let currentRole = user?.role;
  let hasToken = !!user?.token;

  if (!hasToken && localSessionData) {
    try {
      const parsed = JSON.parse(localSessionData);
      currentRole = parsed?.role;
      hasToken = !!parsed?.token;
    } catch (e) {
      console.error(e);
    }
  }

  // 1. Not logged in at all? Prompt to authenticate
  if (!hasToken) {
    return <Navigate to="/login" replace />;
  }

  // 2. Validate core base system role authorization placement rules
  const userRoleNormalized = currentRole?.trim().toLowerCase();
  const isRoleAuthorized = allowedRoles.some(role => role.toLowerCase() === userRoleNormalized);

  if (!isRoleAuthorized) {
    return <NotFound />;
  }

  // 3. APPLY GRANULAR MATRIX CHECKS ONLY FOR ADMIN / STAFF (Bypassed for Customers)
  if ((userRoleNormalized === 'admin' || userRoleNormalized === 'staff') && moduleKey) {
    // Show uniform loading fallback if live data parameters aren't fully resolved yet
    if (!permissionsLoaded) {
      return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Authorizing security clearances...</div>;
    }

    // Direct Full Admins skip specific matrix block validation checks
    if (userRoleNormalized === 'admin') {
      return children;
    }

    const assignedModules = permissions?.modules || user?.modules;
    
    // Verify specific modular structural view bits flag criteria
    if (!assignedModules || !assignedModules[moduleKey] || assignedModules[moduleKey]["View"] !== 1) {
      return <NotFound />;
    }
  }

  return children;
};

// ─── DYNAMIC ADMIN ROUTE REDIRECT BALANCER ─────────────────────────────────
const AdminRedirectBalancer = () => {
  const { user, permissions, permissionsLoaded } = useContext(UserContext);
  
  if (!permissionsLoaded) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Calculating platform entry routes...</div>;
  }

  const role = user?.role?.trim().toLowerCase();
  const assignedModules = permissions?.modules || user?.modules;

  if (role === 'admin') {
    return <Navigate to="dashboard" replace />;
  }

  if (!assignedModules) {
    return <NotFound />;
  }

  const routingSequence = [
    { key: 'Dashboard', path: 'dashboard' },
    { key: 'Products', path: 'products' },
    { key: 'Site Inspection', path: 'site-inspections' },
    { key: 'Progress Monitor', path: 'monitor' },
    { key: 'Transactions', path: 'transactions' },
    { key: 'Settings', path: 'settings' },
    { key: 'Profile', path: 'profile' }
  ];

  for (let fallback of routingSequence) {
    if (assignedModules[fallback.key] && assignedModules[fallback.key]["View"] === 1) {
      return <Navigate to={fallback.path} replace />;
    }
  }

  return <NotFound />;
};

// State Callback Ref wrapper setup
export function useStateCallback(initialState) {
  const [state, setState] = useState(initialState);
  const cbRef = useRef(null);

  const setStateCallback = useCallback((state, cb) => {
    cbRef.current = cb;
    setState(state);
  }, []);

  useEffect(() => {
    if (cbRef.current) {
      cbRef.current(state);
      cbRef.current = null;
    }
  }, [state]);

  return [state, setStateCallback];
}

const AppContent = ({ isLoggedIn }) => {
  const location = useLocation();
  const hideFooterRoutes = ['/login', '/signup', '/forgot-password'];
  
  const isAdminPath = location.pathname.startsWith('/admin');
  const shouldShowFooter = !hideFooterRoutes.includes(location.pathname) && !isAdminPath;

  return (
    <>
      <Routes>
        {/* Public Guest Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUpForm />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        {/* Admin & Staff Safe Route Matrix Gate Blocks */}
        <Route 
          path="admin" 
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Staff']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminRedirectBalancer />} />
          
          <Route path="dashboard" element={
            <ProtectedRoute allowedRoles={['Admin', 'Staff']} moduleKey="Dashboard">
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="products" element={
            <ProtectedRoute allowedRoles={['Admin', 'Staff']} moduleKey="Products">
              <Products />
            </ProtectedRoute>
          } />
          <Route path="site-inspections" element={
            <ProtectedRoute allowedRoles={['Admin', 'Staff']} moduleKey="Site Inspection">
              <SiteInspection />
            </ProtectedRoute>
          } />
          <Route path="monitor" element={
            <ProtectedRoute allowedRoles={['Admin', 'Staff']} moduleKey="Progress Monitor">
              <ProgressMonitor />
            </ProtectedRoute>
          } />
          <Route path="transactions" element={
            <ProtectedRoute allowedRoles={['Admin', 'Staff']} moduleKey="Transactions">
              <Transactions />
            </ProtectedRoute>
          } />
          <Route path="settings" element={
            <ProtectedRoute allowedRoles={['Admin', 'Staff']} moduleKey="Settings">
              <Settings />
            </ProtectedRoute>
          } />
          <Route path="profile" element={
            <ProtectedRoute allowedRoles={['Admin', 'Staff']} moduleKey="Profile">
              <AdminProfile />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<NotFound />} />
        </Route>
        
        {/* Customer & Shared Guest Route Layout Mappings */}
        <Route path="/*" element={
          <DashboardLayout isLoggedIn={isLoggedIn}>
            <Routes>
              <Route index element={<CustomerDashboard isLoggedIn={isLoggedIn} />} />
              <Route path="customer/products" element={<BrowseProducts />} />
              <Route path="about" element={<AboutUs />} />
              <Route path="track" element={<TrackProducts />} />

              {/* Secure Customer Portal Route Blocks - Bypasses structural moduleKey checks */}
        
              <Route path="profile" element={<ProtectedRoute allowedRoles={['Client']}><CustomerProfile /></ProtectedRoute>} />
              <Route path="contracts" element={<ProtectedRoute allowedRoles={['Client']}><Contracts /></ProtectedRoute>} />
              <Route path="receipts" element={<ProtectedRoute allowedRoles={['Client']}><Receipts /></ProtectedRoute>} />
              <Route path="orders" element={<ProtectedRoute allowedRoles={['Client']}><MyOrders /></ProtectedRoute>} />
              <Route path="cart" element={<ProtectedRoute allowedRoles={['Client']}><Cart /></ProtectedRoute>} />
              
              <Route path="customer/*" element={
                isLoggedIn ? (
                  <ProtectedRoute allowedRoles={['Client']}>
                    <CustomerRoutes />
                  </ProtectedRoute>
                ) : (
                  <Navigate to="/login" replace />
                )
              } />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </DashboardLayout>
        } />
      </Routes>
      
      {/* Dynamic Footer */}
      {shouldShowFooter && <Footer />}
    </>
  );
};

function App() {
  window.base_api = typeof process.env.REACT_APP_API !== "undefined"
    ? process.env.REACT_APP_API
    : `http://localhost:5000/api/`;

  const [user, setUser] = useStateCallback({
    firstName: "", lastName: "", email: "", role: "",
    token: "", address: "", barangay: "", city: "",
    phone: "", _id: "",
  });

  const [permissions, setPermissions] = useState(null);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  const isLoggedIn = !!user.token;

  // Trigger permission fetcher sequence strictly for personnel tiers
  useEffect(() => {
    const roleNormalized = user?.role?.trim().toLowerCase();
    if (user && user.token && (roleNormalized === 'admin' || roleNormalized === 'staff')) {
      setPermissionsLoaded(false);
      getAccessLevels(user, (data) => {
        if (data) {
          setPermissions(data);
        }
        setPermissionsLoaded(true);
      });
    } else {
      getAccessLevels(user, (data) => {
        if (data) {
          setPermissions(data);
        }
        setPermissionsLoaded(true);
      });
    }
  }, [user]);

  useEffect(() => {
    const savedUser = localStorage.getItem("userData");
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser && parsedUser.token) {
          setUser(parsedUser);
        }
      } catch (e) {
        console.error("Failed to parse cached session data:", e);
        localStorage.removeItem("userData");
      }
    }
  }, [setUser]);

  return (
    <UserContext.Provider value={{ user, setUser, permissions, permissionsLoaded }}>
      <CartProvider>
        <Router>
          <AppContent isLoggedIn={isLoggedIn} />
        </Router>
      </CartProvider>
    </UserContext.Provider>
  );
}

export default App;