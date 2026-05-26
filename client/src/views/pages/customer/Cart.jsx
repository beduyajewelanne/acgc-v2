import React, { useState } from 'react';
import './Cart.css';

const Cart = () => {
  const [cartItems, setCartItems] = useState([
    { id: 1, name: "Aluminum Sliding Door", dimensions: '48" x 47"', area: 15.667, rate: 262, price: 4104.67, image: 'door.jpg' },
    { id: 2, name: "Tempered Glass Panel", dimensions: '24" x 23"', area: 3.833, rate: 262, price: 1004.33, image: 'glass.jpg' },
    { id: 3, name: "Custom Window Frame", dimensions: '30" x 30"', area: 6.25, rate: 150, price: 937.50, image: 'frame.jpg' }
  ]);

  const subtotal = cartItems.reduce((acc, item) => acc + item.price, 0);

  return (
    <div className="cart-container">
      <h2 className="cart-title">Shopping Cart</h2>
      <div className="cart-layout">
        <div className="cart-items">
          {cartItems.map(item => (
            <div className="cart-item" key={item.id}>
              <div className="item-main-row">
                <div className="item-info">
                  <div className="item-image-placeholder"></div>
                  <div className="item-text">
                    <h4>{item.name}</h4>
                    <p>{item.dimensions} = {item.area} sq.ft</p>
                    <p>₱{item.rate}/sq.ft</p>
                  </div>
                </div>
                <div className="price-section">
                  <span className="price-text">₱{item.price.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  <button className="remove-btn">🗑️</button>
                </div>
              </div>
              <button className="place-item-btn">
                Place Order for This Item →
              </button>
            </div>
          ))}
        </div>

        <div className="cart-summary">
          <h3>Order Summary</h3>
          <div className="summary-line"><span>Subtotal</span> <span>₱ {subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
          <div className="summary-line total-section">
            <span className="total-label">Estimated Total</span> 
            <span className="total-amount">₱ {subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
          </div>
          <small className="checkout-note">* Final pricing confirmed after site inspection</small>
        </div>
      </div>
    </div>
  );
};

export default Cart;