// import React from 'react';

// const ProductCard = ({ product, onOrder }) => (
//   <div className="product-card">
//     <h3>{product.title}</h3>
//     <p>{product.category}</p>
//     <div className="price">{product.price}</div>
//     <button className="order-btn" onClick={onOrder}>Order Now</button>
//   </div>
// );
// export default ProductCard;

import React from 'react';

const ProductCard = ({ name, price, image }) => (
  <div className="product-card">
    <img src={image} alt={name} />
    <h4>{name}</h4>
    <p>Starting from ₱{price}</p>
    <button>View</button>
  </div>
);

export default ProductCard;