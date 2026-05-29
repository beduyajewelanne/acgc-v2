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
            
            // Generate ONE shared order ID for this entire batch request assignment
            const sharedOrderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            for (const item of items) {
                const { product_id, width, height, unit, cart_id, quantity } = item;
                if (!product_id) continue;

                const productResult = await get_data_helper("products", [{ $match: { _id: new ObjectId(product_id) } }]);
                const rawProductList = productResult?.payload || productResult || [];
                if (rawProductList.length === 0) continue;
                
                const productData = rawProductList[0];

                const widthVal = width !== "" && width !== undefined ? parseFloat(width) : (parseFloat(productData.width) || 0);
                const heightVal = height !== "" && height !== undefined ? parseFloat(height) : (parseFloat(productData.height) || 0);
                const unitVal = width !== "" && width !== undefined ? (unit || "cm") : (productData.unit || "cm");

                // Metric Area calculation engine matching image_f39ec2.png definitions
                let areaSqFt = 0;
                const ratePerSqFt = parseFloat(productData.pricePerSqFt) || parseFloat(productData.price) || 0;
                
                if (unitVal === "cm") {
                    // Standard industry calculation conversion path: (W * H) / 929.03 to scale to sqft
                    areaSqFt = (widthVal * heightVal) / 929.03;
                } else {
                    let wFt = widthVal;
                    let hFt = heightVal;
                    if (unitVal === 'm') { wFt = widthVal * 3.28084; hFt = heightVal * 3.28084; }
                    else if (unitVal === 'in') { wFt = widthVal / 12; hFt = heightVal / 12; }
                    areaSqFt = wFt * hFt;
                }
                
                const estimatedCost = areaSqFt > 0 ? (areaSqFt * ratePerSqFt) : ratePerSqFt;

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
                        areaSqFt: parseFloat(areaSqFt.toFixed(4)),
                        ratePerSqFt: ratePerSqFt,
                        estimatedCost: parseFloat(estimatedCost.toFixed(2))
                    },
                    orderId: sharedOrderId, // Shared tracking assignment across all records inside this batch
                    status: "Pending",
                    isCancelled: 0,
                    createdAt: new Date(),
                    quantity: quantity
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

            if (cartItemsToRemove.length > 0) {
                for (const targetId of cartItemsToRemove) {
                    await delete_or_archive_helper("cart", { _id: targetId });
                }
            }

            await actionLog(userId, "Submit Order Request Batch", `${fullName} requested batch estimation blueprint for ID: ${sharedOrderId}`);

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
                createdAt: new Date(),
                quantity: 1
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
        checkAuth(token, userId, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "failed", message: "Security authentication failed" });

            // 1. Fetch all matching documents for this user
            const ordersResult = await get_data_helper("order_requests", [
                { $match: { user_id: new ObjectId(userId), isCancelled: 0 } },
                { $sort: { createdAt: -1 } },
            ]);

            const rawOrdersList = ordersResult?.payload || ordersResult || [];

            // 2. Group documents by their unique 'orderId'
            const groupedMap = {};

            rawOrdersList.forEach(doc => {
                const groupKey = doc.orderId || (doc._id ? doc._id.toString() : "unassigned");

                if (!groupedMap[groupKey]) {
                    groupedMap[groupKey] = {
                        ...doc,
                        rawItemsCollector: []
                    };
                }

                // Capture the quantity from the root document level (with a safe fallback to 1)
                const rootQuantity = parseInt(doc.quantity) || 1;

                // Extract item and attach the correct root quantity to it
                if (Array.isArray(doc.items)) {
                    doc.items.forEach(item => {
                        groupedMap[groupKey].rawItemsCollector.push({
                            ...item,
                            // fallback to root quantity if the nested item doesn't have its own
                            quantity: parseInt(item.quantity) || rootQuantity 
                        });
                    });
                } else if (doc.itemDetails) {
                    groupedMap[groupKey].rawItemsCollector.push({
                        ...doc.itemDetails,
                        quantity: rootQuantity // inject the root quantity directly into the item payload
                    });
                } else {
                    groupedMap[groupKey].rawItemsCollector.push({
                        ...doc,
                        quantity: rootQuantity
                    });
                }
            });

            // 4. Map grouped elements into your expected React UI structure
            const normalizedOrders = Object.keys(groupedMap).map(orderIdKey => {
                const groupedOrder = groupedMap[orderIdKey];
                const itemsArray = groupedOrder.rawItemsCollector;

                // Deduplicate items with matching names/dimensions while combining their quantities
                const condensedItemsMap = {};
                itemsArray.forEach(item => {
                    const nameKey = item.name || "Architectural Product Placement";
                    const width = item.width || item.dimensions?.width || '';
                    const height = item.height || item.dimensions?.height || '';
                    const itemUniqueId = `${nameKey}-${width}-${height}`;

                    const price = parseFloat(item.price || item.estimatedCost) || 0;
                    const  qty = parseInt(item.quantity) || 1;

                    if (condensedItemsMap[itemUniqueId]) {
                        condensedItemsMap[itemUniqueId].quantity += qty;
                        condensedItemsMap[itemUniqueId].lineTotal = condensedItemsMap[itemUniqueId].price * condensedItemsMap[itemUniqueId].quantity;
                    } else {
                        const unit = item.unit || 'px';
                        condensedItemsMap[itemUniqueId] = {
                            name: nameKey,
                            price: price,
                            quantity: qty,
                            lineTotal: price * qty,
                            dimensions: (width && height) ? `${width}${unit} x ${height}${unit}` : (item.dimensions || "Base Dimensions"),
                            area: item.area || 0
                        };
                    }
                });

                const normalizedItems = Object.values(condensedItemsMap);

                // Calculate Grand Total across all merged item quantities
                const totalCost = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0);
                const requiredDpAmount = totalCost * 0.5;
                const paidDpAmount = parseFloat(groupedOrder.downpaymentPaid) || 0;

                return {
                    id: groupedOrder._id ? groupedOrder._id.toString() : "",
                    orderId: orderIdKey,
                    name: normalizedItems.length > 1 ? `Batch Order (${normalizedItems.length} Products)` : (normalizedItems[0]?.name || "Architectural Order"),
                    date: groupedOrder.createdAt ? new Date(groupedOrder.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric'
                    }) : "Date Unspecified",
                    status: groupedOrder.status || "Pending",
                    price: `₱ ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    downpayment: `₱ ${paidDpAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    requiredDownpayment: `₱ ${requiredDpAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    siteInspection: (groupedOrder.status === "Pending Inspection" || groupedOrder.status === "Pending") ? "Pending" : "Done",
                    contractLink: groupedOrder.contractLink || "#",
                    receiptLink: groupedOrder.receiptLink || "#",
                    is_cancelledAllowed: (groupedOrder?.is_cancelledAllowed == 1 || groupedOrder?.is_cancelledAllowed === "1") ? 1 : 0,
                    items: normalizedItems // Array containing exact grouped structures and their quantities
                };
            });

            return res.status(200).json({
                remarks: "success",
                message: "Client order requests grouped and compiled successfully",
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
        // 1. Fetch matching records. (Removed status restriction so users can track Cancelled states correctly)
        const result = await get_data_helper("order_requests", [
            { $match: { orderId: orderId } }
        ]);

        const rawList = result?.payload || result || [];

        if (!Array.isArray(rawList) || rawList.length === 0) {
            return res.status(404).json({ 
                remarks: "failed", 
                message: "No matching project tracking code discovered record match." 
            });
        }

        // 2. Format and pass down the exact structure expected by the TrackProducts component
        return res.status(200).json({
            remarks: "success",
            message: "Project tracking tracking context documents fetched successfully",
            payload: rawList
        });

    } catch (err) {
        console.error("Critical error mapping execution processing inside /api/test_cart_endpoint handler:", err);
        return res.status(500).json({ error: err.message || err });
    }
});

// ─── 3. ADMIN WORKSPACE: FETCH ALL SITE INSPECTION RECORDS ────────────────
cartRoutes.post("/api/get_order_requests", async (req, res) => {
    const { token, user_id } = req.body;

    if (!token) return res.status(401).json({ remarks: "Unauthorized" });

    try {
        checkAuth(token, user_id, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "Unauthorized" });

            // Pipeline strategy groups separate split database entries with the same orderId cleanly
            const pipeline = [
                {
                    $group: {
                        _id: "$orderId",
                        // Retains base document indicators safely from the first record in the group
                        dbId: { $first: "$_id" },
                        user_id: { $first: "$user_id" },
                        clientName: { $first: "$clientName" },
                        clientPhone: { $first: "$clientPhone" },
                        clientEmail: { $first: "$clientEmail" },
                        installationAddress: { $first: "$installationAddress" },
                        clientNotes: { $first: "$clientNotes" },
                        status: { $first: "$status" },
                        isCancelled: { $first: "$isCancelled" },
                        createdAt: { $first: "$createdAt" },
                        inspectionDate: { $first: "$inspectionDate" },
                        estimatedInstallationDate: { $first: "$estimatedInstallationDate" },
                        paymentTerms: { $first: "$paymentTerms" },
                        downpaymentPaid: { $first: "$downpaymentPaid" },
                        paymentDate: { $first: "$paymentDate" },
                        customerHasAccount: { $first: "$customerHasAccount" },
                        customerEmail: { $first: "$customerEmail" },
                        // Appends custom admin measurement array inputs if they exist
                        manualMeasurements: { $first: "$measurements" },
                        manualEstimatedTotal: { $first: "$estimatedTotal" },
                        // Collects all item details into an array across all matching shared records
                        bundledItems: {
                            $push: {
                                id: "$_id",
                                product: "$itemDetails.name",
                                width: "$itemDetails.width",
                                height: "$itemDetails.height",
                                qty: { $ifNull: ["$itemDetails.quantity", 1] },
                                pricePerSqFt: "$itemDetails.ratePerSqFt"
                            }
                        }
                    }
                },
                { $sort: { createdAt: -1 } }
            ];

            const result = await get_data_helper("order_requests", pipeline);
            const rawPayload = result?.payload || result || [];

            const normalizedPayload = rawPayload.map(group => {
                // If explicit measurements exist via manual dashboard creates, use them. Otherwise, fallback to rolled up bundledItems.
                let measurements = group.manualMeasurements || [];
                if (measurements.length === 0 && group.bundledItems && group.bundledItems.length > 0) {
                    measurements = group.bundledItems.filter(item => item.product);
                }
                
                // Fallback safeguards to standard array maps
                if (measurements.length === 0) {
                    measurements = [{ id: Date.now(), product: '', width: '', height: '', qty: 1, pricePerSqFt: '' }];
                }

                // Compute real-time totals safely across all items
                const calculatedTotal = measurements.reduce((sum, r) => {
                    const sqFt = ((parseFloat(r.width) || 0) * (parseFloat(r.height) || 0)) / 929.03;
                    return sum + (sqFt * (parseFloat(r.pricePerSqFt) || 0) * (parseInt(r.qty) || 1));
                }, 0);

                return {
                    _id: group.dbId ? group.dbId.toString() : "",
                    id: group._id || "", 
                    orderId: group._id || "",
                    user_id: group.user_id,
                    clientName: group.clientName || "Unknown Client",
                    clientNumber: group.clientPhone || "",
                    clientAddress: group.installationAddress || "",
                    siteAddress: group.installationAddress || "",
                    notes: group.clientNotes || "",
                    status: group.status || "Pending",
                    isCancelled: group.isCancelled || 0,
                    dateCreated: group.createdAt ? new Date(group.createdAt).toISOString().split('T')[0] : "",
                    inspectionDate: group.inspectionDate || (group.createdAt ? new Date(group.createdAt).toISOString().split('T')[0] : ""),
                    estimatedInstallationDate: group.estimatedInstallationDate || "",
                    paymentTerms: group.paymentTerms || '50% downpayment, 50% upon completion',
                    downpaymentPaid: group.downpaymentPaid || false,
                    paymentDate: group.paymentDate || "",
                    customerHasAccount: group.customerHasAccount || false,
                    customerEmail: group.customerEmail || "",
                    measurements: measurements,
                    estimatedTotal: group.manualEstimatedTotal || parseFloat(calculatedTotal.toFixed(2))
                };
            });

            return res.status(200).json({ remarks: "success", payload: normalizedPayload });
        });
    } catch (err) {
        console.error("Error fetching grouped site inspections:", err);
        return res.status(500).json({ error: err.message });
    }
});
 
// ─── 4. ADMIN WORKSPACE: CREATE NEW ORDER REQUEST RECORD ──────────────────
cartRoutes.post("/api/create_order_request", async (req, res) => {
    const { token, _id, clientName, clientNumber, siteAddress, inspectionDate, estimatedInstallationDate, status, notes, paymentTerms, downpaymentPaid, paymentDate, customerHasAccount, customerEmail, measurements, estimatedTotal } = req.body;

    if (!token) return res.status(401).json({ remarks: "Unauthorized" });

    try {
        checkAuth(token, _id, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "Unauthorized" });

            const newRecord = {
                user_id: customerHasAccount ? null : new ObjectId(), // Can be linked dynamically later if required
                clientName: clientName || "",
                clientEmail: customerEmail || "",
                clientPhone: clientNumber || "",
                installationAddress: siteAddress || "",
                clientNotes: notes || "",
                orderId: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                status: status || "Pending",
                isCancelled: status === "Canceled" ? 1 : 0,
                createdAt: new Date(),
                // Extra operational fields used by the Site Inspection context
                inspectionDate: inspectionDate || "",
                estimatedInstallationDate: estimatedInstallationDate || "",
                paymentTerms: paymentTerms || "",
                downpaymentPaid: downpaymentPaid || false,
                paymentDate: paymentDate || "",
                customerHasAccount: customerHasAccount || false,
                customerEmail: customerEmail || "",
                measurements: measurements || [],
                estimatedTotal: parseFloat(estimatedTotal) || 0
            };

            const result = await insert_one_helper("order_requests", newRecord);
            if (result.remarks === "success" || result.insertedId) {
                await actionLog(_id, "Created Site Inspection Order", `Manually added order tracking for ${clientName}`);
                return res.status(200).json({ remarks: "success", message: "Inspection context created successfully" });
            } else {
                return res.status(500).json({ remarks: "failed", message: "Database rejected properties insert." });
            }
        });
    } catch (err) {
        console.error("Critical error inside create_order_request handler:", err);
        return res.status(500).json({ error: err.message });
    }
});

// ─── 5. ADMIN WORKSPACE: UPDATE EXISTING ORDER REQUEST RECORD ──────────────
cartRoutes.post("/api/update_order_request", async (req, res) => {
    const { token, user_id, ...fields } = req.body;

    if (!token) return res.status(401).json({ remarks: "Unauthorized" });
    
    const orderId = fields.orderId || fields.id;
    if (!orderId) return res.status(400).json({ remarks: "failed", message: "Missing target orderId reference identifier" });

    try {
        checkAuth(token, user_id, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "Unauthorized" });

            const securePayload = { ...fields };
            delete securePayload._id;
            delete securePayload.id;
            delete securePayload.token;

            if (securePayload.status === "Canceled") {
                securePayload.isCancelled = 1;
            }

            // Perform an update query spanning all matching records sharing this shared orderId
            const db = await dbo.getDb();
            const updateResult = await db.collection("order_requests").updateMany(
                { orderId: orderId },
                { $set: { ...securePayload, updatedAt: new Date() } }
            );

            if (updateResult.matchedCount > 0) {
                await actionLog(user_id, "Updated Grouped Order Request", `Modified fields for batch tracking orderId: ${orderId}`);
                return res.status(200).json({ remarks: "success", message: "Grouped inspection records updated successfully" });
            } else {
                return res.status(500).json({ remarks: "failed", message: "No documents matched the tracking orderId specification context." });
            }
        });
    } catch (err) {
        console.error("Critical error inside update_order_request handler:", err);
        return res.status(500).json({ error: err.message });
    }
});

// ─── 6. ADMIN WORKSPACE: DISPATCH / SEND INSPECTION CONTRACT ───────────────
cartRoutes.post("/api/send_inspection_contract", async (req, res) => {
    const { token, _id, orderRequestId } = req.body;

    if (!token) return res.status(401).json({ remarks: "Unauthorized" });
    if (!orderRequestId) return res.status(400).json({ remarks: "failed", message: "Missing orderRequestId target identification" });

    try {
        checkAuth(token, _id, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "Unauthorized" });

            const targetQuery = ObjectId.isValid(orderRequestId) ? { _id: new ObjectId(orderRequestId) } : { orderId: orderRequestId };

            // Set contract tracking flags on the initial base request structure
            const updateResult = await update_one_helper(
                "order_requests",
                targetQuery,
                { $set: { contractSentToCustomer: true, contractSentDate: new Date(), updatedAt: new Date() } }
            );

            if (updateResult.remarks === "success" || updateResult.modifiedCount > 0 || updateResult.matchedCount > 0) {
                await actionLog(_id, "Dispatched Service Contract", `Sent contract update configuration map details for order ID: ${orderRequestId}`);
                return res.status(200).json({ remarks: "success", message: "Contract processed and dispatched cleanly" });
            } else {
                return res.status(500).json({ remarks: "failed", message: "Failed to update contract dispatch flags in database." });
            }
        });
    } catch (err) {
        console.error("Critical error inside send_inspection_contract handler:", err);
        return res.status(500).json({ error: err.message });
    }
});

// Deprecated tracking routes left active for historical API mapping compatibility layers
cartRoutes.post("/api/admin/site_inspections", async (req, res) => {
    const { token, _id } = req.body;
    if (!token) return res.status(401).json({ remarks: "Unauthorized" });
    try {
        checkAuth(token, _id, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "Unauthorized" });
            const query = [{ $sort: { createdAt: -1 } }];
            const result = await get_data_helper("order_requests", query);
            return res.status(200).json({ remarks: "success", payload: result?.payload || result || [] });
        });
    } catch (err) { return res.status(500).json({ error: err.message }); }
});
 
cartRoutes.post("/api/admin/update_site_inspection", async (req, res) => {
    const { token, _id, orderId, updateFields } = req.body;
    if (!token) return res.status(401).json({ remarks: "Unauthorized" });
    if (!orderId) return res.status(400).json({ remarks: "failed", message: "Missing tracking orderId parameter" });
    try {
        checkAuth(token, _id, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "Unauthorized" });
            const securePayload = { ...updateFields };
            delete securePayload._id; delete securePayload.orderId; delete securePayload.user_id;
            const updateResult = await update_one_helper("order_requests", { orderId: orderId }, { $set: { ...securePayload, updatedAt: new Date() } });
            if (updateResult.remarks === "success" || updateResult.modifiedCount > 0 || updateResult.matchedCount > 0) {
                await actionLog(_id, "Updated Site Inspection Details", `Modified inspection fields for ${orderId}`);
                return res.status(200).json({ remarks: "success", message: "Inspection record updated successfully" });
            } else { return res.status(500).json({ remarks: "failed", message: "Database engine failed to process document updates." }); }
        });
    } catch (err) { return res.status(500).json({ error: err.message }); }
});

module.exports = cartRoutes;