import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  
  return (
    <div className="forgot-page">
      <div className="forgot-card">
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
              <input type="email" placeholder="name@company.com" className="form-input" />
              <button className="submit-btn" onClick={() => setStep(2)}>Send Code</button>
            </div>
          )}

          {step === 2 && (
            <div className="step-box">
              <h2>Verify Code</h2>
              <p>Check your inbox. Enter the 6-digit code below.</p>
              <input type="text" maxLength="6" placeholder="000000" className="form-input text-center" />
              <button className="submit-btn" onClick={() => setStep(3)}>Verify</button>
            </div>
          )}

          {step === 3 && (
            <div className="step-box">
              <h2>New Password</h2>
              <input type="password" placeholder="New Password" className="form-input" />
              <input type="password" placeholder="Confirm Password" className="form-input" />
              <button className="submit-btn" onClick={() => setStep(4)}>Update Password</button>
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