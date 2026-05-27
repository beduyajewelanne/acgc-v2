import React, { useState, useCallback, createContext, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';


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

export const UserContext = createContext();

// Helper para sa state with callback
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
  const shouldShowFooter = !hideFooterRoutes.includes(location.pathname);

  return (
    <>
     <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUpForm />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        {/* Admin Routes - Outside DashboardLayout so no header/footer */}
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="products" element={<Products />} />
        </Route>
        
        {/* Customer Routes - Inside DashboardLayout */}
        <Route path="/*" element={
          <DashboardLayout isLoggedIn={isLoggedIn}>
            <Routes>
              <Route index element={<CustomerDashboard isLoggedIn={isLoggedIn} />} />
              <Route path="customer/products" element={<BrowseProducts />} />
              <Route path="track" element={<TrackProducts />} />
              <Route path="about" element={<AboutUs />} />
              <Route path="profile" element={<CustomerProfile />} />
              <Route path="contracts" element={<Contracts />} />
              <Route path="receipts" element={<Receipts />} />
              <Route path="orders" element={<MyOrders />} />
              <Route path="cart" element={<Cart />} />
              <Route path="customer/*" element={
                isLoggedIn ? <CustomerRoutes /> : <Navigate to="/login" />
              } />
            </Routes>
          </DashboardLayout>
        } />
      </Routes>
      
      {/* Dynamic Footer Rendering */}
      {shouldShowFooter && !location.pathname.startsWith('/admin') && <Footer />}
    </>
  );
};

function App() {
  // Global API base
  window.base_api = typeof process.env.REACT_APP_API !== "undefined"
    ? process.env.REACT_APP_API
    : `http://localhost:5000/api/`;

  const [user, setUser] = useStateCallback({
    firstName: "", lastName: "", email: "", role: "",
    token: "", address: "", barangay: "", city: "",
    phone: "", _id: "",
  });

  const isLoggedIn = !!user.token;

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
    <UserContext.Provider value={{ user, setUser }}>
      {/* WRAP EVERYTHING INSIDE CartProvider */}
      <CartProvider>
        <Router>
          <AppContent isLoggedIn={isLoggedIn} />
        </Router>
      </CartProvider>
    </UserContext.Provider>
  );
}

export default App;