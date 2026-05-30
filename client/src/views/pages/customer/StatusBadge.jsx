import React from 'react';
import './StatusBadge.css';
/**
 * Reusable Status Badge Component
 * Supported states: Scheduled, Cancelled, Pending, Pending Payment, Completed
 * * @param {string} status - The raw status string from the order object
 */

export const StatusBadge = ({ status }) => {
  // Fallback default if status is missing or undefined
  const currentStatus = status || 'Pending';

  // Normalize string for class naming convention (e.g., "Pending Payment" becomes "pending-payment")
  const classModifier = currentStatus.toLowerCase().replace(/\s+/g, '-');

  return (
    <span className={`cp-badge cp-badge--${classModifier}`}>
      {currentStatus}
    </span>
  );
};

export default StatusBadge;