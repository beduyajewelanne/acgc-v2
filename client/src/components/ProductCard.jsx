
import React from 'react';
import { useNavigate } from 'react-router-dom';

const ProductCard = ({ product }) => {
  const navigate = useNavigate();

  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} className="product-image" />
      
      <div className="product-info">
        <span className="category-badge">{product.category}</span>
        <h3>{product.name}</h3>
        <p style={{fontSize: '0.9rem', color: '#666', marginBottom: '10px'}}>{product.description}</p>
        
        <div className="price-row">
          <span style={{fontWeight: 'bold'}}>₱{product.price}</span>
          <span className="thickness">{product.thickness}</span>
        </div>

        <button 
          className="order-btn" 
          onClick={() => navigate(`/product/${product.id}`)}
        >
          View Product
        </button>
      </div>
    </div>
  );
};

export default ProductCard;