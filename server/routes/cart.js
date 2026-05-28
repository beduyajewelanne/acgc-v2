const express = require("express");
const cartRoutes = express.Router();
const port = process.env.PORT || 5000;
const dbo = require("../helper/db");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { ObjectId } = require("mongodb");
const { get_data_helper, check_record_exists, decrypt, insert_one_helper, validateHash, hashPass, update_one_helper, delete_or_archive_helper, checkAuth, actionLog } = require("../helper/Helper");

cartRoutes.post("/api/get_cart", async (req, res) => {
    const { token, _id } = req.body;
    console.log(token)

    if (!token) return res.status(401).json({ remarks: "Unauthorized" });

    try {
        checkAuth(token, _id, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "Unauthorized" });
            const query = [
                {
                    $match: {
                        user_id: new ObjectId(_id)
                    }
                },
                {
                    $lookup: {
                        from: "products",
                        localField: "product_id",
                        foreignField: "_id",
                        as: "product_details"
                    }
                },
                {
                    $unwind: {
                        path: "$product_details",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        _id: 1,
                        user_id: 1,
                        product_id: 1,
                        width: 1,
                        height: 1,
                        unit: 1,
                        quantity: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        name: "$product_details.name",
                        price: "$product_details.price",
                        pricePerSqFt: "$product_details.pricePerSqFt",
                        estimatedCost: "$product_details.estimatedCost",
                        mainImg: "$product_details.mainImg",
                        category: "$product_details.category"
                    }
                }
            ]
            const result = await get_data_helper("cart", query);
            if (result?.payload?.length > 0) {
                await actionLog(_id, "Viewed cart");
                return res.status(200).json({ remarks: "success", message: "Cart retrieved successfully", payload: result.payload });
            } else {
                return res.status(200).json({ remarks: "success", message: "Cart is empty", payload: [] });
            }
        });
    } catch (err) {
        console.error("Error fetching cart:", err);
        return res.status(500).json({ error: err.message });
    }
});

cartRoutes.post("/api/add_to_cart", async (req, res) => {
    const token = req.body.token;
    const user_id = req.body._id;
    const product_id = req.body.product_id;
    const width = req.body.width;
    const height = req.body.height;
    const unit = req.body.unit || 'in';

    if (!token) return res.status(401).json({ remarks: "Unauthorized" });
    if (!product_id) return res.status(400).json({ remarks: "failed", message: "Missing product_id parameter" });

    try {
        checkAuth(token, user_id, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "Unauthorized" });

            const checkQuery = [
                {
                    $match: {
                        user_id: new ObjectId(user_id),
                        product_id: new ObjectId(product_id),
                        width: Number(width),
                        height: Number(height),
                        unit: unit
                    }
                }
            ];

            const existingItem = await get_data_helper("cart", checkQuery);

            if (existingItem?.payload?.length > 0) {
                const updatedQty = (existingItem.payload[0].quantity || 1) + 1;
                const updateResult = await update_one_helper(
                    "cart",
                    { _id: existingItem.payload[0]._id },
                    { $set: { quantity: updatedQty, updatedAt: new Date() } }
                );
                
                if (updateResult.remarks === "success") {
                    await actionLog(user_id, `Incremented quantity for product: ${product_id} in cart`);
                    return res.status(200).json({ remarks: "success", message: "Product quantity updated in cart" });
                }
            } else {
                const cartItem = {
                    user_id: new ObjectId(user_id),
                    product_id: new ObjectId(product_id),
                    width: Number(width),
                    height: Number(height),
                    unit: unit,
                    quantity: 1,
                    createdAt: new Date()
                };

                const result = await insert_one_helper("cart", cartItem);
                if (result.remarks === "success") {
                    await actionLog(user_id, `Added product: ${product_id} to cart`);
                    return res.status(200).json({ remarks: "success", message: "Product added to cart successfully" });
                } else {
                    return res.status(500).json({ remarks: "failed", message: "Failed to add product to cart" });
                }
            }
        });
    } catch (err) {
        console.error("Error adding item to cart:", err);
        return res.status(500).json({ error: err.message });
    }
});

cartRoutes.post("/api/remove_from_cart", async (req, res) => {
    const token = req.body.token;
    const user_id = req.body._id;
    const product_id = req.body.product_id;

    if (!token) return res.status(401).json({ remarks: "Unauthorized" });

    try {
        checkAuth(token, user_id, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "Unauthorized" });
            
            // Evaluates dynamically whether product_id parameter is a single String object or raw collection array 
            const targetQuery = Array.isArray(product_id) 
                ? { user_id: new ObjectId(user_id), product_id: { $in: product_id.map(id => new ObjectId(id)) } }
                : { user_id: new ObjectId(user_id), product_id: new ObjectId(product_id) };

            const result = await delete_or_archive_helper("cart", targetQuery);
            if (result.remarks === "success") {
                await actionLog(user_id, "Removed product(s) from cart");
                return res.status(200).json({ remarks: "success", message: "Product(s) removed from cart" });
            } else {
                return res.status(500).json({ remarks: "failed", message: "Failed to remove item entries" });
            }
        });
    } catch (err) {
        console.error("Error removing items from cart:", err);
        return res.status(500).json({ error: err.message });
    }
});

module.exports = cartRoutes;