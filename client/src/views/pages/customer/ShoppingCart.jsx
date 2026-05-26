import React from 'react';
import './ShoppingCart.css'; 

const ShoppingCart = ({ cartItems, onRemove }) => {
  const total = cartItems.reduce((acc, item) => acc + item.price, 0);

  return (
    <div className="cart-container">
      <h2>Shopping Cart</h2>
      
      {cartItems.length === 0 ? (
        <div className="empty-cart">
          <p>Your cart is empty</p>
          <button onClick={() => window.location.href='/customer/products'}>
            Browse Products
          </button>
        </div>
      ) : (
        <>
          {cartItems.map((item) => (
            <div key={item.id} className="cart-item-card">
              <img src={item.image} alt={item.name} />
              <div className="item-details">
                <h3>{item.name}</h3>
                <p>{item.specs}</p>
                <p className="price">₱{item.price.toFixed(2)}</p>
              </div>
              <button className="remove-btn" onClick={() => onRemove(item.id)}>
                🗑️
              </button>
              <button className="place-order-btn">
                Place Order for This Item →
              </button>
            </div>
          ))}

          <div className="cart-total-box">
            <h3>Estimated Total</h3>
            <p>₱{total.toFixed(2)}</p>
            <small>Final pricing confirmed after site inspection</small>
          </div>
        </>
      )}
    </div>
  );
};

export default ShoppingCart;