import React, { useState, useContext } from 'react'; // 1. Added useContext
import { products } from '../../../data/productData';
import ProductCard from '../../../components/ProductCard';
import './CustomerDashboard.css';
import ProductModal from '../../../components/ProductModal';
import { CartContext } from '../../../context/CartContext'; 
import { useNavigate } from "react-router-dom";
import { FaShoppingCart } from 'react-icons/fa';

const BrowseProducts = () => {
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [category, setCategory] = useState("All");
    const { addToCart } = useContext(CartContext); // This now works
    const navigate = useNavigate();

    const filteredProducts = products.filter((p) => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = category === "All" || p.category === category;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="product-preview">
            <h2 style={{ padding: '0 20px', marginBottom: '20px' }}>Browse Products</h2>
            
            <div className="filter-controls">
                <input 
                    type="text" 
                    placeholder="Search products..." 
                    className="search-input"
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select className="category-select" onChange={(e) => setCategory(e.target.value)}>
                    <option value="All">All Categories</option>
                    <option value="Glass">Glass</option>
                    <option value="Door">Door</option>
                    <option value="Window">Window</option>
                </select>
            </div>

            {/* 2. REMOVED the hardcoded "product-card" block that was causing errors */}

            {filteredProducts.length > 0 ? (
                <div className="product-grid">
                    {filteredProducts.map((p) => (
                    <div key={p.id} className="product-item-wrapper">
                        <ProductCard product={p} />
        
        
        <div className="d-flex button-group">
            <button className="view-product-btn" onClick={() => setSelectedProduct(p)}>
                View Product
            </button>
            <button
                className="add-to-cart-btn"
                onClick={() => {
                    addToCart(p);
                    navigate("/cart");
                }}
                >
                <FaShoppingCart size={20} />
                </button>
        </div>
    </div>
))}
                </div>
            ) : (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    <p>No products found matching your search.</p>
                </div>
            )}

            {selectedProduct && (
                <ProductModal 
                    product={selectedProduct} 
                    onClose={() => setSelectedProduct(null)} 
                />
            )}
        </div>
    );
};

export default BrowseProducts;