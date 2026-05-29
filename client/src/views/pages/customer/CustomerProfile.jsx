import React, { useContext, useState, useEffect, useCallback } from 'react';
import './CustomerProfile.css';
import EditProfileModal from './EditProfileModal';
import { useNavigate } from 'react-router-dom';
import { UserContext } from 'App';
import { CRUD } from 'services/data.services';

const CustomerProfile = () => {
  const { user, setUser: setGlobalUser } = useContext(UserContext); 
  const navigate = useNavigate();
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setUser] = useState(user || {});
  
  // Dashboard Metrics & Payloads State
  const [orders, setOrders] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Gather initials cleanly for customer profile avatar bubble
  const getInitials = (name) => {
    if (!name) return '';
    const parts = name.trim().split(' ');
    const first = parts[0]?.[0] || '';
    const last = parts[parts.length - 1]?.[0] || '';
    return (first + (parts.length > 1 ? last : '')).toUpperCase();
  };

  // 1. Wrap functions in useCallback to keep stable references
  const getUserDashboard = useCallback((currentUser) => {
    const token = currentUser?.token;
    const user_id = currentUser?._id;
    if (!token || !user_id) {
      console.error("User authentication token or ID is missing. Cannot fetch dashboard.");
      localStorage.removeItem('userData');
      return;
    }

    try {
      const api_url = window.base_api + "get_user_dashboard";
      const requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token, _id: user_id })
      };
      CRUD(api_url, requestOptions, async (res) => {
        if (res.remarks === "success") {
          setOrders(res.payload.orders || []);
          setContracts(res.payload.contracts || []);
          setReceipts(res.payload.receipts || []);
        }
      });
    } catch (err) {
      console.log("Network communication exception encountered:", err);
    }
  }, []);

  const getSpecificUser = useCallback((currentUser) => {
    const token = currentUser?.token;
    const user_id = currentUser?._id;
    if (!token || !user_id) {
      console.error("User authentication token or ID is missing. Cannot fetch profile.");
      localStorage.removeItem('userData');
      return;
    }

    try {
      const api_url = window.base_api + "get_user_profile";
      const requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token, _id: user_id })
      };
      CRUD(api_url, requestOptions, async (res) => {
        if (res.remarks === "success") {
          setUser(res.payload);
          setGlobalUser(res.payload); // This updates context safely now
          setLoading(false);
          getUserDashboard(currentUser);
        } else {
          console.error("Profile fetch rejected by database:", res.message);
          setLoading(false);
        }
      });
    } catch (error) {
      console.error("Network communication exception encountered:", error);
      setLoading(false);
    }
  }, [setGlobalUser, getUserDashboard]);

  // 2. Track user?._id instead of the entire user object to prevent object-reference rerenders
  const userId = user?._id;
  useEffect(() => {
    if (userId) {
      getSpecificUser(user);
    }
  }, [userId, getSpecificUser]); // Safe dependency tracking

  // Handle saving the user profile changes to the database
  const handleSave = async (updatedUser) => {
    const token = user?.token;
    const user_id = user?._id;

    if (!token || !user_id) {
      console.error("User authentication token or ID is missing. Cannot update profile.");
      localStorage.removeItem('userData');
      return;
    }

    try {
      const api_url = window.base_api + "update_user_profile";
      const requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token,
          _id: user_id,
          firstName: updatedUser.name.split(' ')[0] || '',
          lastName: updatedUser.name.split(' ').slice(1).join(' ') || '',
          email: updatedUser.email,
          phone: updatedUser.phone,
          address: updatedUser.address,
          province: updatedUser.province,
          city: updatedUser.city,
          barangay: updatedUser.barangay,
          zipCode: updatedUser.zipCode,
          password: updatedUser.password
        })
      };
      CRUD(api_url, requestOptions, async (res) => {
        if (res.remarks === "success") {
          delete updatedUser.password;
          const mergedUser = { ...user, ...updatedUser };
          setUser(mergedUser); // Keep local UI state updated instantly
          setGlobalUser(mergedUser);
        } else {
          console.error("Profile modification rejected by database:", res.message);
        }
      });
    } catch (error) {
      console.error("Network communication exception encountered:", error);
    }
  };

  if (loading) {
    return (
      <div className="cp-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <p style={{ color: '#666', fontSize: '14px' }}>Loading account profile records...</p>
      </div>
    );
  }

  // Derived calculations based on server states
  const activeOrdersCount = orders.filter(o => o.status?.toLowerCase() !== 'completed' && o.status?.toLowerCase() !== 'cancelled').length;
  const activeContractsCount = contracts.filter(c => c.status?.toLowerCase() !== 'expired' && c.status?.toLowerCase() !== 'terminated').length;

  return (
    <div className="cp-container">

      {/* Profile Summary Infrastructure */}
      <div className="cp-profile-card">
        <div className="cp-avatar">
          {getInitials(selectedUser.firstName ? `${selectedUser.firstName} ${selectedUser.lastName}` : selectedUser.name)}
        </div>
        <div className="cp-user-meta">
          <h3 className="cp-name">
            {selectedUser.firstName ? `${selectedUser.firstName} ${selectedUser.lastName}` : (selectedUser.name || 'Client Account')}
          </h3>
          <p className="cp-email">{selectedUser.email || 'No email provided'}</p>
        </div>
        <button className="cp-edit-btn" onClick={() => setIsEditOpen(true)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Edit profile
        </button>
      </div>

      {/* Interactive Navigation Count Matrices */}
      <div className="cp-nav-grid">
        <div className="cp-nav-item" onClick={() => navigate('/orders')}>
          <svg className="cp-nav-icon" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
          <span className="cp-nav-label">My orders</span>
          <span className="cp-nav-sub">{activeOrdersCount} active</span>
        </div>

        <div className="cp-nav-item" onClick={() => navigate('/contracts')}>
          <svg className="cp-nav-icon" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          <span className="cp-nav-label">Contracts</span>
          <span className="cp-nav-sub">{activeContractsCount} active</span>
        </div>

        <div className="cp-nav-item" onClick={() => navigate('/receipts')}>
          <svg className="cp-nav-icon" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          <span className="cp-nav-label">Receipts</span>
          <span className="cp-nav-sub">{receipts.length} documents</span>
        </div>
      </div>

      <div className="cp-section-header">
        <h3 className="cp-section-title">Recent orders</h3>
        <span className="cp-view-all" onClick={() => navigate('/orders')} style={{ cursor: 'pointer' }}>
          View all
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
        </span>
      </div>

      {/* Dynamic Orders Scraper Layout */}
      <div className="cp-order-list">
        {orders.length > 0 ? (
          orders.slice(0, 3).map((order, index) => (
            <div key={order._id || index} className="cp-order-item" onClick={() => navigate(`/orders`)} style={{ cursor: 'pointer' }}>
              <div className="cp-order-left">
                <div className="cp-order-icon-wrap">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                  </svg>
                </div>
                <div className="cp-order-info">
                  <h4 className="cp-order-name">{order.itemDetails.name || order.item_name || 'Aluminum Window Frame Profile'}</h4>
                  <p className="cp-order-meta">
                    {order.orderId || order.tracking_id || 'ACGC-MOTQ0BX6'} &nbsp;·&nbsp; {order.createdAt ? new Date(order.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'Recent'}
                  </p>
                </div>
              </div>
              <div className="cp-order-right">
                <span className={`cp-badge cp-badge--${(order.status || 'pending').toLowerCase()}`}>
                  {order.status || 'Pending'}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cp-chevron">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: '#888', background: '#fcfcfc', borderRadius: '8px', border: '1px dashed #eee' }}>
            No recent transaction orders found.
          </div>
        )}
      </div>

      {/* Edit Profile Modal Injection Frame */}
      <EditProfileModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        user={{
          ...selectedUser,
          name: selectedUser.name || `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim()
        }}
        onSave={handleSave}
      />

    </div>
  );
};

export default CustomerProfile;