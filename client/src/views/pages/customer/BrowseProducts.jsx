import React, { useState } from 'react';
import { products } from '../../../data/productData';
import ProductCard from '../../../components/ProductCard';
import './CustomerDashboard.css';
import ProductModal from '../../../components/ProductModal';

const BrowseProducts = () => {
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [category, setCategory] = useState("All");

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

            {filteredProducts.length > 0 ? (
                <div className="product-grid">
                    {filteredProducts.map((p) => (
                        <div key={p.id} onClick={() => setSelectedProduct(p)}>
                            <ProductCard product={p} />
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