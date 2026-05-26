import React from 'react';

const FeatureCard = ({ title, description, image }) => {
  return (
    <div className="feature-card">
      <img src={image} alt={title} className="feature-icon" />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
};

export default FeatureCard;