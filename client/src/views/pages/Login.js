import React, { useState, useEffect } from "react";
import { Link } from 'react-router-dom';

export default function Login() {
  const [form, setForm] = useState({ emailOrUsername: "", password: "", remember: false });
  const [message, setMessage] = useState(null); // { type: "error"|"warning"|"success", text }
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Admin modal state
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminForm, setAdminForm] = useState({
    fullName: "", username: "", email: "", password: "", confirmPassword: "",
  });
  const [adminShowPass, setAdminShowPass] = useState({ password: false, confirmPassword: false });
  const [adminMessage, setAdminMessage] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);

  // On mount: restore saved email, read logout reason, check if admin exists
  useEffect(() => {
    const savedEmail = getCookie("saved_email");
    if (savedEmail) {
      setForm((prev) => ({ ...prev, emailOrUsername: savedEmail, remember: true }));
    }

    const params = new URLSearchParams(window.location.search);
    const logout = params.get("logout");
    if (logout === "true") {
      localStorage.removeItem("token");
    }
    if (logout === "admin_deleted") {
      setMessage({ type: "warning", text: "⚠ Your admin account was deleted. Please login again." });
    } else if (logout === "no_admin") {
      setMessage({ type: "warning", text: "⚠ No admin account exists. You have been logged out." });
    } else if (logout === "account_deleted") {
      setMessage({ type: "warning", text: "⚠ Your account was deleted. Please contact support if this is a mistake." });
    }

    // Check if admin account exists
    fetch("/api/auth/check-admin")
      .then((res) => res.json())
      .then((data) => {
        if (!data.adminExists) setShowAdminModal(true);
      })
      .catch(() => {});
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function getCookie(name) {
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : "";
  }

  function setCookie(name, value, days) {
    const expires = days
      ? `; expires=${new Date(Date.now() + days * 864e5).toUTCString()}`
      : "; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/`;
  }

  function encodeField(value) {
    return btoa(unescape(encodeURIComponent(value)));
  }

  // ── Login submit ─────────────────────────────────────────────────────────────

  async function handleLogin(e) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    const payload = {
      emailOrUsername: encodeField(form.emailOrUsername),
      password: encodeField(form.password),
    };

    try {
      const res = await fetch(window.base_api + "auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.message || "Login failed." });
        return;
      }

      localStorage.setItem("token", data.token);

      if (form.remember) {
        setCookie("saved_email", form.emailOrUsername, 30);
      } else {
        setCookie("saved_email", "", -1);
      }

      const { role } = data.user;
      if (role === "admin") {
        window.location.href = "/admin/dashboard";
      } else if (role === "skilled_worker") {
        window.location.href = "/worker/dashboard";
      } else {
        window.location.href = "/dashboard";
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  // ── Admin creation submit ────────────────────────────────────────────────────

  async function handleCreateAdmin(e) {
    e.preventDefault();
    setAdminMessage(null);

    const { fullName, username, email, password, confirmPassword } = adminForm;

    if (!fullName || !username || !email || !password || !confirmPassword) {
      return setAdminMessage({ type: "error", text: "All fields are required." });
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      return setAdminMessage({ type: "error", text: "Username can only contain letters, numbers, dots, hyphens, and underscores." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setAdminMessage({ type: "error", text: "Please enter a valid email address." });
    }
    if (password.length < 8) {
      return setAdminMessage({ type: "error", text: "Password must be at least 8 characters long." });
    }
    if (password !== confirmPassword) {
      return setAdminMessage({ type: "error", text: "Passwords do not match." });
    }

    setAdminLoading(true);
    try {
      const res = await fetch("/api/auth/create-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: encodeField(fullName),
          username: encodeField(username),
          email: encodeField(email),
          password: encodeField(password),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAdminMessage({ type: "error", text: data.message || "Error creating admin." });
      } else {
        setAdminMessage({ type: "success", text: "✓ Admin account created successfully! You can now login." });
        setTimeout(() => setShowAdminModal(false), 2000);
      }
    } catch {
      setAdminMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setAdminLoading(false);
    }
  }

  return (
    <div className="page-bg">
      {/* SCOPED STYLES TO INJECT DIRECTLY */}
      <style>{`
        .page-bg {
          background: linear-gradient(135deg, #8a2525 0%, #4a1212 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          box-sizing: border-box;
        }
        .page-bg *, .page-bg *::before, .page-bg *::after {
          box-sizing: border-box;
        }
        .auth-wrapper {
          width: 100%;
          max-width: 920px;
          display: flex;
          justify-content: center;
        }
        .auth-card {
          display: flex;
          width: 100%;
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
          min-height: 540px;
        }
        .brand-panel {
          width: 40%;
          background: linear-gradient(135deg, #8a2525 0%, #4a1212 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 32px;
          text-align: center;
        }
        .brand-logo img {
          max-height: 64px;
          width: auto;
          margin-bottom: 20px;
        }
        .brand-text .small {
          font-size: 11px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #fca5a5;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .brand-text .title {
          font-size: 32px;
          margin: 0 0 16px 0;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .brand-text .desc {
          font-size: 13.5px;
          line-height: 1.6;
          color: #fca5a5;
          margin: 0;
          opacity: 0.9;
        }
        .form-panel {
          width: 60%;
          padding: 50px 64px;
          display: flex;
          align-items: center;
          background: #ffffff;
        }
        .form-inner {
          width: 100%;
          max-width: 380px;
          margin: 0 auto;
        }
        .form-heading {
          font-size: 26px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 6px 0;
          letter-spacing: -0.5px;
        }
        .form-sub {
          font-size: 14px;
          color: #6b7280;
          margin: 0 0 28px 0;
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .field label {
          font-size: 12.5px;
          font-weight: 500;
          color: #374151;
        }
        .field input, .password-field input {
          width: 100%;
          padding: 11px 14px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14.5px;
          color: #111827;
          outline: none;
          transition: all 0.2s ease;
        }
        .field input::placeholder, .password-field input::placeholder {
          color: #9ca3af;
        }
        .field input:focus, .password-field input:focus {
          border-color: #8a2525;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(138, 37, 37, 0.12);
        }
        .password-wrap {
          position: relative;
          width: 100%;
        }
        .password-wrap input {
          padding-right: 44px;
        }
        .eye-btn {
          position: absolute;
          right: 4px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          transition: color 0.2s;
        }
        .eye-btn:hover {
          color: #4b5563;
        }
        .row.between {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: -4px;
        }
        .remember {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13.5px;
          color: #4b5563;
          cursor: pointer;
          user-select: none;
        }
        .remember input {
          width: 16px;
          height: 16px;
          accent-color: #8a2525;
          cursor: pointer;
        }
        .primary-btn {
          width: 100%;
          background: #8a2525;
          color: white;
          border: none;
          padding: 12px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
          margin-top: 6px;
          box-shadow: 0 4px 6px -1px rgba(138, 37, 37, 0.2);
        }
        .primary-btn:hover {
          background: #731e1e;
        }
        .primary-btn:active {
          transform: scale(0.99);
        }
        .primary-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        .secondary-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 13.5px;
          color: #6b7280;
          text-decoration: none;
          padding: 10px 0;
          font-weight: 500;
          border-radius: 8px;
          transition: color 0.2s;
        }
        .secondary-btn:hover {
          color: #111827;
        }
        .secondary-btn svg {
          width: 16px !important;
          height: 16px !important;
          stroke-width: 2.5px;
        }
        .form-links {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-size: 13.5px;
          margin-top: 10px;
          border-top: 1px solid #f3f4f6;
          padding-top: 20px;
        }
        .form-links a {
          color: #8a2525;
          text-decoration: none;
          font-weight: 500;
        }
        .form-links a:hover {
          text-decoration: underline;
        }
        .form-links .divider {
          color: #e5e7eb;
        }
        .msg {
          padding: 12px;
          border-radius: 8px;
          font-size: 13.5px;
          margin: 0 0 4px 0;
          border: 1px solid transparent;
        }
        .msg.error {
          background: #fef2f2;
          color: #991b1b;
          border-color: #fee2e2;
        }
        .msg.warning {
          background: #fffbeb;
          color: #92400e;
          border-color: #fef3c7;
        }
        
        /* Modal Overlay Styles */
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 1000;
        }
        .modal-content {
          background: #ffffff;
          width: 100%;
          max-width: 560px;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        .modal-header h2 {
          margin: 0 0 6px 0;
          font-size: 22px;
          color: #111827;
          font-weight: 700;
        }
        .modal-header p {
          margin: 0 0 24px 0;
          font-size: 14px;
          color: #6b7280;
          line-height: 1.5;
        }
        .admin-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group-full {
          grid-column: span 2;
        }
        .form-group label {
          font-size: 12.5px;
          font-weight: 500;
          color: #374151;
        }
        .form-group input {
          width: 100%;
          padding: 10px 14px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
        }
        .form-group input:focus {
          border-color: #8a2525;
          box-shadow: 0 0 0 3px rgba(138, 37, 37, 0.12);
        }
        .password-field {
          position: relative;
        }
        .password-field input {
          padding-right: 40px;
        }
        .eye-toggle {
          position: absolute;
          right: 4px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          color: #9ca3af; cursor: pointer;
          width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
        }
        .create-admin-btn {
          width: 100%;
          background: #8a2525;
          color: white;
          border: none;
          padding: 12px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 24px;
          transition: background 0.2s;
        }
        .create-admin-btn:hover { background: #731e1e; }
        .error-message {
          background: #fef2f2; color: #991b1b;
          padding: 12px; border-radius: 8px;
          font-size: 14px; margin-bottom: 16px;
          border: 1px solid #fee2e2;
        }
        .success-message {
          background: #f0fdf4; color: #166534;
          padding: 12px; border-radius: 8px;
          font-size: 14px; margin-bottom: 16px;
          border: 1px solid #dcfce7;
        }
        
        @media (max-width: 768px) {
          .auth-card {
            flex-direction: column;
            min-height: auto;
          }
          .brand-panel {
            width: 100%;
            padding: 32px 24px;
          }
          .form-panel {
            width: 100%;
            padding: 40px 24px;
          }
          .admin-form-grid {
            grid-template-columns: 1fr;
          }
          .form-group-full {
            grid-column: span 1;
          }
        }
      `}</style>

      <main className="auth-wrapper">
        <div className="auth-card">

          {/* Brand panel */}
          <aside className="brand-panel">
            <div className="brand-inner">
              <div className="brand-logo">
                <img src="images/cutyy.png" alt="ACGC Logo" />
              </div>
              <div className="brand-text">
                <div className="small">WELCOME TO</div>
                <h2 className="title">ACGC</h2>
                <p className="desc">
                  Securely manage products, site inspections, and operations from one powerful dashboard.
                </p>
              </div>
            </div>
          </aside>

          {/* Form panel */}
          <section className="form-panel">
            <div className="form-inner">
              <h1 className="form-heading">Sign in to ACGC</h1>
              <p className="form-sub">Enter your credentials to continue.</p>

              {message && (
                <p className={`msg ${message.type}`}>{message.text}</p>
              )}

              <form onSubmit={handleLogin} className="login-form" noValidate>
                <div className="field">
                  <label htmlFor="email">Email or Username</label>
                  <input
                    type="text"
                    id="email"
                    placeholder="Email or username"
                    value={form.emailOrUsername}
                    onChange={(e) => setForm({ ...form, emailOrUsername: e.target.value })}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="password">Password</label>
                  <div className="password-wrap">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      placeholder="Password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      className="eye-btn"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label="Toggle password visibility"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="row between">
                  <label className="remember">
                    <input
                      type="checkbox"
                      id="remember"
                      checked={form.remember}
                      onChange={(e) => setForm({ ...form, remember: e.target.checked })}
                    />
                    <span>Remember me</span>
                  </label>
                </div>

                <button type="submit" className="primary-btn" disabled={loading}>
                  {loading ? "Signing in…" : "Login"}
                </button>

                <Link to="/customer/products" className="secondary-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Back to Browse
                </Link>

                <div className="form-links">
                  <Link to="/forgot-password">Forgot Password?</Link>
                  <span className="divider">|</span>
                  <Link to="/signup">Sign Up</Link>
                </div>
              </form>
            </div>
          </section>
        </div>
      </main>

      {/* Admin Creation Modal */}
      {showAdminModal && (
        <div className="modal-overlay" id="adminModal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Create Owner Admin Account</h2>
              <p>Welcome to ACGC System. Set up your administrator account to get started.</p>
            </div>

            {adminMessage && (
              <div className={adminMessage.type === "success" ? "success-message" : "error-message"}>
                <p>{adminMessage.text}</p>
              </div>
            )}

            <form onSubmit={handleCreateAdmin} className="admin-form">
              <div className="admin-form-grid">

                <div className="form-group">
                  <label htmlFor="admin_name">Full Name</label>
                  <input
                    type="text"
                    id="admin_name"
                    placeholder="Enter your full name"
                    value={adminForm.fullName}
                    onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="admin_username">Username</label>
                  <input
                    type="text"
                    id="admin_username"
                    placeholder="Enter username"
                    value={adminForm.username}
                    pattern="[a-zA-Z0-9._-]+"
                    title="Username can only contain letters, numbers, dots, hyphens, and underscores"
                    onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group form-group-full">
                  <label htmlFor="admin_email">Email Address</label>
                  <input
                    type="type"
                    id="admin_email"
                    placeholder="Enter your email"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                    required
                  />
                </div>

                <PasswordField
                  id="admin_password"
                  label="Password"
                  placeholder="Minimum 8 characters"
                  value={adminForm.password}
                  show={adminShowPass.password}
                  onToggle={() => setAdminShowPass((s) => ({ ...s, password: !s.password }))}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                />

                <PasswordField
                  id="admin_password_confirm"
                  label="Confirm Password"
                  placeholder="Confirm your password"
                  value={adminForm.confirmPassword}
                  show={adminShowPass.confirmPassword}
                  onToggle={() => setAdminShowPass((s) => ({ ...s, confirmPassword: !s.confirmPassword }))}
                  onChange={(e) => setAdminForm({ ...adminForm, confirmPassword: e.target.value })}
                />
              </div>

              <button type="submit" className="create-admin-btn" disabled={adminLoading}>
                {adminLoading ? "Creating…" : "Create Admin Account"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable password field sub-component
function PasswordField({ id, label, placeholder, value, show, onToggle, onChange }) {
  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <div className="password-field">
        <input
          type={show ? "text" : "password"}
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required
        />
        <button type="button" className="eye-toggle" onClick={onToggle} aria-label="Toggle password visibility">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>
    </div>
  );
}