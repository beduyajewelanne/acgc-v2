import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBell } from 'react-icons/fa';
import './NotificationBell.css';

const POLL_INTERVAL = 15000;

const timeAgo = (dateStr) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const NotificationBell = ({ userId, token, role = 'customer' }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(() => {
    if (!token || !userId) return;
    fetch(window.base_api + 'get_notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, _id: userId, role }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res && res.remarks === 'success') {
          setNotifications(res.payload || []);
          setUnreadCount(res.unreadCount || 0);
        }
      })
      .catch(() => {
      });
  }, [token, userId, role]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleOpen = () => {
    setOpen((o) => !o);
  };
  const buildNavigationState = (n) => {
    const state = { highlightOrderId: n.orderId || null };

    if (n.type === 'order_cancelled') {
      state.showCanceled = true;
    }

    return state;
  };

  const handleNotificationClick = (n) => {
    if (!n.read) {
      fetch(window.base_api + 'mark_notification_read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, _id: userId, notificationId: n._id }),
      }).catch(() => {});
      setNotifications((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (n.link) navigate(n.link, { state: buildNavigationState(n) });
  };

  const handleMarkAllRead = (e) => {
    e.stopPropagation();
    fetch(window.base_api + 'mark_all_notifications_read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, _id: userId, role }),
    }).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <div className={`notif-bell-wrapper notif-bell-wrapper--${role}`} ref={wrapperRef}>
      <button
        type="button"
        className="notif-bell-btn"
        onClick={handleToggleOpen}
        aria-label="Notifications"
        data-tooltip="Notifications"
      >
        <FaBell size={19} />
        {unreadCount > 0 && (
          <span className="notif-bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-bell-panel">
          <div className="notif-bell-panel-header">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button type="button" className="notif-bell-mark-all" onClick={handleMarkAllRead}>
                Mark all as read
              </button>
            )}
          </div>
          <div className="notif-bell-list">
            {notifications.length === 0 ? (
              <div className="notif-bell-empty">No notifications yet.</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  className={`notif-bell-item${n.read ? '' : ' notif-bell-item--unread'}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className="notif-bell-item-title">{n.title}</div>
                  <div className="notif-bell-item-message">{n.message}</div>
                  <div className="notif-bell-item-time">{timeAgo(n.createdAt)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
