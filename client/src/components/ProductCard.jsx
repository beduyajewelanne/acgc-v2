import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../context/CartContext';

const ProductCard = ({ product, hideDescription = false }) => {
  // const { addToCart } = useContext(CartContext);
  // const navigate = useNavigate();
  const imageUrl = (product.mainImg && product.mainImg.startsWith('/uploads/')) 
    ? (window.base_api.replace('/api/', '') + product.mainImg) 
    : (product.mainImg || product.image);

  return (
    <div className="product-card">
      {imageUrl ? (
        <img src={imageUrl} alt={product.name} className="product-image" />
      ) : (
        <div className="product-image-placeholder" style={{ 
          height: '200px', 
          backgroundColor: '#f1f5f9', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#94a3b8',
          fontSize: '0.85rem'
        }}>
          No Image Available
        </div>
      )}
      <div className="product-info">
        <span className="category-badge">{product.category}</span>
        <h3>{product.name}</h3>
        {!hideDescription && <p>{product.description || "N/A"}</p>}
        <div className="price-row">
          <span style={{fontWeight: 'bold'}}>
            ₱{product.estimatedCost ? Number(product.estimatedCost).toLocaleString('en-PH', { minimumFractionDigits: 2 }) : (product.price || '—')}
          </span>
          <span className="thickness">
            {product.width && product.height ? `${product.width} × ${product.height} ${product.unit || 'in'}` : (product.thickness || '')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;