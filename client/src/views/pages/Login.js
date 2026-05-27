import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from 'react-router-dom';
import { CRUD, encrypt } from "services/data.services";
import { UserContext } from "App";
export default function Login() {
  const navigate = useNavigate();
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
       /* ── Tokens ──────────────────────────────────────────────── */
  .page-bg {
  --maroon:        #800020;   /* was #7A0000 → use maroon-rich */
  --maroon-mid:    #9B2335;   /* was duplicate #800020 → use maroon-mid */
  --maroon-light:  #C04A5A;   /* was duplicate #800020 → use maroon-light */
  --maroon-deep:   #2E0A12;   /* was #3D0000 → use maroon-deepest */
  --maroon-glow:   rgba(128, 0, 32, 0.10); /* was rgba(122,0,0,0.14) → matches shadow-input */
  --gold:          #C9A84C;   /* ✓ unchanged */
  --gold-light:    #E8C87A;   /* was #E8C96A → corrected to your gold-light */
  --white:         #FFFFFF;   /* ✓ unchanged */
  --off-white:     #FAF7F5;   /* ✓ unchanged — white-warm */
  --surface:       #F5EFE8;   /* was #F4EFEC → use white-ivory */
  --border:        rgba(128, 0, 32, 0.18); /* was #E8DEDE → use border-light */
  --text-primary:  #1A0508;   /* was #1A0505 → corrected */
  --text-secondary:#3D1520;   /* was #5A3A3A → use text-body */
  --text-muted:    #7A4050;   /* was #9E7070 → use text-muted */
  --shadow-card:   0 24px 80px rgba(46, 10, 18, 0.22), 0 4px 16px rgba(46, 10, 18, 0.10);
  --shadow-btn:    0 6px 28px rgba(128, 0, 32, 0.45);
  --font-display:  'Cormorant Garamond', Georgia, serif; /* align with signup theme */
  --font-body:     'Montserrat', sans-serif;             /* align with signup theme */
}
 
  /* ── Page ────────────────────────────────────────────────── */
  .page-bg {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    font-family: var(--font-body);
    box-sizing: border-box;
    background-color: var(--maroon-deep);
    background-image:
      radial-gradient(ellipse 70% 50% at 20% 50%, rgba(139,0,0,0.55) 0%, transparent 65%),
      radial-gradient(ellipse 50% 70% at 85% 20%, rgba(201,168,76,0.08) 0%, transparent 60%),
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
  }
 
  .page-bg *, .page-bg *::before, .page-bg *::after {
    box-sizing: border-box;
  }
 
  /* ── Wrapper ─────────────────────────────────────────────── */
  .auth-wrapper {
    width: 100%;
    max-width: 940px;
    display: flex;
    justify-content: center;
    animation: cardIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
 
  @keyframes cardIn {
    from { opacity: 0; transform: translateY(32px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0)    scale(1);    }
  }
 
  /* ── Auth card ───────────────────────────────────────────── */
  .auth-card {
    display: flex;
    width: 100%;
    background: var(--white);
    border-radius: 20px;
    overflow: hidden;
    box-shadow: var(--shadow-card);
    min-height: 560px;
    border: 1px solid rgba(201,168,76,0.18);
  }
 
  /* ── Brand panel ─────────────────────────────────────────── */
  .brand-panel {
    width: 40%;
    position: relative;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 36px;
    text-align: center;
    overflow: hidden;
    background-color: var(--maroon-deep);
    background-image:
      radial-gradient(ellipse 100% 80% at 50% 0%, rgba(68, 7, 7, 0.9) 0%, transparent 70%),
      linear-gradient(175deg, var(--maroon) 0%, var(--maroon-deep) 100%);
  }
 
  /* Decorative gold border right edge */
  .brand-panel::after {
    content: '';
    position: absolute;
    right: 0; top: 10%; bottom: 10%;
    width: 1px;
    background: linear-gradient(180deg, transparent, rgba(201,168,76,0.5), transparent);
  }
 
  /* Decorative corner ornament */
  .brand-panel::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, transparent, var(--gold), transparent);
  }
 
  /* Subtle radial shimmer */
  .brand-inner {
    position: relative;
    z-index: 1;
  }
 
  .brand-logo {
    margin-bottom: 24px;
  }
 
  .brand-logo img {
    max-height: 80px;
    width: auto;
    filter: drop-shadow(0 4px 12px rgba(0,0,0,0.4));
  }
 
  .brand-text .small {
    font-size: 10px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--gold-light);
    font-weight: 600;
    margin-bottom: 8px;
    opacity: 0.85;
  }
 
  .brand-text .title {
    font-family: var(--font-display);
    font-size: 38px;
    margin: 0 0 16px 0;
    font-weight: 800;
    letter-spacing: 0.02em;
    color: var(--white);
    text-shadow: 0 2px 16px rgba(0,0,0,0.3);
  }
 
  .brand-text .desc {
    font-size: 13px;
    line-height: 1.7;
    color: rgba(255,255,255,0.65);
    margin: 0;
  }
 
  /* Gold divider under title */
  .brand-text .title::after {
    content: '';
    display: block;
    width: 40px;
    height: 2px;
    background: var(--gold);
    margin: 10px auto 0;
    border-radius: 2px;
  }
 
  /* ── Form panel ──────────────────────────────────────────── */
  .form-panel {
    width: 60%;
    padding: 52px 64px;
    display: flex;
    align-items: center;
    background: var(--white);
    position: relative;
  }
 
  /* Subtle warm tint top-right */
  .form-panel::before {
    content: '';
    position: absolute;
    top: 0; right: 0;
    width: 200px; height: 200px;
    background: radial-gradient(circle at top right, rgba(201,168,76,0.05), transparent 70%);
    pointer-events: none;
  }
 
  .form-inner {
    width: 100%;
    max-width: 380px;
    margin: 0 auto;
  }
 
  .form-heading {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 6px 0;
    letter-spacing: -0.3px;
  }
 
  .form-sub {
    font-size: 14px;
    color: var(--text-muted);
    margin: 0 0 28px 0;
  }
 
  /* ── Login form ──────────────────────────────────────────── */
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
    color: var(--text-secondary);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
 
  .field input, .password-field input {
    width: 100%;
    padding: 12px 16px;
    background: var(--off-white);
    border: 1.5px solid var(--border);
    border-radius: 10px;
    font-size: 14.5px;
    font-family: var(--font-body);
    color: var(--text-primary);
    outline: none;
    transition: border-color 0.22s, box-shadow 0.22s, background 0.22s;
  }
 
  .field input::placeholder, .password-field input::placeholder {
    color: var(--text-muted);
    font-size: 13.5px;
  }
 
  .field input:focus, .password-field input:focus {
    border-color: var(--maroon-mid);
    background: #fff;
    box-shadow: 0 0 0 3px var(--maroon-glow);
  }
 
  /* ── Password wrap ───────────────────────────────────────── */
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
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    transition: color 0.2s, background 0.2s;
  }
 
  .eye-btn:hover {
    color: var(--maroon-mid);
    background: var(--maroon-glow);
  }
 
  /* ── Row / remember ──────────────────────────────────────── */
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
    font-size: 13px;
    color: var(--text-secondary);
    cursor: pointer;
    user-select: none;
  }
 
  .remember input {
    width: 16px;
    height: 16px;
    accent-color: var(--maroon-mid);
    cursor: pointer;
  }
 
  /* ── Primary button ──────────────────────────────────────── */
  .primary-btn {
    width: 100%;
    background: linear-gradient(135deg, var(--maroon) 0%, var(--maroon-light) 100%);
    color: var(--white);
    border: none;
    padding: 13px;
    border-radius: 10px;
    font-family: var(--font-body);
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.03em;
    cursor: pointer;
    box-shadow: var(--shadow-btn);
    transition: transform 0.18s, box-shadow 0.18s;
    margin-top: 4px;
    position: relative;
    overflow: hidden;
  }
 
  .primary-btn::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%);
    transform: translateX(-100%);
    transition: transform 0.45s;
  }
 
  .primary-btn:hover:not(:disabled)::after {
    transform: translateX(100%);
  }
 
  .primary-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 12px 30px rgba(122,0,0,0.44);
  }
 
  .primary-btn:active:not(:disabled) {
    transform: translateY(0);
  }
 
  .primary-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
 
  /* ── Secondary button (Back to Browse) ───────────────────── */
  .secondary-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 13px;
    font-family: var(--font-body);
    font-weight: 500;
    color: var(--text-muted);
    text-decoration: none;
    padding: 10px 0;
    border-radius: 8px;
    transition: color 0.2s;
  }
 
  .secondary-btn:hover {
    color: var(--maroon-mid);
  }
 
  .secondary-btn svg {
    width: 16px !important;
    height: 16px !important;
    stroke-width: 2.5px;
  }
 
  /* ── Form links ──────────────────────────────────────────── */
  .form-links {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    font-size: 13px;
    margin-top: 10px;
    border-top: 1px solid var(--border);
    padding-top: 20px;
  }
 
  .form-links a {
    color: var(--maroon-mid);
    text-decoration: none;
    font-weight: 600;
    transition: color 0.18s;
  }
 
  .form-links a:hover {
    color: var(--maroon-light);
    text-decoration: underline;
  }
 
  .form-links .divider {
    color: var(--border);
  }
 
  /* ── Messages ────────────────────────────────────────────── */
  .msg {
    padding: 12px 16px;
    border-radius: 10px;
    font-size: 13.5px;
    margin: 0 0 4px 0;
    border: 1px solid transparent;
    font-family: var(--font-body);
    font-weight: 500;
  }
 
  .msg.error {
    background: #FFF0F0;
    color: var(--maroon-mid);
    border-color: #F8DCDC;
    border-left: 4px solid var(--maroon-mid);
  }
 
  .msg.warning {
    background: #FFFBEB;
    color: #92400E;
    border-color: #FEF3C7;
    border-left: 4px solid #D97706;
  }
 
  .msg.success {
    background: #F0FDF4;
    color: #166534;
    border-color: #DCFCE7;
    border-left: 4px solid #22C55E;
  }
 
  /* ── Modal overlay ───────────────────────────────────────── */
  .modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(30, 0, 0, 0.65);
    backdrop-filter: blur(6px);
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
 
  .modal-content {
    background: var(--white);
    width: 100%;
    max-width: 580px;
    border-radius: 18px;
    padding: 36px;
    box-shadow: 0 32px 80px rgba(61,0,0,0.30), 0 4px 20px rgba(0,0,0,0.12);
    border: 1px solid rgba(201,168,76,0.20);
    position: relative;
    animation: modalIn 0.4s cubic-bezier(0.22,1,0.36,1) both;
  }
 
  /* Gold top stripe on modal */
  .modal-content::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    border-radius: 18px 18px 0 0;
    background: linear-gradient(90deg, var(--maroon), var(--maroon-light), var(--gold));
  }
 
  @keyframes modalIn {
    from { opacity: 0; transform: translateY(24px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0)    scale(1);    }
  }
 
  .modal-header h2 {
    font-family: var(--font-display);
    margin: 0 0 6px 0;
    font-size: 22px;
    color: var(--text-primary);
    font-weight: 700;
  }
 
  .modal-header p {
    margin: 0 0 24px 0;
    font-size: 13.5px;
    color: var(--text-muted);
    line-height: 1.55;
  }
 
  /* ── Admin form grid ─────────────────────────────────────── */
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
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-secondary);
  }
 
  .form-group input {
    width: 100%;
    padding: 11px 14px;
    background: var(--off-white);
    border: 1.5px solid var(--border);
    border-radius: 9px;
    font-size: 14px;
    font-family: var(--font-body);
    color: var(--text-primary);
    outline: none;
    transition: border-color 0.22s, box-shadow 0.22s;
  }
 
  .form-group input:focus {
    border-color: var(--maroon-mid);
    background: #fff;
    box-shadow: 0 0 0 3px var(--maroon-glow);
  }
 
  .password-field {
    position: relative;
  }
 
  .password-field input {
    padding-right: 42px;
  }
 
  .eye-toggle {
    position: absolute;
    right: 4px; top: 50%;
    transform: translateY(-50%);
    background: none; border: none;
    color: var(--text-muted); cursor: pointer;
    width: 32px; height: 32px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 50%;
    transition: color 0.2s, background 0.2s;
  }
 
  .eye-toggle:hover {
    color: var(--maroon-mid);
    background: var(--maroon-glow);
  }
 
  /* ── Create admin button ─────────────────────────────────── */
  .create-admin-btn {
    width: 100%;
    background: linear-gradient(135deg, var(--maroon) 0%, var(--maroon-light) 100%);
    color: var(--white);
    border: none;
    padding: 13px;
    border-radius: 10px;
    font-family: var(--font-body);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    margin-top: 24px;
    box-shadow: var(--shadow-btn);
    transition: transform 0.18s, box-shadow 0.18s, opacity 0.18s;
  }
 
  .create-admin-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 12px 30px rgba(122,0,0,0.44);
  }
 
  .create-admin-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
 
  /* ── Modal messages ──────────────────────────────────────── */
  .error-message {
    background: #FFF0F0;
    color: var(--maroon-mid);
    padding: 12px 16px;
    border-radius: 9px;
    font-size: 13.5px;
    font-family: var(--font-body);
    margin-bottom: 16px;
    border: 1px solid #F8DCDC;
    border-left: 4px solid var(--maroon-mid);
  }
 
  .error-message p { margin: 0; }
 
  .success-message {
    background: #F0FDF4;
    color: #166534;
    padding: 12px 16px;
    border-radius: 9px;
    font-size: 13.5px;
    font-family: var(--font-body);
    margin-bottom: 16px;
    border: 1px solid #DCFCE7;
    border-left: 4px solid #22C55E;
  }
 
  .success-message p { margin: 0; }
 
  /* ── Responsive ──────────────────────────────────────────── */
  @media (max-width: 768px) {
    .auth-card {
      flex-direction: column;
      min-height: auto;
    }
    .brand-panel {
      width: 100%;
      padding: 36px 28px;
    }
    .brand-panel::after { display: none; }
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
      `}</style>

      <main className="auth-wrapper">
        <div className="auth-card">

          {/* Brand panel */}
          <aside className="brand-panel">
            <div className="brand-inner">
              <div className="brand-logo">
                <img src="images/logo.png" alt="ACGC Logo" />
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