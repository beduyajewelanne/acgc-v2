import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserContext } from '../App';
import { CRUD } from '../services/data.services';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user } = useContext(UserContext);
  const [cart, setCart] = useState([]);

  const refreshCart = useCallback(() => {
    if (!user || !user.token) {
      setCart([]);
      return;
    }

    const apiUri = (window.base_api || `http://localhost:5000/api/`).replace('/api/', '') + '/api/get_cart';
    const payload = { token: user.token, _id: user._id };
    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    };

    CRUD(apiUri, requestOptions, (res) => {
      if (res && res.remarks === 'success' && Array.isArray(res.payload)) {
        setCart(res.payload);
      } else {
        setCart([]);
      }
    });
  }, [user]);

  // Re-sync whenever the logged-in user changes (login/logout/switch account)
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  // Kept for backward compatibility with any local-only usage
  const addToCart = (product) => {
    setCart((prev) => [...prev, product]);
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter(item => item.id !== productId));
  };

  return (
    <CartContext.Provider value={{ cart, cartCount: cart.length, refreshCart, addToCart, removeFromCart }}>
      {children}
    </CartContext.Provider>
  );
};