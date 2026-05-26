import React from 'react';

const ProductModal = ({ product, onClose }) => {
  if (!product) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>&times;</button>
        <img src={product.image} alt={product.name} />
        <h2>{product.name}</h2>
        <span className="category-badge">{product.category}</span>
        <p>{product.description}</p>
        <div className="price-row">
          <span>Price: ₱{product.price}</span>
          <span>Thickness: {product.thickness}</span>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;