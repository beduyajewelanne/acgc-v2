import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { CRUD, encrypt } from "services/data.services";
import { UserContext } from "App";
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectState = location.state;
  const [form, setForm] = useState({ emailOrUsername: "", password: "", remember: false });
  const [message, setMessage] = useState(null); // { type: "error"|"warning"|"success", text }
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, setUser } = useContext(UserContext);

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

    const payload = encrypt({
      email: form.emailOrUsername,
      password: form.password
    });

    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload: payload })
    };

    try {
      CRUD(window.base_api + "login", requestOptions, async (res) => {
        if(res.remarks === "success") {
          const data = res.payload;
          localStorage.setItem("userData", JSON.stringify(data));
          if (form.remember) {
            setCookie("saved_email", form.emailOrUsername, 30);
          } else {
            setCookie("saved_email", "", -1);
          }
          setMessage({ type: "success", text: "Login successful." });
          const { role } = data;
          await setUser(data);
          if (role === "admin" || role === "staff") {
            navigate("/admin");
          } else if (redirectState?.redirectToProduct) {
            // Guest tried to place an order before logging in — send them
            // straight back to that product, ready to order.
            navigate("/customer/products", {
              state: {
                openProductId: redirectState.redirectToProduct,
                intent: "order",
                measurements: redirectState.measurements
              }
            });
          } else if (redirectState?.redirectToCartProduct) {
            // Guest tried to add a product to cart before logging in — add
            // it now and drop them straight into the cart.
            navigate("/customer/products", {
              state: {
                autoAddToCartId: redirectState.redirectToCartProduct,
                measurements: redirectState.measurements
              }
            });
          } else {
            navigate("/");
          }
        }  else {
          setMessage({ type: "error", text: res.message || "Invalid email or password." });
        }
      });
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
      /* ============================================================
   Login.css — ACGC Glass & Aluminum Services
   Theme aligned with Homepage.css
   ============================================================ */

/* ── Tokens (mirrors Homepage.css :root) ── */
.page-bg {
  --primary-red:  #8b1e22;
  --dark-red:     #6d1111;
  --light-red:    #f4e8e8;
  --white:        #ffffff;
  --off-white:    #f7f7f7;
  --light-gray:   #eaeaea;
  --mid-gray:     #b8bcc2;
  --slate:        #5a5a5a;
  --text-dark:    #333333;
  --border:       #e5e7eb;
  --shadow-sm:    0 2px 8px rgba(0, 0, 0, 0.07);
  --shadow-md:    0 6px 24px rgba(0, 0, 0, 0.11);
  --radius:       12px;
  --transition:   0.25s ease;
  --font:         'Segoe UI', system-ui, sans-serif;
}

/* ── Reset (scoped) ── */
.page-bg *,
.page-bg *::before,
.page-bg *::after {
  box-sizing: border-box;
}

/* ── Page background — neutral light gray, easy on the eyes ── */
.page-bg {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  font-family: var(--font);
  font-size: 16px;
  color: var(--text-dark);
  background-color: #eaeaea;
  background-image:
    repeating-linear-gradient(
      90deg,
      rgba(0, 0, 0, 0.025) 0px,
      rgba(0, 0, 0, 0.025) 1px,
      transparent 1px,
      transparent 72px
    ),
    repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.025) 0px,
      rgba(0, 0, 0, 0.025) 1px,
      transparent 1px,
      transparent 72px
    );
}

/* ── Wrapper ── */
.auth-wrapper {
  width: 100%;
  max-width: 940px;
  display: flex;
  justify-content: center;
  animation: cardIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(28px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
}

/* ── Card ── */
.auth-card {
  display: flex;
  width: 100%;
  background: var(--white);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.13), 0 2px 8px rgba(0, 0, 0, 0.07);
  border: 1px solid var(--border);
  min-height: 540px;
}

/* ── Brand panel (left) — dark charcoal, red accent only on underline ── */
.brand-panel {
  width: 40%;
  position: relative;
  color: var(--white);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 36px;
  text-align: center;
  overflow: hidden;
  background-color: #1e1e1e;
  background-image:
    repeating-linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.02) 0px,
      rgba(255, 255, 255, 0.02) 1px,
      transparent 1px,
      transparent 72px
    ),
    repeating-linear-gradient(
      0deg,
      rgba(255, 255, 255, 0.02) 0px,
      rgba(255, 255, 255, 0.02) 1px,
      transparent 1px,
      transparent 72px
    );
}

/* Right-edge divider */
.brand-panel::after {
  content: '';
  position: absolute;
  right: 0; top: 0; bottom: 0;
  width: 1px;
  background: rgba(255, 255, 255, 0.15);
}

.brand-inner {
  position: relative;
  z-index: 1;
}

.brand-logo {
  margin-bottom: 24px;
}

.brand-logo img {
  max-height: 160px;          /* bigger */
  width: auto;
  filter:
    drop-shadow(0 0 12px rgba(255, 255, 255, 0.55))   /* white glow halo */
    drop-shadow(0 4px 16px rgba(0, 0, 0, 0.40))       /* depth shadow */
    brightness(1.15);                                  /* slight lift */
}

.brand-text .small {
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 8px;
}

.brand-text .title {
  font-size: 2.4rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--white);
  margin: 0 0 14px 0;
  line-height: 1.15;
}

/* Red underline — the one intentional red pop on the dark panel */
.brand-text .title::after {
  content: '';
  display: block;
  width: 40px;
  height: 3px;
  background: var(--primary-red);
  margin: 10px auto 0;
  border-radius: 2px;
}

.brand-text .desc {
  font-size: 0.95rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

/* ── Form panel (right) ── */
.form-panel {
  width: 60%;
  padding: 52px 64px;
  display: flex;
  align-items: center;
  background: var(--white);
  position: relative;
}

/* Subtle off-white tint top-right */
.form-panel::before {
  content: '';
  position: absolute;
  top: 0; right: 0;
  width: 200px; height: 200px;
  background: radial-gradient(circle at top right, var(--light-red), transparent 70%);
  opacity: 0.45;
  pointer-events: none;
}

.form-inner {
  width: 100%;
  max-width: 380px;
  margin: 0 auto;
}

.form-heading {
  font-size: 1.7rem;
  font-weight: 700;
  color: var(--text-dark);
  margin: 0 0 6px 0;
  letter-spacing: -0.3px;
}

.form-sub {
  font-size: 0.95rem;
  color: var(--slate);
  margin: 0 0 26px 0;
}

/* ── Login form ── */
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
  font-size: 12px;
  font-weight: 700;
  color: var(--slate);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* Shared input style — mirrors .search-input from Homepage */
.field input,
.password-wrap input {
  width: 100%;
  padding: 13px 18px;
  background: var(--off-white);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  font-size: 0.95rem;
  font-family: var(--font);
  color: var(--text-dark);
  outline: none;
  transition: border-color var(--transition), box-shadow var(--transition), background var(--transition);
}

.field input::placeholder,
.password-wrap input::placeholder {
  color: var(--mid-gray);
}

.field input:focus,
.password-wrap input:focus {
  border-color: var(--primary-red);
  background: var(--white);
  box-shadow: 0 0 0 3px rgba(139, 30, 34, 0.09);
}

/* ── Password wrap ── */
.password-wrap {
  position: relative;
  width: 100%;
}

.password-wrap input {
  padding-right: 46px;
}

.eye-btn {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--mid-gray);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  transition: color var(--transition), background var(--transition);
}

.eye-btn:hover {
  color: var(--primary-red);
  background: var(--light-red);
}

/* ── Remember / row ── */
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
  font-size: 0.875rem;
  color: var(--slate);
  cursor: pointer;
  user-select: none;
}

.remember input {
  width: 16px;
  height: 16px;
  accent-color: var(--primary-red);
  cursor: pointer;
}

/* ── Primary button — mirrors .order-btn / .btn-primary ── */
.primary-btn {
  width: 100%;
  background-color: var(--primary-red);
  background-image: none;
  color: var(--white);
  border: none;
  padding: 14px;
  border-radius: 8px;
  font-family: var(--font);
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: background-color var(--transition), transform var(--transition), box-shadow var(--transition);
  margin-top: 4px;
}

.primary-btn:hover:not(:disabled) {
  background-color: var(--dark-red);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.primary-btn:active:not(:disabled) {
  transform: translateY(0);
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* ── Secondary button (Back to Browse) — mirrors .btn-secondary ── */
.secondary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.875rem;
  font-family: var(--font);
  font-weight: 600;
  color: var(--slate);
  text-decoration: none;
  padding: 10px 0;
  border-radius: 8px;
  transition: color var(--transition);
}

.secondary-btn:hover {
  color: var(--primary-red);
}

.secondary-btn svg {
  width: 16px !important;
  height: 16px !important;
  stroke-width: 2.5px;
}

/* ── Form links ── */
.form-links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 0.875rem;
  margin-top: 10px;
  border-top: 1px solid var(--border);
  padding-top: 20px;
}

.form-links a {
  color: var(--primary-red);
  text-decoration: none;
  font-weight: 600;
  transition: opacity var(--transition);
}

.form-links a:hover {
  opacity: 0.75;
  text-decoration: underline;
}

.form-links .divider {
  color: var(--mid-gray);
}

/* ── Alert messages ── */
.msg {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 0.9rem;
  margin: 0 0 4px 0;
  border: 1px solid transparent;
  font-family: var(--font);
  font-weight: 500;
}

.msg.error {
  background: var(--light-red);
  color: var(--dark-red);
  border-color: #e8c4c4;
  border-left: 4px solid var(--primary-red);
}

.msg.warning {
  background: #fffbeb;
  color: #92400e;
  border-color: #fef3c7;
  border-left: 4px solid #d97706;
}

.msg.success {
  background: #f0fdf4;
  color: #166534;
  border-color: #dcfce7;
  border-left: 4px solid #22c55e;
}

/* ── Modal overlay ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
  animation: fadeIn 0.25s ease both;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* ── Modal card — mirrors .features card style ── */
.modal-content {
  background: var(--white);
  width: 100%;
  max-width: 580px;
  border-radius: var(--radius);
  padding: 36px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border);
  position: relative;
  animation: modalIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
  overflow: hidden;
}

/* Red top accent — mirrors .hero-banner color */
.modal-content::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 4px;
  background: var(--primary-red);
  border-radius: var(--radius) var(--radius) 0 0;
}

@keyframes modalIn {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
}

.modal-header h2 {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--text-dark);
  margin: 0 0 6px 0;
}

.modal-header p {
  margin: 0 0 24px 0;
  font-size: 0.9rem;
  color: var(--slate);
  line-height: 1.6;
}

/* ── Admin form grid ── */
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
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--slate);
}

/* Shared input — same as .field input above */
.form-group input {
  width: 100%;
  padding: 13px 16px;
  background: var(--off-white);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  font-size: 0.9rem;
  font-family: var(--font);
  color: var(--text-dark);
  outline: none;
  transition: border-color var(--transition), box-shadow var(--transition), background var(--transition);
}

.form-group input:focus {
  border-color: var(--primary-red);
  background: var(--white);
  box-shadow: 0 0 0 3px rgba(139, 30, 34, 0.09);
}

/* ── Password field inside modal ── */
.password-field {
  position: relative;
}

.password-field input {
  padding-right: 42px;
}

.eye-toggle {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--mid-gray);
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: color var(--transition), background var(--transition);
}

.eye-toggle:hover {
  color: var(--primary-red);
  background: var(--light-red);
}

/* ── Create admin button — same as .primary-btn ── */
.create-admin-btn {
  width: 100%;
  background-color: var(--primary-red);
  background-image: none;
  color: var(--white);
  border: none;
  padding: 14px;
  border-radius: 8px;
  font-family: var(--font);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 24px;
  transition: background-color var(--transition), transform var(--transition), box-shadow var(--transition);
}

.create-admin-btn:hover:not(:disabled) {
  background-color: var(--dark-red);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.create-admin-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* ── Modal messages ── */
.error-message,
.success-message {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-family: var(--font);
  margin-bottom: 16px;
  border: 1px solid transparent;
}

.error-message {
  background: var(--light-red);
  color: var(--dark-red);
  border-color: #e8c4c4;
  border-left: 4px solid var(--primary-red);
}

.error-message p,
.success-message p {
  margin: 0;
}

.success-message {
  background: #f0fdf4;
  color: #166534;
  border-color: #dcfce7;
  border-left: 4px solid #22c55e;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .auth-card {
    flex-direction: column;
    min-height: auto;
  }

  .brand-panel {
    width: 100%;
    padding: 40px 28px;
  }

  .brand-panel::after {
    display: none;
  }

  .form-panel {
    width: 100%;
    padding: 40px 28px;
  }

  .admin-form-grid {
    grid-template-columns: 1fr;
  }

  .form-group-full {
    grid-column: span 1;
  }
}

@media (max-width: 480px) {
  .page-bg {
    padding: 16px;
  }

  .form-panel {
    padding: 32px 20px;
  }
}
    `}</style>

      <main className="auth-wrapper">
        <div className="auth-card">

          {/* Brand panel */}
          <aside className="brand-panel">
            <div className="brand-inner">
              <div className="brand-logo">
                <img src="images/acgc-logo.png" alt="ACGC Logo" />
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
                  <Link to="/signup" state={redirectState}>Sign Up</Link>
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