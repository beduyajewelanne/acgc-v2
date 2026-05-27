import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './ForgotPassword.css';
import { CRUD } from 'services/data.services';
import { Alert } from 'reactstrap';

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    code: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Automatically clear error alerts after 3 seconds
  useEffect(() => {
    if (errorMessage || successMessage) {
      const timer = setTimeout(() => {
        setErrorMessage('');
        setSuccessMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage, successMessage]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const clearMessages = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  // STEP 1: Request Code
  const handleSendCode = () => {
    if (!formData.email) {
      setErrorMessage("Please enter your email address.");
      return;
    }
    clearMessages();
    setLoading(true);

    const url = window.base_api + "forgot-password";
    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: formData.email })
    };

    CRUD(url, requestOptions, (res) => {
      setLoading(false);
      if (res.remarks === "success") {
        setSuccessMessage(res.message);
        setStep(2);
      } else {
        setErrorMessage(res.message || "An error occurred.");
      }
    });
  };

  // STEP 2: Verify Code
  const handleVerifyCode = () => {
    if (!formData.code) {
      setErrorMessage("Please provide the 6-digit verification code.");
      return;
    }
    clearMessages();
    setLoading(true);

    const url = window.base_api + "verify-code";
    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: formData.email, code: formData.code })
    };

    CRUD(url, requestOptions, (res) => {
      setLoading(false);
      if (res.remarks === "success") {
        setSuccessMessage(res.message);
        setStep(3);
      } else {
        setErrorMessage(res.message || "Invalid or expired code.");
      }
    });
  };

  // STEP 3: Reset Password
  const handleUpdatePassword = () => {
    if (!formData.newPassword || !formData.confirmPassword) {
      setErrorMessage("Please fill out all fields.");
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }
    clearMessages();
    setLoading(true);

    const url = window.base_api + "reset-password";
    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formData.email,
        code: formData.code,
        newPassword: formData.newPassword
      })
    };

    CRUD(url, requestOptions, (res) => {
      setLoading(false);
      if (res.remarks === "success") {
        setSuccessMessage(res.message);
        setStep(4);
      } else {
        setErrorMessage(res.message || "Failed to update password.");
      }
    });
  };

  return (
    <div className="forgot-page">
      <div className="forgot-card">

        <div className="alert-container mb-2">
          <Alert color="danger" isOpen={!!errorMessage} toggle={() => setErrorMessage('')} className="m-0 fade show shadow-sm">
            {errorMessage}
          </Alert>
          <Alert color="success" isOpen={!!successMessage && step !== 4} toggle={() => setSuccessMessage('')} className="m-0 fade show shadow-sm">
            {successMessage}
          </Alert>
        </div>

        {/* Brand Badge */}
        <div className="top-badge">
          <span>ACGC PASSWORD RESET</span>
        </div>

        {/* Dynamic Content */}
        <div className="card-content">
          {step === 1 && (
            <div className="step-box">
              <h2>Reset Password</h2>
              <p>Enter your email account to receive a verification code.</p>
              <input 
                type="email" 
                placeholder="name@gmail.com" 
                className="form-input" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
              />
              <button className="submit-btn" onClick={handleSendCode} disabled={loading}>
                {loading ? "Sending..." : "Send Code"}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="step-box">
              <h2>Verify Code</h2>
              <p>Check your inbox. Enter the 6-digit code below.</p>
              <input 
                type="text" 
                maxLength="6" 
                placeholder="000000" 
                className="form-input text-center" 
                name="code"
                value={formData.code}
                onChange={handleChange}
                disabled={loading}
              />
              <button className="submit-btn" onClick={handleVerifyCode} disabled={loading}>
                {loading ? "Verifying..." : "Verify"}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="step-box">
              <h2>New Password</h2>
              <input 
                type="password" 
                placeholder="New Password" 
                className="form-input" 
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                disabled={loading}
              />
              <input 
                type="password" 
                placeholder="Confirm Password" 
                className="form-input" 
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={loading}
              />
              <button className="submit-btn" onClick={handleUpdatePassword} disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="step-box confirmation-box">
              <div className="success-checkmark">✓</div>
              <h2>Changed!</h2>
              <p>Your security credentials have been processed and updated successfully.</p>
            </div>
          )}
        </div>

        <div className="forgot-footer">
          <Link to="/login">← Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;