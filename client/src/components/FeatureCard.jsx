import React from 'react';

const FeatureCard = ({ title, icon, description }) => (
  <div className="card">
    <div className="card-icon">{icon}</div>
    <h3>{title}</h3>
    <p>{description}</p>
  </div>
);

export default FeatureCard;