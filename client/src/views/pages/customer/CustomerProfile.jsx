import React, { useState } from 'react';
import './CustomerProfile.css';
import EditProfileModal from './EditProfileModal';
import { useNavigate } from 'react-router-dom'; // Keep only one instance

const CustomerProfile = () => {
  const navigate = useNavigate(); // Added navigation hook
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [user, setUser] = useState({
    name: 'Jewel Anne Beduya',
    email: 'beduyajewelanne@gmail.com',
    phone: '',
  });

  const getInitials = (name) => {
    const parts = name.trim().split(' ');
    const first = parts[0]?.[0] || '';
    const last = parts[parts.length - 1]?.[0] || '';
    return (first + (parts.length > 1 ? last : '')).toUpperCase();
  };

  const handleSave = (updatedUser) => {
    setUser(updatedUser);
  };

  return (
    <div className="cp-container">

      <div className="cp-profile-card">
        <div className="cp-avatar">{getInitials(user.name)}</div>
        <div className="cp-user-meta">
          <h3 className="cp-name">{user.name}</h3>
          <p className="cp-email">{user.email}</p>
        </div>
        <button className="cp-edit-btn" onClick={() => setIsEditOpen(true)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Edit profile
        </button>
      </div>

      <div className="cp-nav-grid">
        <div className="cp-nav-item" onClick={() => navigate('/orders')}>
          <svg className="cp-nav-icon" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
          <span className="cp-nav-label">My orders</span>
          <span className="cp-nav-sub">5 active</span>
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
          <span className="cp-nav-sub">3 active</span>
        </div>

        <div className="cp-nav-item" onClick={() => navigate('/receipts')}>
          <svg className="cp-nav-icon" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          <span className="cp-nav-label">Receipts</span>
          <span className="cp-nav-sub">3 documents</span>
        </div>
      </div>

      <div className="cp-section-header">
        <h3 className="cp-section-title">Recent orders</h3>
        <span className="cp-view-all">
          View all
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
        </span>
      </div>

      <div className="cp-order-list">
        <div className="cp-order-item">
          <div className="cp-order-left">
            <div className="cp-order-icon-wrap">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            </div>
            <div className="cp-order-info">
              <h4 className="cp-order-name">Aluminum Window Frame Profile</h4>
              <p className="cp-order-meta">ACGC-MOTQ0BX6 &nbsp;·&nbsp; May 6, 2026</p>
            </div>
          </div>
          <div className="cp-order-right">
            <span className="cp-badge cp-badge--pending">Pending</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cp-chevron">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        user={user}
        onSave={handleSave}
      />

    </div>
  );
};

export default CustomerProfile;
