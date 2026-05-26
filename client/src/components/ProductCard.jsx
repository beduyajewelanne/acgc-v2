import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../context/CartContext';

const ProductCard = ({ product }) => {
  // const { addToCart } = useContext(CartContext);
  // const navigate = useNavigate();

  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} className="product-image" />
      <div className="product-info">
        <span className="category-badge">{product.category}</span>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <div className="price-row">
          <span style={{fontWeight: 'bold'}}>₱{product.price}</span>
          <span className="thickness">{product.thickness}</span>
        </div>
        {/* REMOVE ALL BUTTONS FROM HERE */}
      </div>
    </div>
  );
};

export default ProductCard;