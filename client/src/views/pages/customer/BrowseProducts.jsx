import React, { useState, useMemo } from 'react';
import { ShoppingCart, Zap, Eye, Search, SlidersHorizontal, X, CheckCircle2 } from 'lucide-react';
import ProductModal from './ProductModal';
import './BrowseProduct.css';

const PRODUCTS = [
  {
    id: 1,
    name: 'Frosted Tempered Glass',
    type: 'Glass',
    category: 'Interior',
    price: 1500,
    description:
      'Premium frosted tempered glass panels engineered for interior partitions, office dividers, and feature walls. The fine-grain frosting diffuses light beautifully while maintaining privacy. Available in 6mm and 10mm thicknesses with polished or beveled edge options. Heat-strengthened to withstand thermal stress and impact without shattering.',
    images: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80',
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&q=80',
      'https://images.unsplash.com/photo-1497366754035-f200968a7eed?w=600&q=80',
    ],
  },
  {
    id: 2,
    name: 'Clear Float Glass Panel',
    type: 'Glass',
    category: 'Windows',
    price: 1200,
    description:
      'Ultra-clear float glass with minimal green tint for maximum light transmission. Ideal for showcase windows, display cabinets, and architectural glazing. Manufactured using the float process for optical clarity and surface flatness. Compatible with all standard aluminum and steel framing systems.',
    images: [
      'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80',
    ],
  },
  {
    id: 3,
    name: 'Powder-Coated Aluminum Frame',
    type: 'Aluminum',
    category: 'Windows',
    price: 950,
    description:
      'Heavy-duty aluminum window frame with factory-applied powder coat finish in your choice of color. The thermally broken profile significantly reduces heat transfer, improving energy efficiency. Features multi-point locking, stainless hardware, and a weather seal rated for typhoon conditions. Low maintenance and corrosion-resistant.',
    images: [
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80',
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80',
    ],
  },
  {
    id: 4,
    name: 'Aluminum Curtain Wall System',
    type: 'Aluminum',
    category: 'Facade',
    price: 2200,
    description:
      'Structural aluminum curtain wall system designed for commercial and mid-rise buildings. Features a unitized grid with pressure-plate glazing that accommodates glass from 6mm to 28mm IGU. Engineered for wind loads up to 200 kph. Integrated drainage channels and weep holes prevent water infiltration. Finishes include anodized and PVDF coatings.',
    images: [
      'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80',
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80',
    ],
  },
  {
    id: 5,
    name: 'Tinted Reflective Glass',
    type: 'Glass',
    category: 'Facade',
    price: 1800,
    description:
      'Bronze-tinted solar-control glass that reduces heat gain by up to 55% while maintaining outward visibility. The metallic reflective coating gives facades a sleek, modern appearance. Suitable for curtain walls, storefronts, and canopy glazing. Compatible with silicone structural glazing and wet-seal systems.',
    images: [
      'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80',
    ],
  },
  {
    id: 6,
    name: 'Sliding Door Aluminum Track',
    type: 'Aluminum',
    category: 'Doors',
    price: 1100,
    description:
      'Precision-extruded aluminum sliding door track system with nylon rollers and soft-close dampeners. The heavy-duty profile supports panels weighing up to 120 kg. Includes top and bottom guide channels, anti-lift device, and adjustable roller carriages. Suitable for interior and exterior applications with optional weather strip integration.',
    images: [
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80',
      'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80',
    ],
  },
];

const CATEGORIES = ['All Products', 'Glass', 'Aluminum', 'Interior', 'Windows', 'Facade', 'Doors'];

/* ─── Cart Toast ─────────────────────────────────────────────────────────── */
const CartToast = ({ product, onDismiss }) => (
  <div className="cart-toast">
    <CheckCircle2 size={18} className="toast-icon" />
    <span><strong>{product.name}</strong> added to cart</span>
    <button onClick={onDismiss} className="toast-close"><X size={14} /></button>
  </div>
);

/* ─── Product Card ───────────────────────────────────────────────────────── */
const ProductCard = ({ product, onView, onAddToCart }) => (
  <div className="product-card">
    <div className="card-image-wrap">
      <img src={product.images[0]} alt={product.name} className="card-image" />
      <span className="card-badge">{product.type}</span>
    </div>
    <div className="card-body">
      <p className="card-category">{product.category}</p>
      <h3 className="card-name">{product.name}</h3>
      <p className="card-price">
        ₱{product.price.toLocaleString()}
        <span className="card-unit"> / sq ft</span>
      </p>
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

/* ─── Browse Products Page ───────────────────────────────────────────────── */
const BrowseProducts = () => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All Products');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalIntent, setModalIntent] = useState('view'); // 'view' | 'order'
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState(null);

  const filtered = useMemo(() => {
    return PRODUCTS.filter((p) => {
      const matchCat =
        activeCategory === 'All Products' ||
        p.type === activeCategory ||
        p.category === activeCategory;
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.type.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [search, activeCategory]);

  const handleView = (product, intent = 'view') => {
    setSelectedProduct(product);
    setModalIntent(intent);
  };

  const handleAddToCart = (product, measurements = null) => {
    const item = { ...product, measurements, addedAt: Date.now() };
    setCart((prev) => [...prev, item]);
    showToast(product);
  };

  const showToast = (product) => {
    setToast(product);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="browse-page">
      {/* ── Hero Header ── */}
      <div className="browse-hero">
        <div className="hero-inner">
          <p className="hero-eyebrow">Premium Selection</p>
          <h1 className="hero-title">Browse Our Collection</h1>
          <p className="hero-sub">
            Architectural glass & aluminum solutions crafted for lasting elegance.
          </p>
        </div>
      </div>

      {/* ── Controls ── */}
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
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Results Count ── */}
      <div className="results-row">
        <span className="results-count">
          {filtered.length} product{filtered.length !== 1 ? 's' : ''} found
        </span>
        {cart.length > 0 && (
          <span className="cart-count">
            <ShoppingCart size={14} /> {cart.length} in cart
          </span>
        )}
      </div>

      {/* ── Product Grid ── */}
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

      {/* ── Modal ── */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          initialIntent={modalIntent}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* ── Cart Toast ── */}
      {toast && <CartToast product={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
};

export default BrowseProducts;
