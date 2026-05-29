import React, { useState, useEffect, useMemo, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Zap, Eye, Search, SlidersHorizontal, X, CheckCircle2 } from 'lucide-react';
import ProductModal from './ProductModal';
import { CRUD } from 'services/data.services';
import { UserContext } from 'App';
import './BrowseProduct.css';

const CartToast = ({ product, message, onDismiss }) => (
  <div className="cart-toast">
    <CheckCircle2 size={18} className="toast-icon" />
    <span>{message || <span><strong>{product.name}</strong> added to cart</span>}</span>
    <button onClick={onDismiss} className="toast-close"><X size={14} /></button>
  </div>
);

const ProductCard = ({ product, onView, onAddToCart }) => (
  <div className="product-card">
    <div className="card-image-wrap">
      <img src={product.images[0] || 'https://via.placeholder.com/600x400?text=No+Image'} alt={product.name} className="card-image" />
      <span className="card-badge">{product.type}</span>
    </div>
    <div className="card-body">
      <p className="card-category">{product.category}</p>
      <h3 className="card-name">{product.name}</h3>
      <p className="card-price">
        ₱{product.price.toLocaleString()}
        <span className="card-unit"> / sq ft</span>
      </p>
      {product.width > 0 && product.height > 0 && (() => {
        const toFeet = (val, unit) => {
          if (unit === 'ft') return val;
          if (unit === 'm')  return val * 3.28084;
          if (unit === 'in') return val / 12;
          if (unit === 'cm') return val / 30.48;
          return val;
        };
        const area = toFeet(product.width, product.unit) * toFeet(product.height, product.unit);
        const computed = area * product.price;
        return (
          <p className="card-computed-price">
            ₱{computed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        );
      })()}
    </div>
    <div className="card-actions">
      <button className="btn-view" onClick={() => onView(product)}>
        <Eye size={15} />
        View Product
      </button>
      <button className="btn-order" onClick={() => onView(product, 'order')}>
        <Zap size={15} />
      </button>
      <button className="btn-cart" onClick={() => onAddToCart(product)}>
        <ShoppingCart size={15} />
      </button>
    </div>
  </div>
);

const BrowseProducts = () => {
  const { user, permissions } = useContext(UserContext);
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All Products');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalIntent, setModalIntent] = useState('view');
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

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
      body: JSON.stringify({ ...payload })
    }
    CRUD(apiUri, requestOptions, (res) => {
      if (res && res.remarks === 'success' && Array.isArray(res.payload)) {
        setCart(res.payload);
      }
    });
  };

  useEffect(() => {
    const apiUri = (window.base_api || `http://localhost:5000/api/`).replace('/api/', '') + '/api/get_products_client';
    CRUD(apiUri, { method: 'GET' }, (res) => {
      if (res && res.remarks === 'success' && Array.isArray(res.payload)) {
        const baseUrl = (window.base_api || `http://localhost:5000/api/`).replace('/api/', '');
        const normalized = res.payload.map(p => {
          const mainImgUrl = p.mainImg ? (p.mainImg.startsWith('http') ? p.mainImg : `${baseUrl}${p.mainImg}`) : 'https://via.placeholder.com/600x400?text=No+Image';
          const validAngles = Array.isArray(p.angleImgs) 
            ? p.angleImgs.filter(img => img).map(img => img.startsWith('http') ? img : `${baseUrl}${img}`) 
            : [];
          return {
            id: p._id || p.id,
            name: p.name || '',
            type: p.type || '',
            category: p.category || '',
            price: p.pricePerSqFt || p.estimatedCost || 0,
            description: p.description || '',
            images: [mainImgUrl, ...validAngles],
            variant: p.variant || '',
            width: p.width || 0,
            height: p.height || 0,
            unit: p.unit || 'in'
          };
        });
        setProducts(normalized);
      }
    });
  }, []);

  useEffect(() => {
    fetchCartItems();
  }, [user]);

  const uniqueTypes = useMemo(() => [...new Set(products.map(p => p.type).filter(Boolean))], [products]);
  const uniqueCategories = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))], [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchType = !filterType || p.type === filterType;
      const matchCategory = !filterCategory || p.category === filterCategory;
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.type.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      return matchType && matchCategory && matchSearch;
    });
  }, [search, filterType, filterCategory, products]);

  const handleView = (product, intent = 'view') => {
    if (intent === 'order' && (!user || !user.token)) {
      navigate('/login');
      return;
    }
    setSelectedProduct(product);
    setModalIntent(intent);
  };

  const handleAddToCart = (product, measurements = null) => {
    if (!user || !user.token) {
      navigate('/login');
      return;
    }
    const finalMeasurements = measurements || {
      width: product.width || 0,
      height: product.height || 0,
      unit: product.unit || 'in'
    };

    const apiUri = (window.base_api || `http://localhost:5000/api/`).replace('/api/', '') + '/api/add_to_cart';
    const payload = {
      token: user.token,
      _id: user._id,
      product_id: product.id,
      width: finalMeasurements.width,
      height: finalMeasurements.height,
      unit: finalMeasurements.unit
    };
    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload })
    }

    CRUD(apiUri, requestOptions, (res) => {
      if (res && res.remarks === 'success') {
        showToast(product, `Added ${product.name} to cart`);
        fetchCartItems();
      } else {
        alert("Failed to add product to database cart.");
      }
    });
  };

  const showToast = (product, message = '') => {
    setToast(product || { name: 'Success' });
    setToastMsg(message);
    setTimeout(() => { setToast(null); setToastMsg(''); }, 3000);
  };

  return (
    <div className="browse-page">
      <div className="browse-hero">
        <div className="hero-inner">
          <p className="hero-eyebrow">Premium Selection</p>
          <h1 className="hero-title">Browse Our Collection</h1>
          <p className="hero-sub">
            Architectural glass & aluminum solutions crafted for lasting elegance.
          </p>
        </div>
      </div>

      <div className="controls-row">
        <div className="search-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')}>
              <X size={14} />
            </button>
          )}
        </div>
          <div className="filter-wrap">
            <SlidersHorizontal size={15} className="filter-icon" />
            <select
              className="filter-select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">All Types</option>
              {uniqueTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              className="filter-select"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {uniqueCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
      </div>

      <div className="results-row">
        <span className="results-count">
          {filtered.length} product{filtered.length !== 1 ? 's' : ''} found
        </span>
        {cart.length > 0 && (
          <span className="cart-count">
            <ShoppingCart size={14} /> {cart.reduce((sum, item) => sum + (item.quantity || 1), 0)} in cart
          </span>
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="product-grid">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onView={handleView}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p className="empty-icon">🔍</p>
          <p className="empty-title">No products found</p>
          <p className="empty-sub">Try adjusting your search or filter.</p>
          <button
            className="btn-reset"
            onClick={() => { setSearch(''); setActiveCategory('All Products'); }}
          >
            Reset Filters
          </button>
        </div>
      )}

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          initialIntent={modalIntent}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
          user={user}
          permissions={permissions}
        />
      )}

      {toast && <CartToast product={toast} message={toastMsg} onDismiss={() => { setToast(null); setToastMsg(''); }} />}
    </div>
  );
};

export default BrowseProducts;