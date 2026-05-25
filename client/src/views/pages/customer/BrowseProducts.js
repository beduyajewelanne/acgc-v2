import React from 'react';
import './CustomerDashboard.css'; // Reuse your existing CSS

const BrowseProducts= () => {
    const products = [
        { name: "Aluminum Sliding Window", price: "3,500", category: "Aluminum" },
        { name: "Glass Curtain Wall System", price: "8,500", category: "Glass" },
        { name: "Aluminum Sliding Window", price: "3,500", category: "Aluminum" },
        { name: "Glass Curtain Wall System", price: "8,500", category: "Glass" },
        { name: "Aluminum Sliding Window", price: "3,500", category: "Aluminum" },
        { name: "Glass Curtain Wall System", price: "8,500", category: "Glass" },
    ];

    return (
        <div className="dashboard-container">
            <div className="filter-bar">
                <button>All</button>
                <button>Aluminum</button>
                <button>Glass</button>
            </div>
            
            <div className="product-grid">
                {products.map((p, index) => (
                    <div key={index} className="product-card">
                        <h3>{p.name}</h3>
                        <p>Starting from ₱{p.price}</p>
                        <button className="order-btn">View</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BrowseProducts;