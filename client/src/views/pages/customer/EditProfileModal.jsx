import React, { useState, useEffect, useRef } from 'react';
import './EditProfileModal.css';

const EditProfileModal = ({ isOpen, onClose, user, onSave }) => {
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', username: '', phone: '',
    address: '', province: '', city: '', barangay: '', zipCode: '',
    password: '', confirmPassword: ''
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const firstInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && user) {
      const nameParts = (user.name || '').split(' ');
      setFormData({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: user.email || '',
        username: user.username || '',
        phone: user.phone || '',
        address: user.address || '',
        province: user.province || '',
        city: user.city || '',
        barangay: user.barangay || '',
        zipCode: user.zipCode || '',
        password: '',
        confirmPassword: ''
      });
      setErrors({});
      setSaved(false);
    }
  }, [isOpen, user]);

  const validate = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required.';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required.';
    if (!formData.email.trim()) newErrors.email = 'Email is required.';
    if (formData.password !== formData.confirmPassword) newErrors.password = 'Passwords do not match.';
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setSaving(true);
    await new Promise((res) => setTimeout(res, 900));

    const updatedUser = {
      ...user,
      name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      address: formData.address.trim(),
      city: formData.city.trim(),
      barangay: formData.barangay.trim(),
      password: formData.password || user.password 
    };

    onSave(updatedUser);
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="epm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="epm-modal" role="dialog">
        <div className="epm-header">
          <h2 className="epm-title">Edit Profile</h2>
          <button className="epm-close-btn" onClick={onClose}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
        </div>

        <div className="epm-form">
          <div className="epm-row">
            <div className="epm-field"><label>First Name</label><input className="epm-input" name="firstName" value={formData.firstName} onChange={handleChange} /></div>
            <div className="epm-field"><label>Last Name</label><input className="epm-input" name="lastName" value={formData.lastName} onChange={handleChange} /></div>
          </div>

          <div className="epm-field"><label>Email</label><input className="epm-input" name="email" value={formData.email} onChange={handleChange} /></div>
          <div className="epm-field"><label>Phone</label><input className="epm-input" name="phone" value={formData.phone} onChange={handleChange} /></div>
          <div className="epm-field"><label>Address</label><input className="epm-input" name="address" value={formData.address} onChange={handleChange} /></div>
          
          <div className="epm-row">
            <div className="epm-field"><label>City</label><input className="epm-input" name="city" value={formData.city} onChange={handleChange} /></div>
            <div className="epm-field"><label>Barangay</label><input className="epm-input" name="barangay" value={formData.barangay} onChange={handleChange} /></div>
          </div>

          <div className="epm-section-title">Change Password</div>
          <div className="epm-row">
            <div className="epm-field"><label>New Password</label><input className="epm-input" type="password" name="password" value={formData.password} onChange={handleChange} /></div>
            <div className="epm-field"><label>Confirm Password</label><input className="epm-input" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} /></div>
          </div>
          {errors.password && <span className="epm-error">{errors.password}</span>}
        </div>

        <div className="epm-footer">
          <button className="epm-cancel-btn" onClick={onClose}>Cancel</button>
          <button className={`epm-save-btn ${saved ? 'epm-save-btn--saved' : ''}`} onClick={handleSave} disabled={saving || saved}>
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;