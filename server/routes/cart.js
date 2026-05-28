const express = require("express");
const cartRoutes = express.Router();
const port = process.env.PORT || 5000;
const dbo = require("../helper/db");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { ObjectId } = require("mongodb");
const { get_data_helper, check_record_exists, decrypt, insert_one_helper, validateHash, hashPass, update_one_helper, delete_or_archive_many_helper, delete_or_archive_helper, checkAuth, actionLog } = require("../helper/Helper");

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

            const result = await delete_or_archive_many_helper("cart", targetQuery);
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

cartRoutes.post("/api/submit_order_request_batch", async (req, res) => {
    const { token, userId, customer, items } = req.body;

    if (!token) return res.status(401).json({ remarks: "failed", message: "Unauthorized: Missing identity details" });
    if (!userId) return res.status(400).json({ remarks: "failed", message: "Missing identity token properties" });
    if (!customer) return res.status(400).json({ remarks: "failed", message: "Missing customer registration details" });
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ remarks: "failed", message: "No items selected for request compilation" });
    }

    const { fullName, email, phone, address } = customer;

    try {
        checkAuth(token, userId, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "failed", message: "Security authentication failed" });

            const processedOrders = [];
            const cartItemsToRemove = [];

            for (const item of items) {
                const { product_id, width, height, unit, cart_id } = item;
                if (!product_id) continue;

                // 1. Fetch matching baseline product config from collection
                const productResult = await get_data_helper("products", [{ $match: { _id: new ObjectId(product_id) } }]);
                const rawProductList = productResult?.payload || productResult || [];
                if (rawProductList.length === 0) continue;
                
                const productData = rawProductList[0];

                // 2. Map structural dimensions safely fallback to item defaults if string is empty
                const widthVal = width !== "" && width !== undefined ? parseFloat(width) : (parseFloat(productData.width) || 0);
                const heightVal = height !== "" && height !== undefined ? parseFloat(height) : (parseFloat(productData.height) || 0);
                const unitVal = width !== "" && width !== undefined ? (unit || "ft") : (productData.unit || "in");

                // 3. Dimensional converter to Square Feet tracking values
                let wFt = widthVal;
                let hFt = heightVal;

                if (unitVal === 'm') { 
                    wFt = widthVal * 3.28084; 
                    hFt = heightVal * 3.28084; 
                } else if (unitVal === 'in') { 
                    wFt = widthVal / 12; 
                    hFt = heightVal / 12; 
                } else if (unitVal === 'cm') { 
                    wFt = widthVal / 30.48; 
                    hFt = heightVal / 30.48; 
                }

                const areaSqFt = wFt * hFt;
                const ratePerSqFt = parseFloat(productData.pricePerSqFt) || parseFloat(productData.price) || 0;
                const estimatedCost = areaSqFt > 0 ? (areaSqFt * ratePerSqFt) : ratePerSqFt;

                // 4. Populate Document structural frame matching DB maps
                const structuralOrderRequest = {
                    user_id: new ObjectId(userId),
                    clientName: fullName || "",
                    clientEmail: email || "",
                    clientPhone: phone || "",
                    installationAddress: address || "",
                    clientNotes: req.body.clientNotes || "",
                    itemDetails: {
                        product_id: new ObjectId(product_id),
                        name: productData.name,
                        type: productData.type,
                        category: productData.category,
                        variant: productData.variant || "",
                        width: widthVal,
                        height: heightVal,
                        unit: unitVal,
                        areaSqFt: parseFloat(areaSqFt.toFixed(2)),
                        ratePerSqFt: ratePerSqFt,
                        estimatedCost: parseFloat(estimatedCost.toFixed(2))
                    },
                    orderId: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    status: "Pending",
                    isCancelled: 0,
                    createdAt: new Date()
                };

                const result = await insert_one_helper("order_requests", structuralOrderRequest);
                
                if (result.remarks === "success" || result.insertedId) {
                    processedOrders.push({ _id: result.insertedId || result, ...structuralOrderRequest });
                    if (cart_id) {
                        cartItemsToRemove.push(new ObjectId(cart_id));
                    }
                }
            }

            if (processedOrders.length === 0) {
                return res.status(500).json({ remarks: "failed", message: "Database rejected properties insertion profiles." });
            }

            // 5. If checkout originated from Cart collection items, clean records automatically
            if (cartItemsToRemove.length > 0) {
                for (const targetId of cartItemsToRemove) {
                    await delete_or_archive_helper("cart", { _id: targetId });
                }
            }

            // Write operational security action log
            await actionLog(userId, "Submit Order Request", `${fullName} requested estimation blueprints for (${processedOrders.length}) product specifications.`);

            return res.status(200).json({ 
                remarks: "success", 
                message: "Batch items order request context completed successfully", 
                payload: processedOrders
            });
        });
    } catch (err) {
        console.error("Critical server error executing multi-order request mapping processing:", err);
        return res.status(500).json({ error: err.message || err });
    }
});

cartRoutes.post("/api/submit_order_request", async (req, res) => {
    const { token, userId, customer, product_id, clientNotes } = req.body;
    console.log(customer)
    if (!token) return res.status(401).json({ remarks: "failed", message: "Unauthorized: Token is missing" });
    if (!product_id) return res.status(400).json({ remarks: "failed", message: "Missing specifications payload" });

    try {
        // Authenticate request parameters with user database tokens
        checkAuth(token, userId, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "failed", message: "Security authorization failed" });

            const productResult = await get_data_helper("products", [{ $match: { _id: new ObjectId(product_id) } }]);
            const product = productResult?.payload?.[0] || productResult?.payload?.[0] || null;
            const newOrderRequest = {
                user_id: new ObjectId(userId),
                clientName: customer?.fullName || "",
                clientEmail: customer?.email || "",
                clientPhone: customer?.phone || "",
                installationAddress: customer?.address || "",
                itemDetails: {
                    product_id: new ObjectId(product_id),
                    name: product.name,
                    type: product.type,
                    category: product.category,
                    width: parseFloat(product.width) || 0,
                    height: parseFloat(product.height) || 0,
                    unit: product.unit || "in",
                    areaSqFt: parseFloat(product.areaSqFt) || 0,
                    ratePerSqFt: parseFloat(product.ratePerSqFt) || 0,
                    estimatedCost: parseFloat(product.estimatedCost) || 0
                },
                orderId: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                clientNotes: clientNotes || "",
                status: "Pending",
                isCancelled: 0,
                createdAt: new Date()
            };

            const result = await insert_one_helper("order_requests", newOrderRequest);
            
            if (result.remarks === "success" || result.insertedId) {
                await actionLog(userId, "Submit Order Request", `${customer?.fullName} requested an estimation quote for product: ${product.name}`);
                
                return res.status(200).json({ 
                    remarks: "success", 
                    message: "Order context saved successfully", 
                    payload: { _id: result.insertedId || result, ...newOrderRequest } 
                });
            } else {
                return res.status(500).json({ remarks: "failed", message: "Database insertion engine rejected transaction properties." });
            }
        });
    } catch (err) {
        console.error("Critical error inside /api/submit_order_request handler:", err);
        return res.status(500).json({ error: err.message || err });
    }
});

// ─── 1. FETCH ALL ACTIVE ORDER REQUESTS ───────────────────────────────────
cartRoutes.post("/api/get_my_orders", async (req, res) => {
    const { token, userId } = req.body;

    if (!token) return res.status(401).json({ remarks: "failed", message: "Unauthorized: Missing identity token" });
    if (!userId) return res.status(400).json({ remarks: "failed", message: "Missing tracking identification user properties" });

    try {
        // Authenticate the session context token
        checkAuth(token, userId, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "failed", message: "Security authentication failed" });

            // Fetch flat order records belonging to the authenticated client user
            const ordersResult = await get_data_helper("order_requests", [
                { $match: { user_id: new ObjectId(userId), isCancelled: 0 } },
                { $sort: { createdAt: -1 } },
                
            ]);

            const rawOrdersList = ordersResult?.payload || ordersResult || [];

            // Normalize database records into the explicit key definitions expected by your MyOrders React component
            const normalizedOrders = rawOrdersList.map(order => {
                const details = order.itemDetails || {};
                const cost = parseFloat(details.estimatedCost) || 0;
                
                // Uniformly calculate required downpayment (e.g., 50%) matching checkout rules
                const requiredDpAmount = cost * 0.5;
                const paidDpAmount = parseFloat(order.downpaymentPaid) || 0;

                // Format textual representations for dimensions fallback
                const dimensionString = (details.width && details.height) 
                    ? `${details.width}${details.unit} x ${details.height}${details.unit}` 
                    : "Base Configuration Dimensions";

                return {
                    id: order._id ? order._id.toString() : "",
                    name: details.name || "Architectural Product Placement",
                    date: order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric'
                    }) : "Date Unspecified",
                    status: order.status || "Pending",
                    price: `₱ ${cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    downpayment: `₱ ${paidDpAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    requiredDownpayment: `₱ ${requiredDpAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    siteInspection: (order.status === "Pending Inspection" || order.status === "Pending") ? "Pending" : "Done",
                    measurements: dimensionString,
                    contractLink: order.contractLink || "#",
                    receiptLink: order.receiptLink || "#",
                    orderId: order.orderId || "",
                    is_cancelledAllowed: (order?.is_cancelledAllowed == 1 || order?.is_cancelledAllowed === "1") ? 1 : 0
                };
            });

            return res.status(200).json({
                remarks: "success",
                message: "Client order requests compilation successfully gathered",
                payload: normalizedOrders
            });
        });
    } catch (err) {
        console.error("Critical server error executing fetch matching customer orders processing:", err);
        return res.status(500).json({ error: err.message || err });
    }
});


// ─── 2. CANCEL / UPDATE SPECIFIC ORDER REQUEST STATUS ─────────────────────
cartRoutes.post("/api/cancel_order_request", async (req, res) => {
    const { token, userId, order_id } = req.body;

    if (!token) return res.status(401).json({ remarks: "failed", message: "Unauthorized: Missing session tokens" });
    if (!userId) return res.status(400).json({ remarks: "failed", message: "Missing security tracking identity coordinates" });
    if (!order_id) return res.status(400).json({ remarks: "failed", message: "Missing order transaction key parameter reference" });

    try {
        // Authenticate user token profile validity before modifying collections
        checkAuth(token, userId, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "failed", message: "Security authorization failed" });

            // 1. Verify target order existence and ownership profile before executing update
            const findResult = await get_data_helper("order_requests", [
                { $match: { _id: new ObjectId(order_id), user_id: new ObjectId(userId) } }
            ]);
            const existingOrderList = findResult?.payload || findResult || [];

            if (existingOrderList.length === 0) {
                return res.status(404).json({ remarks: "failed", message: "Target document order request profile not found or access unauthorized" });
            }

            const targetOrder = existingOrderList[0];

            // 2. Prevent cancellation if design process has proceeded past initial verification status unless explicitly allowed
            const isPending = targetOrder.status === "Pending" || targetOrder.status === "Pending Inspection";
            const isExplicitlyAllowed = targetOrder.is_cancelledAllowed == 1 || targetOrder.is_cancelledAllowed === "1";

            if (!isPending && !isExplicitlyAllowed) {
                return res.status(400).json({ 
                    remarks: "failed", 
                    message: "Cannot cancel order requests already processed into production status or inspection clearance loops" 
                });
            }

            // 3. Instead of deleting, update the document status to "Cancelled"
            const updateResult = await update_one_helper(
                "order_requests", 
                { _id: new ObjectId(order_id) }, 
                { $set: { status: "Cancelled", isCancelled: 1, updatedAt: new Date() } }
            );

            if (updateResult.remarks === "success" || updateResult.modifiedCount > 0 || updateResult.matchedCount > 0) {
                
                // Write transaction operations log tracking details
                await actionLog(userId, "Cancel Order Request", `Updated structural order request status to Cancelled for tracking key ID: ${order_id}`);

                return res.status(200).json({
                    remarks: "success",
                    message: "Order request transaction status updated to Cancelled successfully"
                });
            } else {
                return res.status(500).json({ remarks: "failed", message: "Database update engine failed to process transaction profile status modifications." });
            }
        });
    } catch (err) {
        console.error("Critical error mapping execution processing inside /api/cancel_order_request handler:", err);
        return res.status(500).json({ error: err.message || err });
    }
});

cartRoutes.get("/api/test_cart_endpoint/:orderId", async (req, res) => {
    const { orderId } = req.params;

    try {
        const result = await get_data_helper("order_requests", [
            { $match: { orderId: orderId, status: { $ne: "Cancelled" } } }
        ]);
        return res.status(200).json(result);
    } catch (err) {
        console.error("Critical error mapping execution processing inside /api/test_cart_endpoint handler:", err);
        return res.status(500).json({ error: err.message || err });
    }
})
module.exports = cartRoutes;