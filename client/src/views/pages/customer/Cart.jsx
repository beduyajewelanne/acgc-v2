import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CRUD } from 'services/data.services';
import { UserContext } from 'App';
import { CartContext } from 'context/CartContext';
import './Cart.css';
import OrderRequestFormBatch from './OrderRequestFormBatch';

const Cart = () => {
  const { user, permissions } = useContext(UserContext);
  const { refreshCart: refreshHeaderCart } = useContext(CartContext);
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]); // Now tracks item.id instead of product_id
  
  // View states: 'cart' or 'checkout'
  const [view, setView] = useState('cart');
  const [checkoutItems, setCheckoutItems] = useState([]);

  // Same "Request Orders" permission that gates ordering on the Browse Products
  const canOrder = permissions?.modules?.["Client"]?.["Request Orders"] === 1;

  // 1. Fetch live cart items from database
  const fetchCartItems = () => {
    if (!user || !user.token) return;

    const apiUri = (window.base_api || `http://localhost:5000/api/`).replace('/api/', '') + '/api/get_cart';
    const payload = {
      token: user.token,
      _id: user._id
    };

    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    };

    CRUD(apiUri, requestOptions, (res) => {
      if (res && res.remarks === 'success' && Array.isArray(res.payload)) {
        const normalized = res.payload.map((item) => {
          const w = parseFloat(item.width) || 0;
          const h = parseFloat(item.height) || 0;
          const rate = parseFloat(item.pricePerSqFt || item.price) || 0;
          const qty = parseInt(item.quantity) || 1;

          const toFeet = (val, unit) => {
            if (unit === 'ft') return val;
            if (unit === 'm')  return val * 3.28084;
            if (unit === 'in') return val / 12;
            if (unit === 'cm') return val / 30.48;
            return val;
          };

          const calculatedArea = toFeet(w, item.unit) * toFeet(h, item.unit);
          const computedPrice = calculatedArea * rate * qty;

          return {
            id: item._id || item.product_id, // This acts as the cart item entry identity
            product_id: item.product_id,
            name: item.name || "Architectural Product Placement",
            dimensions: `${w}" x ${h}"`,
            width: w,
            height: h,
            unit: item.unit || 'in',
            area: parseFloat(calculatedArea.toFixed(3)),
            rate: rate,
            price: computedPrice,
            image: item.mainImg,
            quantity: qty
          };
        });

        setCartItems(normalized);
        setSelectedIds([]); 
        refreshHeaderCart();
      }
    });
  };

  useEffect(() => {
    fetchCartItems();
  }, [user]);

  // 2. Clear item array using backend delete
  const handleRemove = (cartItemIdsArray) => {
    if (!user || !user.token || cartItemIdsArray.length === 0) return;

    // Map your custom UI cart 'id' values back to whatever identifier your API expects (e.g., _id or product_id)
    const targetItems = cartItems.filter(item => cartItemIdsArray.includes(item.id));
    
    // Adjust payload representation based on how your backend structure accepts bulk/single deletions
    const backendIds = targetItems.map(item => item.product_id); 

    const apiUri = (window.base_api || `http://localhost:5000/api/`).replace('/api/', '') + '/api/remove_from_cart';
    const payload = {
      token: user.token,
      _id: user._id,
      product_id: backendIds.length === 1 ? backendIds[0] : backendIds
    };

    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    };

    CRUD(apiUri, requestOptions, (res) => {
      if (res && res.remarks === 'success') {
        fetchCartItems(); 
      } else {
        alert("Failed to remove item(s) from database.");
      }
    });
  };

  // Checkbox Toggles shifted to item.id
  const handleSelectToggle = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(itemIds => itemIds !== id) 
        : [...prev, id]
    );
  };

  const handleSelectAllToggle = () => {
    if (selectedIds.length === cartItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(cartItems.map(item => item.id));
    }
  };

  // 3. Checkout selected batch
  const handleCheckoutSelected = () => {
    if (!canOrder) return;
    const itemsToCheckout = cartItems.filter(item => selectedIds.includes(item.id));
    if (itemsToCheckout.length === 0) return;
    setCheckoutItems(itemsToCheckout);
    setView('checkout');
  };

  // 4. Checkout all items
  const handleCheckOutAll = () => {
    if (!canOrder) return;
    if (cartItems.length === 0) return;
    setCheckoutItems(cartItems);
    setView('checkout');
  };

  // Calculations filtered by structural unique entry id
  const selectedItems = cartItems.filter(item => selectedIds.includes(item.id));
  const subtotal = selectedIds.length > 0 
    ? selectedItems.reduce((acc, item) => acc + item.price, 0)
    : cartItems.reduce((acc, item) => acc + item.price, 0);

  if (view === 'checkout' && canOrder) {
    return (
      <OrderRequestFormBatch
        items={checkoutItems}
        onBack={() => {
          setView('cart');
          fetchCartItems(); 
        }}
        onClose={() => {
          setView('cart');
          fetchCartItems();
        }}
      />
    );
  }

  return (
    <div className="cart-container">
      <h2 className="cart-title">
        Shopping Cart
        {cartItems.length > 0 && (
          <span className="cart-count-badge">{cartItems.length}</span>
        )}
      </h2>
      
      {cartItems.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', paddingLeft: '10px' }}>
          <input 
            type="checkbox" 
            checked={selectedIds.length === cartItems.length && cartItems.length > 0}
            onChange={handleSelectAllToggle}
            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
          />
          <span style={{ fontSize: '14px', color: '#555', fontWeight: '500' }}>
            Select All ({cartItems.length} items)
          </span>
        </div>
      )}

      <div className="cart-layout">
        <div className="cart-items">
          {cartItems.length === 0 ? (
            <div className="cart-item" style={{ textAlign: 'center', padding: '20px' }}>
              <p style={{ marginBottom: '15px' }}>Your cart is empty</p>
              <button 
                className="place-item-btn" 
                onClick={() => navigate('/customer/products')}
                style={{ width: 'auto', display: 'inline-block', padding: '8px 20px' }}
              >
                Browse Products
              </button>
            </div>
          ) : (
            cartItems.map(item => (
              <div className="cart-item" key={item.id}>
                <div className="item-main-row">
                  <div className="item-info" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input 
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => handleSelectToggle(item.id)}
                      style={{ cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0 }}
                    />
                    
                    {item.image ? (
                      <img 
                        // src={(window.base_api || `http://localhost:5000/api/`).replace('/api/', '') + item.image} 
                        src={item.image} 
                        alt={item.name} 
                        className="item-image-placeholder" 
                        style={{ objectFit: 'cover', background: 'none' }}
                      />
                    ) : (
                      <div className="item-image-placeholder"></div>
                    )}
                    <div className="item-text">
                      <h4>{item.name} {item.quantity > 1 && `(Qty: ${item.quantity})`}</h4>
                      <p>{item.dimensions} = {item.area} sq.ft</p>
                      <p>₱{item.rate}/sq.ft</p>
                    </div>
                  </div>
                  <div className="price-section">
                    <span className="price-text">₱{item.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    <button className="remove-btn" onClick={() => handleRemove([item.id])}>🗑️</button>
                  </div>
                </div>
                {canOrder && (
                  <button 
                    className="place-item-btn"
                    onClick={() => {
                      setCheckoutItems([item]);
                      setView('checkout');
                    }}
                  >
                    Place Order for This Item →
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="cart-summary">
          <h3>Order Summary</h3>
          <div className="summary-line">
            <span>Subtotal {selectedIds.length > 0 && `(${selectedIds.length} selected)`}</span> 
            <span>₱ {subtotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
          </div>
          <div className="summary-line total-section">
            <span className="total-label">Estimated Total</span> 
            <span className="total-amount">₱ {subtotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
          </div>
          <small className="checkout-note">* Final pricing confirmed after site inspection</small>

          {canOrder && (
            <button 
              className="place-item-btn" 
              style={{ marginTop: '20px', fontWeight: 'bold' }}
              disabled={cartItems.length === 0}
              onClick={selectedIds.length > 0 ? handleCheckoutSelected : handleCheckOutAll}
            >
              {selectedIds.length > 0 ? `Checkout Selected (${selectedIds.length}) →` : 'Checkout All Items →'}
            </button>
          )}

          {selectedIds.length > 0 && (
            <button 
              className="place-item-btn" 
              onClick={() => handleRemove(selectedIds)}
              style={{ backgroundColor: '#dc3545', color: '#fff', marginTop: '10px' }}
            >
              Delete Selected ({selectedIds.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Cart;