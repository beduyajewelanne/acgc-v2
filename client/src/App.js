import React , { useState , useCallback, createContext, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, UNSAFE_RouteContext } from 'react-router-dom';
import Login from './views/pages/Login'; // verify this matches your structure
import SignUpForm from './views/pages/SignUpForm'; 
import ForgotPassword from './views/pages/ForgotPassword';
import DashboardLayout from './components/layout/DashboardLayout';
import CustomerRoutes from './views/pages/customer/CustomerRoutes';
import BrowseProducts from './views/pages/customer/BrowseProducts';
import CustomerDashboard from './views/pages/customer/CustomerDashboard';
export const UserContext = createContext();
export function useStateCallback(initialState) {
  const [state, setState] = useState(initialState);
  const cbRef = useRef(null); // init mutable ref container for callbacks

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

function App() {
      window.base_api =
    typeof process.env.REACT_APP_API !== "undefined"
      ? process.env.REACT_APP_API
      : `http://localhost:5000/api/`;
  const [user, setUser] = useStateCallback({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
    token: "",
    address: "",
    barangay: "",
    city: "",
    email: "",
    phone: "",
    _id: "",
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
    <>
    <UserContext.Provider value={{ user, setUser }}>
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUpForm />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        <Route path="/*" element={
          <DashboardLayout isLoggedIn={isLoggedIn}>
            <Routes>
              {/* Homepage */}
              <Route path="/" element={<CustomerDashboard isLoggedIn={isLoggedIn} />} />
              <Route path="/customer/products" element={<BrowseProducts />} />
              
              {/* Protected Routes */}
              <Route path="/customer/*" element={
                isLoggedIn ? <CustomerRoutes /> : <Navigate to="/login" />
              } />
            </Routes>
          </DashboardLayout>
        } />
      </Routes>
    </Router>
    </UserContext.Provider>
    </>
  );
}

export default App;

