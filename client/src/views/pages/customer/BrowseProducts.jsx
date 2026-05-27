import React, { useState, useContext, useEffect, useMemo } from 'react';
import ProductCard from '../../../components/ProductCard';
import './CustomerDashboard.css';
import ProductModal from '../../../components/ProductModal';
import { CartContext } from '../../../context/CartContext'; 
import { useNavigate } from "react-router-dom";
import { FaShoppingCart } from 'react-icons/fa';
import { CRUD, isEmpty } from 'services/data.services';
import { UserContext } from 'App';

const BrowseProducts = () => {
    const { user } = useContext(UserContext);
    const { addToCart } = useContext(CartContext);
    const navigate = useNavigate();

    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [category, setCategory] = useState("All");

    useEffect(() => {
        const requestOptions = {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        };

        CRUD(window.base_api + "get_products_client", requestOptions, (res) => {
            if (res && res.remarks === "success") {
                setProducts(res.payload || []);
            } else if (Array.isArray(res)) {
                setProducts(res);
            } else if (res && Array.isArray(res.payload)) {
                setProducts(res.payload);
            } else {
                console.error("Failed to load browse products repository:", res?.message);
                setProducts([]);
            }
        });
    }, []);

    const filteredProducts = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return products.filter((p) => {
            const matchesSearch = !q || 
                p.name?.toLowerCase().includes(q) ||
                p.category?.toLowerCase().includes(q) ||
                p.variant?.toLowerCase().includes(q) ||
                p.type?.toLowerCase().includes(q);

            const matchesCategory = category === "All" || p.category === category;
            
            return matchesSearch && matchesCategory;
        });
    }, [products, searchTerm, category]);

    return (
        <div className="product-preview">
            <h2 style={{ padding: '0 20px', marginBottom: '20px' }}>Browse Products</h2>
            
            <div className="filter-controls">
                <input 
                    type="text" 
                    placeholder="Search products..." 
                    className="search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select className="category-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="All">All Categories</option>
                    <option value="Windows">Windows</option>
                    <option value="Doors">Doors</option>
                    <option value="Partitions">Partitions</option>
                    <option value="Railings">Railings</option>
                    <option value="Curtain Walls">Curtain Walls</option>
                </select>
            </div>

            {filteredProducts.length > 0 ? (
                <div className="product-grid">
                    {filteredProducts.map((p) => (
                        <div key={p._id || p.id} className="product-item-wrapper">
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
                                    title="Add to Cart"
                                >
                                    <FaShoppingCart size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <p>No products found matching your active filters.</p>
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