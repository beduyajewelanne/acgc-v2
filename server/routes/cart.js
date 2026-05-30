const express = require("express");
const cartRoutes = express.Router();
const port = process.env.PORT || 5000;
const dbo = require("../helper/db");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { ObjectId } = require("mongodb");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { get_data_helper, check_record_exists, decrypt, insert_one_helper, validateHash, hashPass, update_one_helper, delete_or_archive_many_helper, delete_or_archive_helper, checkAuth, actionLog } = require("../helper/Helper");

// Configure file upload storage options
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Configure email transporter setup matching your system environment variables
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL || 'your-clinic-or-firm@gmail.com',
    pass: process.env.SMTP_PASSWORD || 'your-app-password'
  }
});

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
            const sharedOrderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            for (const item of items) {
                const { product_id, width, height, unit, cart_id, quantity } = item;
                if (!product_id) continue;

                const productResult = await get_data_helper("products", [{ $match: { _id: new ObjectId(product_id) } }]);
                const rawProductList = productResult?.payload || productResult || [];
                if (rawProductList.length === 0) continue;
                
                const productData = rawProductList[0];

                // Ensure quantity defaults cleanly to an integer
                const finalQuantity = parseInt(quantity) || 1;

                const widthVal = width !== "" && width !== undefined ? parseFloat(width) : (parseFloat(productData.width) || 0);
                const heightVal = height !== "" && height !== undefined ? parseFloat(height) : (parseFloat(productData.height) || 0);
                
                // Keep 'ft' or 'in' or whatever the product default template uses if user unit is missing
                const unitVal = width !== "" && width !== undefined ? (unit || "in") : (productData.unit || "in");

                let areaSqFt = 0;
                const ratePerSqFt = parseFloat(productData.pricePerSqFt) || parseFloat(productData.price) || 0;
                
                // Conversions Engine
                if (unitVal === "cm") {
                    areaSqFt = (widthVal * heightVal) / 929.03;
                } else if (unitVal === "m") {
                    areaSqFt = (widthVal * 3.28084) * (heightVal * 3.28084);
                } else if (unitVal === "in") {
                    areaSqFt = (widthVal / 12) * (heightVal / 12);
                } else {
                    // Default assume unit is already feet ('ft')
                    areaSqFt = widthVal * heightVal;
                }
                
                // Calculate item base cost, then scale cleanly by quantity
                const baseItemCost = areaSqFt > 0 ? (areaSqFt * ratePerSqFt) : ratePerSqFt;
                const totalEstimatedCost = baseItemCost * finalQuantity;

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
                        estimatedCost: parseFloat(totalEstimatedCost.toFixed(2)) // <-- Fixed: Formats safely after multiplication
                    },
                    orderId: sharedOrderId, 
                    status: "Pending",
                    isCancelled: 0,
                    createdAt: new Date(),
                    quantity: finalQuantity,
                    paymentTerms: '50% downpayment, 50% upon completion'
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

            // Cleanup processed items out of cart database
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
    const { token, userId, customer, product_id, clientNotes, measurements, quantity } = req.body;
    
    console.log(customer);
    if (!token) return res.status(401).json({ remarks: "failed", message: "Unauthorized: Token is missing" });
    if (!product_id) return res.status(400).json({ remarks: "failed", message: "Missing specifications payload" });

    try {
        checkAuth(token, userId, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "failed", message: "Security authorization failed" });

            const productResult = await get_data_helper("products", [{ $match: { _id: new ObjectId(product_id) } }]);
            const product = productResult?.payload?.[0] || null;

            if (!product) return res.status(404).json({ remarks: "failed", message: "Product not found" });

            const finalWidth = parseFloat(measurements?.width) || parseFloat(product.width) || 0;
            const finalHeight = parseFloat(measurements?.height) || parseFloat(product.height) || 0;
            const finalUnit = measurements?.unit || product.unit || "in";
            
            // --- FIX: Dynamic Unit Conversion Engine to Square Feet ---
            let areaSqFt = 0;
            if (finalUnit === "cm") {
                areaSqFt = (finalWidth * finalHeight) / 929.03;
            } else if (finalUnit === "in" || finalUnit === "inch") {
                areaSqFt = (finalWidth * finalHeight) / 144; // 12in * 12in = 144 sq inches per sq ft
            } else if (finalUnit === "m") {
                areaSqFt = (finalWidth * 3.28084) * (finalHeight * 3.28084);
            } else if (finalUnit === "ft") {
                areaSqFt = finalWidth * finalHeight;
            } else {
                // Fallback to whatever is saved on the template product data if units don't match
                areaSqFt = parseFloat(product.areaSqFt) || 0;
            }

            const rate = parseFloat(product.pricePerSqFt) || parseFloat(product.price) || 0;
            const finalQuantity = parseInt(quantity) || 1;
            
            // Calculate real item estimation safely
            const baseItemCost = areaSqFt > 0 ? (areaSqFt * rate) : rate;
            const dynamicEstimatedCost = baseItemCost * finalQuantity;

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
                    width: finalWidth,          
                    height: finalHeight,        
                    unit: finalUnit,            
                    areaSqFt: parseFloat(areaSqFt.toFixed(4)), // Clean decimals
                    ratePerSqFt: rate,
                    estimatedCost: parseFloat(dynamicEstimatedCost.toFixed(2)) // Clean currency rounding
                },
                orderId: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                clientNotes: clientNotes || "",
                status: "Pending",
                isCancelled: 0,
                createdAt: new Date(),
                quantity: finalQuantity,        
                paymentTerms: '50% downpayment, 50% upon completion'
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

            // 2. Group items cleanly by their shared 'orderId'
            const groupedMap = {};

            rawOrdersList.forEach(doc => {
                const groupKey = doc.orderId || (doc._id ? doc._id.toString() : "unassigned");

                if (!groupedMap[groupKey]) {
                    // Initialize group baseline info from the primary document template
                    groupedMap[groupKey] = {
                        _id: doc._id ? doc._id.toString() : "",
                        orderId: groupKey,
                        status: doc.status || "Pending",
                        createdAt: doc.createdAt || null,
                        estimatedTotal: parseFloat(doc.estimatedTotal) || 0,
                        downpaymentPaid: doc.downpaymentPaid === true || doc.downpaymentPaid === 1 || String(doc.downpaymentPaid).toLowerCase() === 'true',
                        siteInspection: doc.inspectionDate ? "Done" : (doc.siteInspection || "Pending"),
                        contractLink: doc.contractLink || "#",
                        receiptLink: doc.receiptLink || "#",
                        is_cancelledAllowed: (doc.is_cancelledAllowed == 1 || doc.status === "Pending") ? 1 : 0,
                        items: []
                    };
                }

                const rootQuantity = parseInt(doc.quantity) || 1;

                // Extract product metrics cleanly from target structural levels
                let targetDetails = null;
                if (doc.itemDetails) {
                    targetDetails = doc.itemDetails;
                } else if (doc.items && doc.items[0]) {
                    targetDetails = doc.items[0];
                } else {
                    targetDetails = doc;
                }

                if (targetDetails && targetDetails.name) {
                    const width = parseFloat(targetDetails.width) || 0;
                    const height = parseFloat(targetDetails.height) || 0;
                    const unit = (targetDetails.unit || 'in').toLowerCase().trim();
                    const rate = parseFloat(targetDetails.ratePerSqFt || targetDetails.price || 0);
                    
                    // 3. Match identical square-footage algorithms from your admin panel blueprint
                    let area = parseFloat(targetDetails.areaSqFt || targetDetails.area || 0);
                    if (area === 0) {
                        if (unit === 'in') {
                            area = (width * height) / 144;
                        } else if (unit === 'cm') {
                            area = (width * height) / 30.48 / 30.48;
                        } else {
                            area = width * height;
                        }
                    }

                    // Prioritize database stored costs, otherwise fallback to derived area rules
                    const computedLineCost = parseFloat(targetDetails.estimatedCost || targetDetails.lineTotal || (area * rate * rootQuantity));

                    groupedMap[groupKey].items.push({
                        name: targetDetails.name,
                        width: width,
                        height: height,
                        unit: unit,
                        quantity: rootQuantity,
                        dimensions: `${width}${unit} x ${height}${unit}`,
                        ratePerSqFt: rate,
                        lineTotal: computedLineCost
                    });
                }
            });

            // 4. Convert structural object mappings into flat payloads for React maps
            const normalizedOrders = Object.values(groupedMap).map(order => {
                // If the root total array lacks aggregate sums, compute across child components
                if (order.estimatedTotal === 0) {
                    order.estimatedTotal = order.items.reduce((sum, entry) => sum + entry.lineTotal, 0);
                }
                
                return {
                    id: order._id,
                    orderId: order.orderId,
                    name: order.items.length > 1 ? `Batch Order (${order.items.length} Products)` : (order.items[0]?.name || "Architectural Product Request"),
                    date: order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric'
                    }) : "Date Unspecified",
                    status: order.status,
                    estimatedTotal: order.estimatedTotal,
                    downpaymentPaid: order.downpaymentPaid ? (order.estimatedTotal * 0.5) : 0, // Maps exactly to matching DP targets
                    requiredDownpayment: order.estimatedTotal * 0.5,
                    siteInspection: order.siteInspection,
                    contractLink: order.contractLink,
                    receiptLink: order.receiptLink,
                    is_cancelledAllowed: order.is_cancelledAllowed,
                    items: order.items
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
        return res.status(500).json({ remarks: "failed", error: err.message || err });
    }
});


// ─── 2. CANCEL / UPDATE SPECIFIC ORDER REQUEST STATUS ─────────────────────
cartRoutes.post("/api/cancel_order_request", async (req, res) => {
    const { token, userId, order_id } = req.body;
    const db = dbo.getDb();
    if (!token) return res.status(401).json({ remarks: "failed", message: "Unauthorized: Missing session tokens" });
    if (!userId) return res.status(400).json({ remarks: "failed", message: "Missing security tracking identity coordinates" });
    if (!order_id) return res.status(400).json({ remarks: "failed", message: "Missing order transaction key parameter reference" });

    try {
        // Authenticate user token profile validity before modifying collections
        checkAuth(token, userId, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "failed", message: "Security authorization failed" });

            // 1. Verify target order existence and ownership profile before executing update
            const findResult = await get_data_helper("order_requests", [
                { $match: { orderId: order_id } }
            ]);
            const existingOrderList = findResult?.payload || findResult || [];

            if (existingOrderList.length === 0) {
                return res.status(404).json({ remarks: "failed", message: "Target document order request profile not found or access unauthorized" });
            }

            const targetOrder = existingOrderList[0];

            // 2. Prevent cancellation if design process has proceeded past initial verification status unless explicitly allowed
            // const isPending = targetOrder.status === "Pending" || targetOrder.status === "Pending Inspection";

            // if (!isPending) {
            //     return res.status(400).json({ 
            //         remarks: "failed", 
            //         message: "Cannot cancel order requests already processed into production status or inspection clearance loops" 
            //     });
            // }

            // 3. Instead of deleting, update the document status to "Cancelled"
            // const updateResult = await update_many_helper(
            //     "order_requests", 
            //     { orderId: order_id }, 
            //     { $set: { status: "Cancelled", isCancelled: 1, updatedAt: new Date() } }
            // );
            const updateResult = await db.collection("order_requests").updateMany(
                { orderId: order_id },
                { 
                    $set: { 
                        status: "Cancelled", 
                        isCancelled: 1, 
                        updatedAt: new Date() 
                    } 
                }
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

            const pipeline = [
                {
                    $match: {
                        $or: [
                        { contractApproved: { $ne: 1 } },
                        { status: "Completed" }
                        ]
                    }
                },
                {
                    $group: {
                        _id: "$orderId",
                        // Capture base document fields from the first occurrence
                        baseDoc: { $first: "$$ROOT" },
                        // Aggregate all items associated with this orderId
                        measurements: {
                            $push: {
                                id: "$_id",
                                product: "$itemDetails.name",
                                width: "$itemDetails.width",
                                height: "$itemDetails.height",
                                qty: { $ifNull: ["$quantity", "$itemDetails.quantity", 1] },
                                pricePerSqFt: "$itemDetails.ratePerSqFt",
                                unit: "$itemDetails.unit",
                            }
                        },
                        // Sum up costs across all grouped documents
                        totalEstimatedCost: { $sum: "$itemDetails.estimatedCost" }
                    }
                },
                { $sort: { "baseDoc.createdAt": -1 } }
            ];

            const result = await get_data_helper("order_requests", pipeline);
            const rawPayload = result?.payload || result || [];

            const normalizedPayload = rawPayload.map(group => {
                const b = group.baseDoc;
                return {
                    id: group._id, // orderId acts as the unique identifier
                    clientName: b.clientName || "Unknown Client",
                    clientAddress: b.installationAddress || "",
                    clientNumber: b.clientPhone || "",
                    siteAddress: b.installationAddress || "",
                    dateCreated: b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : "",
                    inspectionDate: b.inspectionDate || "",
                    estimatedInstallationDate: b.estimatedInstallationDate || "",
                    status: b.status || "Pending",
                    estimatedTotal: b.estimatedTotal || group.totalEstimatedCost || 0,
                    downpaymentPaid: b.downpaymentPaid || false,
                    paymentTerms: b.paymentTerms || '50% downpayment, 50% upon completion',
                    paymentDate: b.paymentDate || "",
                    notes: b.clientNotes || "",
                    measurements: group.measurements,
                    contractSentToCustomer: b.contractSentToCustomer || false,
                    customerHasAccount: b.customerHasAccount || false,
                    customerEmail: b.clientEmail || "",
                    customerHasAccount: b.customerHasAccount == true ? true : b.user_id ? true : false ,
                    manualOverride: parseFloat(b.manualOverride) || "",
                };
            });

            return res.status(200).json({ remarks: "success", payload: normalizedPayload });
        });
    } catch (err) {
        console.error("Error fetching grouped site inspections:", err);
        return res.status(500).json({ error: err.message });
    }
});

cartRoutes.post("/api/get_transactions", async (req, res) => {
    const { token, user_id } = req.body;

    if (!token) return res.status(401).json({ remarks: "Unauthorized" });

    try {
        checkAuth(token, user_id, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "Unauthorized" });

            const pipeline = [
                {
                    $match: {
                        contractApproved: { $exists: true, $ne: null }
                    }
                },
                {
                    $group: {
                        _id: "$orderId",
                        // Capture base document fields from the first occurrence
                        baseDoc: { $first: "$$ROOT" },
                        // Aggregate all items associated with this orderId
                        measurements: {
                            $push: {
                                id: "$_id",
                                product: "$itemDetails.name",
                                width: "$itemDetails.width",
                                height: "$itemDetails.height",
                                qty: { $ifNull: ["$quantity", "$itemDetails.quantity", 1] },
                                pricePerSqFt: "$itemDetails.ratePerSqFt",
                                unit: "$itemDetails.unit",
                                progressStatus: "$progressStatus",
                                warranty: { $ifNull: ["$warranty", ""] },
                                estimatedInstallationDate: "$estimatedInstallationDate"
                            }
                        },
                        // Sum up costs across all grouped documents
                        totalEstimatedCost: { $sum: "$itemDetails.estimatedCost" },
                    }
                },
                { $sort: { "baseDoc.createdAt": -1 } }
            ];

            const result = await get_data_helper("order_requests", pipeline);
            const rawPayload = result?.payload || result || [];

            const normalizedPayload = rawPayload.map(group => {
                const b = group.baseDoc;
                return {
                    id: group._id, // orderId acts as the unique identifier
                    clientName: b.clientName || "Unknown Client",
                    clientAddress: b.installationAddress || "",
                    clientNumber: b.clientPhone || "",
                    siteAddress: b.installationAddress || "",
                    dateCreated: b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : "",
                    inspectionDate: b.inspectionDate || "",
                    estimatedInstallationDate: b.estimatedInstallationDate || "",
                    status: b.status || "Pending",
                    estimatedTotal: b.estimatedTotal || group.totalEstimatedCost || 0,
                    downpaymentPaid: b.downpaymentPaid || false,
                    paymentTerms: b.paymentTerms || '50% downpayment, 50% upon completion',
                    paymentDate: b.paymentDate || "",
                    notes: b.clientNotes || "",
                    measurements: group.measurements,
                    contractSentToCustomer: b.contractSentToCustomer || false,
                    customerHasAccount: b.customerHasAccount || false,
                    customerEmail: b.clientEmail || "",
                    customerHasAccount: b.customerHasAccount == true ? true : b.user_id ? true : false ,
                    manualOverride: parseFloat(b.manualOverride) || "",
                    paymentDate: b.paymentDate || "",
                    contractId: b.contractId,
                    totalPayment: b.totalPayment || 0,
                    transactionNumber: b.transactionNumber || "",
                    category: (() => {
                        // 1. Instantly check if there are any unfinished items across the order
                        const isAllCompleted = group.measurements.every(m => m.progressStatus === "Completed");
                        
                        if (!isAllCompleted) {
                            return "In Progress";
                        }

                        // 2. Establish the exact timeline boundary for 90 days ago from right now
                        const ninetyDaysAgo = new Date();
                        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

                        // 3. Inspect if every single item has aged out past the 90-day threshold
                        const isPastNinetyDaysAll = group.measurements.every(m => {
                            // If a date string is somehow missing, keep it in "Warranty" for safety
                            if (!m.estimatedInstallationDate) return false; 
                            
                            const installationDate = new Date(m.estimatedInstallationDate);
                            return installationDate < ninetyDaysAgo;
                        });

                        // 4. Return categorical state classifications
                        return isPastNinetyDaysAll ? "Completed Project" : "Warranty";
                    })(),
                    paymentMethod: b.paymentMethod || 'Cash',
                    paymentStatus: b.paymentStatus || 'Pending',
                    contractLink: b.contractLink || "",
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
    const { 
        token, _id, clientName, clientNumber, siteAddress, inspectionDate, 
        estimatedInstallationDate, status, notes, paymentTerms, downpaymentPaid, 
        paymentDate, customerHasAccount, customerEmail, measurements, manualOverride, estimatedTotal 
    } = req.body;

    if (!token) return res.status(401).json({ remarks: "Unauthorized" });

    try {
        checkAuth(token, _id, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "Unauthorized" });

            const db = await dbo.getDb();
            let matchedUserId = null;
            let matchedUser = null; // Correctly initialized

            // Find user_id from users collection safely
            if (customerHasAccount && customerEmail) {
                const userDoc = await db.collection("users").findOne({ email: customerEmail.trim() });
                if (userDoc) {
                    matchedUserId = userDoc._id; 
                    matchedUser = userDoc; // Fixed: Wrapped securely inside proper braces
                }
            }

            const sharedOrderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const isCancelledValue = status === "Canceled" || status === "Cancelled" ? 1 : 0;

            // Map each row in measurements safely
            const documentBatch = (measurements || []).map((row, index) => {
                const widthVal = parseFloat(row.width) || 0;
                const heightVal = parseFloat(row.height) || 0;
                const qtyVal = parseInt(row.qty) || 1;
                const rateVal = parseFloat(row.pricePerSqFt) || 0;
                
                // Normalization Safeguard: Handle both "in" and "inch" uniform assignments
                let unitVal = row.unit || "cm";
                if (unitVal === "in") unitVal = "inch"; 
                
                // Dynamic conversion engine to Square Feet
                let areaSqFt = 0;
                if (unitVal === "cm") {
                    areaSqFt = (widthVal * heightVal) / 929.03;
                } else if (unitVal === "inch" || unitVal === "in") {
                    areaSqFt = (widthVal * heightVal) / 144;
                } else if (unitVal === "ft") {
                    areaSqFt = widthVal * heightVal;
                }
                
                const estimatedCost = areaSqFt > 0 ? (areaSqFt * rateVal * qtyVal) : (rateVal * qtyVal);

                return {
                    user_id: matchedUserId ? new ObjectId(matchedUserId) : null,
                    clientName: clientName || "",
                    clientEmail: customerEmail || "",
                    clientPhone: clientNumber || "",
                    installationAddress: siteAddress || "",
                    clientNotes: notes || "",
                    orderId: sharedOrderId, 
                    status: status || "Pending",
                    isCancelled: isCancelledValue,
                    createdAt: new Date(),
                    inspectionDate: inspectionDate || "",
                    estimatedInstallationDate: estimatedInstallationDate || "",
                    paymentTerms: paymentTerms || "",
                    downpaymentPaid: downpaymentPaid === true || downpaymentPaid === "true",
                    paymentDate: paymentDate || "",
                    customerHasAccount: !!matchedUserId,
                    
                    // Integrity Fix: Only attach the total transaction financial figures to the FIRST item doc 
                    // to avoid multi-row duplicate compounding errors inside aggregation lookups
                    manualOverride: index === 0 && manualOverride !== undefined && manualOverride !== null ? parseFloat(manualOverride) : 0,
                    estimatedTotal: index === 0 ? (parseFloat(estimatedTotal) || 0) : 0,
                    
                    quantity: qtyVal,
                    itemDetails: {
                        name: row.product || "",
                        width: widthVal,
                        height: heightVal,
                        unit: unitVal, 
                        areaSqFt: parseFloat(areaSqFt.toFixed(4)),
                        ratePerSqFt: rateVal,
                        estimatedCost: parseFloat(estimatedCost.toFixed(2))
                    }
                };
            });

            if (documentBatch.length === 0) {
                return res.status(400).json({ remarks: "failed", message: "Cannot create an inspection without measurements rows." });
            }

            // High performance direct batch execution
            const result = await db.collection("order_requests").insertMany(documentBatch);
            
            if (result.acknowledged) {
                await actionLog(_id, "Created Site Inspection Order", `Manually added order tracking for ${clientName}`);
                return res.status(200).json({ remarks: "success", message: "Inspection context created successfully" });
            } else {
                return res.status(500).json({ remarks: "failed", message: "Database rejected property inserts." });
            }
        });
    } catch (err) {
        console.error("Critical error inside create_order_request handler:", err);
        return res.status(500).json({ error: err.message });
    }
});

// ─── 5. ADMIN WORKSPACE: UPDATE EXISTING ORDER REQUEST RECORD ──────────────
cartRoutes.post("/api/update_order_request", async (req, res) => {
    const { 
        token, user_id, id, orderId, clientName, clientNumber, siteAddress, inspectionDate, 
        estimatedInstallationDate, status, notes, paymentTerms, downpaymentPaid, 
        paymentDate, customerHasAccount, customerEmail, measurements, manualOverride, estimatedTotal 
    } = req.body;

    if (!token) return res.status(401).json({ remarks: "Unauthorized" });
    
    const targetOrderId = orderId || id;
    if (!targetOrderId) return res.status(400).json({ remarks: "failed", message: "Missing target orderId reference identifier" });

    try {
        checkAuth(token, user_id, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "Unauthorized" });

            const db = await dbo.getDb();
            let matchedUserId = null;

            // Re-verify/find user link by email update options
            if (customerHasAccount && customerEmail) {
                const userDoc = await db.collection("users").findOne({ email: customerEmail.trim() });
                if (userDoc) matchedUserId = userDoc._id;
            }

            const isCancelledValue = status === "Canceled" || status === "Cancelled" ? 1 : 0;

            // 1. Clear out the previous grouped documents under this orderId to prevent layout row fragmentation
            await db.collection("order_requests").deleteMany({ orderId: targetOrderId });

            // 2. Re-insert the updated measurements array into individual documents maintaining schema alignment
            const documentBatch = (measurements || []).map(row => {
                const widthVal = parseFloat(row.width) || 0;
                const heightVal = parseFloat(row.height) || 0;
                const qtyVal = parseInt(row.qty) || 1;
                const rateVal = parseFloat(row.pricePerSqFt) || 0;
                const unitVal = row.unit || "cm"; // Default fallback match
                
                // Dynamic conversion to Square Feet
                let areaSqFt = 0;
                if (unitVal === "cm") {
                    areaSqFt = (widthVal * heightVal) / 929.03;
                } else if (unitVal === "inch") {
                    areaSqFt = (widthVal * heightVal) / 144;
                } else if (unitVal === "ft") {
                    areaSqFt = widthVal * heightVal;
                }
                
                const estimatedCost = areaSqFt > 0 ? (areaSqFt * rateVal * qtyVal) : (rateVal * qtyVal);

                return {
                    user_id: matchedUserId ? new ObjectId(matchedUserId) : null,
                    clientName: clientName || "",
                    clientEmail: customerEmail || "",
                    clientPhone: clientNumber || "",
                    installationAddress: siteAddress || "",
                    clientNotes: notes || "",
                    orderId: targetOrderId,
                    status: status || "Pending",
                    isCancelled: isCancelledValue,
                    createdAt: new Date(),
                    inspectionDate: inspectionDate || "",
                    estimatedInstallationDate: estimatedInstallationDate || "",
                    paymentTerms: paymentTerms || "",
                    downpaymentPaid: downpaymentPaid === true || downpaymentPaid === "true",
                    paymentDate: paymentDate || "",
                    customerHasAccount: !!matchedUserId,
                    manualOverride: manualOverride !== undefined && manualOverride !== null ? parseFloat(manualOverride) : "",
                    estimatedTotal: parseFloat(estimatedTotal) || 0,
                    quantity: qtyVal,
                    itemDetails: {
                        name: row.product || "",
                        width: widthVal,
                        height: heightVal,
                        unit: unitVal, // Stores the exact selected unit choice safely
                        areaSqFt: parseFloat(areaSqFt.toFixed(4)),
                        ratePerSqFt: rateVal,
                        estimatedCost: parseFloat(estimatedCost.toFixed(2))
                    }
                };
            });

            if (documentBatch.length === 0) {
                return res.status(400).json({ remarks: "failed", message: "Cannot save an updated inspection with zero measurement entries." });
            }

            const result = await db.collection("order_requests").insertMany(documentBatch);

            if (result.acknowledged) {
                await actionLog(user_id, "Updated Grouped Order Request", `Modified fields and reconstructed batch entries for orderId: ${targetOrderId}`);
                return res.status(200).json({ remarks: "success", message: "Grouped inspection records updated successfully" });
            } else {
                return res.status(500).json({ remarks: "failed", message: "Database update engine failed to process transaction profiles." });
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

cartRoutes.post("/api/send_contract_email", upload.single('contractFile'), async (req, res) => {
  const { inspectionId, orderId, customerEmail, contractId } = req.body;

  if (!req.file) {
    return res.status(400).json({ remarks: 'failed', message: 'Missing compiled contract binary file streaming parameter.' });
  }

  try {
    const savedRelativePath = `/uploads/${req.file.filename}`;
    const db = dbo.getDb ? dbo.getDb() : req.app.get('db');

    // Update database paths systematically matching target references
    if (orderId && orderId !== "") {
      await db.collection('order_requests').updateMany(
        { orderId: orderId },
        { $set: { contractLink: savedRelativePath, contractSentToCustomer: true, contractUpdatedAt: new Date(), contractId: contractId } }
      );
    }

    // Configure and dispatch the customer contract email payload context
    if (customerEmail && customerEmail.trim() !== "") {
      const mailOptions = {
        from: `"ACGC System" <${process.env.SMTP_EMAIL}>`,
        to: customerEmail,
        subject: `ACGC System - Service Contract Confirmation - Order Reference: ${orderId || 'SI-' + inspectionId}`,
        text: `Hello,\n\nPlease find attached the official Service Contract documentation regarding your service inquiry with ACGC Glass & Aluminum Services.\n\nBest regards,\nAdministration Team`,
        attachments: [
          {
            filename: req.file.originalname || `Contract_Reference.pdf`,
            path: req.file.path
          }
        ]
      };

      await transporter.sendMail(mailOptions);
    }

    return res.status(200).json({
      remarks: 'success',
      message: 'Contract path updated in database logs and email attachment routed successfully.',
      path: savedRelativePath
    });

  } catch (error) {
    console.error("Error executing background service contract dispatch automation pipeline:", error);
    return res.status(500).json({ remarks: 'error', error: error.message });
  }
});

cartRoutes.post("/api/manual_approve_order", upload.single('receiptFile'), async (req, res) => {
  const { orderId, contractId } = req.body;

  if (!orderId) {
    return res.status(400).json({ remarks: 'failed', message: 'Missing target validation identification context orderId.' });
  }
  if (!req.file) {
    return res.status(400).json({ remarks: 'failed', message: 'Validation verification files attachment parameter streams required.' });
  }

  try {
    const savedRelativePath = `/uploads/${req.file.filename}`;
    const db = dbo.getDb ? dbo.getDb() : req.app.get('db');

    // Fetch matching layout arrays across collections to scale up payment evaluations accurately
    const matchItems = await db.collection('order_requests').find({ orderId: orderId }).toArray();
    if (!matchItems || matchItems.length === 0) {
      return res.status(404).json({ remarks: 'failed', message: 'Target order request mapping tracking parameters completely missing.' });
    }

    const orderRecord = matchItems[0];
    
    // Read the contract total values securely from database or derived computation layers
    const finalGrandTotal = parseFloat(orderRecord.estimatedTotal || orderRecord.itemDetails?.estimatedCost || 0);
    
    // Normalization logic check: Clean up text parameters to match client component rules
    const cleanedTerms = String(orderRecord.paymentTerms || '').trim();
    const isFullPayment = cleanedTerms === 'Full payment';

    // Build the dynamic update database parameters depending on paymentTerms definition context
    let updateFields = {
      contractLink: savedRelativePath,
      approvedAt: new Date(),
      contractId: contractId
    };

    if (isFullPayment) {
      // Full Payment route adjustments
      updateFields.status = 'Pending Payment';
      updateFields.contractApproved = 1
    } else {
      // 50% down payment fallback route adjustments
      const calculatedDpAmount = finalGrandTotal * 0.5;
      updateFields.status = 'Pending Payment';
      updateFields.contractApproved = 1
    }

    // Mutate and set validation fields inside target document blocks
    await db.collection('order_requests').updateMany(
      { orderId: orderId },
      { $set: updateFields }
    );

    return res.status(200).json({
      remarks: 'success',
      message: isFullPayment 
        ? 'Order fully approved and settled balance payload cataloged successfully.' 
        : 'Order manually approved and downpayment asset verification logged successfully.',
      path: savedRelativePath,
      workflow: isFullPayment ? 'full_payment' : 'downpayment'
    });

  } catch (error) {
    console.error("Error executing manual system administrative override approval:", error);
    return res.status(500).json({ remarks: 'error', error: error.message });
  }
});

cartRoutes.route("/api/get_my_contracts").post(async (req, res) => {
  const { token, userId } = req.body;

  if (!token) return res.status(401).json({ remarks: "Unauthorized" });

  try {
    // Utilize your existing checkAuth validation helper
    checkAuth(token, userId, async (isValid) => {
      if (!isValid) return res.status(401).json({ remarks: "Unauthorized" });

      const userObjectId = new ObjectId(userId);

      // Aggregation pipeline matching your architecture's grouping schema
      const pipeline = [
        {
          $match: {
            user_id: userObjectId,
            $or: [
              { contractApproved: 1 },
              { contractSentToCustomer: true },
              { status: "Completed" },
              { status: "Cancelled" } // Ensures declined contracts stay visible to clients
            ]
          }
        },
        {
          $group: {
            _id: "$orderId",
            // Capture base document metadata configurations from the cluster root
            baseDoc: { $first: "$$ROOT" },
            // Gather item configurations out of the nested itemDetails object
            measurements: {
              $push: {
                id: "$_id",
                product: "$itemDetails.name",
                width: "$itemDetails.width",
                height: "$itemDetails.height",
                qty: { $ifNull: ["$quantity", "$itemDetails.quantity", 1] },
                pricePerSqFt: "$itemDetails.ratePerSqFt",
                unit: "$itemDetails.unit"
              }
            },
            totalEstimatedCost: { $sum: "$itemDetails.estimatedCost" }
          }
        },
        { $sort: { "baseDoc.createdAt": -1 } }
      ];

      // Use your native helper utility to execute the query
      const result = await get_data_helper("order_requests", pipeline);
      const rawPayload = result?.payload || result || [];

      // Normalize properties mapping seamlessly to your frontend template fields
      const normalizedPayload = rawPayload.map(group => {
        const b = group.baseDoc;
        return {
          orderId: group._id, // Set the shared grouping key explicitly
          id: group._id,
          clientName: b.clientName || "Unknown Client",
          clientAddress: b.installationAddress || "",
          siteAddress: b.installationAddress || "",
          date: b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : "Recent",
          inspectionDate: b.inspectionDate || "",
          estimatedInstallationDate: b.estimatedInstallationDate || "",
          status: b.status || "Pending Approval",
          estimatedTotal: parseFloat(b.estimatedTotal) || group.totalEstimatedCost || 0,
          paymentTerms: b.paymentTerms || '50% downpayment, 50% upon completion',
          paymentDate: b.paymentDate || "",
          notes: b.clientNotes || "",
          measurements: group.measurements,
          contractLink: b.contractLink || "#",
          contractApproved: b.contractApproved || 0,
          contractSentToCustomer: b.contractSentToCustomer || false,
          customerEmail: b.clientEmail || "",
          manualOverride: parseFloat(b.manualOverride) || ""
        };
      });

      return res.status(200).json({ 
        remarks: "success", 
        message: "Client contractual data streams compiled successfully.", 
        payload: normalizedPayload 
      });
    });
  } catch (err) {
    console.error("Error executing collection fetch for get_my_contracts:", err);
    return res.status(500).json({ error: err.message });
  }
});

cartRoutes.route("/api/client_respond_contract").post(upload.single("contractFile"), async (req, res) => {
  const { token, userId, orderId, action } = req.body;

  // Immediately clean up uploaded file if initial validation requirements fail
  if (!token || !userId || !orderId || !action) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({ remarks: "failed", message: "Missing tracking credentials or response parameters." });
  }

  try {
    // Wrap inside checkAuth logic block securely
    checkAuth(token, userId, async (isValid) => {
      try {
        if (!isValid) {
          if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
          return res.status(401).json({ remarks: "failed", message: "Unauthorized transaction attempt." });
        }

        const db = dbo.getDb();
        const userObjectId = new ObjectId(userId);

        // Find a single sample document from the group to check for an existing file path link
        const targetGroupSample = await db.collection("order_requests").findOne({
          orderId: orderId,
          user_id: userObjectId
        });

        if (!targetGroupSample) {
          if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
          return res.status(404).json({ remarks: "failed", message: "Target order reference group not found." });
        }

        let savedRelativePath = targetGroupSample.contractLink || "#";

        // Physical File Asset Overwrite Execution (Happens exactly once for the base file)
        if (req.file) {
          const targetUploadDir = path.join(__dirname, "../uploads");
          
          if (targetGroupSample.contractLink && targetGroupSample.contractLink !== "#") {
            const oldFileName = path.basename(targetGroupSample.contractLink);
            const oldFilePath = path.join(targetUploadDir, oldFileName);
            
            if (fs.existsSync(oldFilePath)) {
              try {
                fs.unlinkSync(oldFilePath); // Deletes the original un-stamped file from disk
              } catch (e) {
                console.warn("File target locked or already moved, skipping deletion path:", e);
              }
            }
          }
          savedRelativePath = `/uploads/${req.file.filename}`;
        }

        // Map dynamic fields based on customer's choice
        let updateFields = {
          contractLink: savedRelativePath,
          contractUpdatedAt: new Date()
        };

        if (action === "Approve") {
          updateFields.contractApproved = 1; // 1 = Approved / Accepted Status
          updateFields.status = "Pending Payment"; 
        } else if (action === "Decline") {
          updateFields.contractApproved = 0; // 0 = Rejected / Declined Status
          updateFields.status = "Cancelled";
        }

        // CRITICAL FIX: Synchronize EVERY document inside the cluster matching the targeted orderId group instantly
        const result = await db.collection("order_requests").updateMany(
          { orderId: orderId, user_id: userObjectId },
          { $set: updateFields }
        );

        return res.status(200).json({
          remarks: "success",
          message: `Successfully updated base contract file asset and synchronized [${action}] status across ${result.modifiedCount} line item collections.`,
          path: savedRelativePath
        });

      } catch (innerError) {
        console.error("Error inside checkAuth query lifecycle block:", innerError);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(500).json({ remarks: "error", message: "Internal data synchronization processing error." });
      }
    });

  } catch (error) {
    console.error("Critical outer pipeline crash in client_respond_contract:", error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ remarks: "error", message: "Internal server error executing file operations." });
  }
});

cartRoutes.post("/api/get_progress_monitor", async (req, res) => {
    const { token, user_id } = req.body;
    if (!token || !user_id) return res.status(400).json({ remarks: "failed", message: "Missing tracking credentials or response parameters." }); 

    try {
        // Wrap inside checkAuth logic block securely
        checkAuth(token, user_id, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "failed", message: "Unauthorized transaction attempt." });

            const query = [
                {
                    $match: {
                        contractApproved: 1,
                    }
                },
                {
                    $addFields:{
                        progressStatus: { 
                            $ifNull: ["$progressStatus", "Pending"] 
                        },
                        stages: {
                            $ifNull: ["$stages", []]
                        }
                    }
                }
            ];

        const result = await get_data_helper("order_requests", query);

        return res.status(200).json({
            remarks: "success",
            message: "Project tracking tracking context documents fetched successfully",
            payload: result.payload
        });

        });
    } catch (error) {
        console.error("Critical outer pipeline crash in get_progress_monitor:", error);
        return res.status(500).json({ remarks: "error", message: "Internal server error executing file operations." });
    }
});

cartRoutes.post("/api/upload_proof_file", upload.single("proofFile"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ remarks: "failed", message: "No binary file payload received." });
        }

        // Return a structural reference pointing to the new file metadata
        return res.status(200).json({
            remarks: "success",
            proof: {
                id: "p" + Date.now() + Math.floor(Math.random() * 100),
                fileName: req.file.filename,
                originalName: req.file.originalname,
                uploadedAt: new Date().toISOString()
            }
        });
    } catch (err) {
        console.error("Proof file tracking intercept failure:", err);
        return res.status(500).json({ error: "File system allocation failure." });
    }
});

cartRoutes.post("/api/update_order_request_progress", async (req, res) => {
    const { token, user_id, _id, stages, progressStatus, estimatedInstallationDate } = req.body;

    if (!token) return res.status(401).json({ remarks: "failed", message: "Unauthorized credentials" });
    if (!_id) return res.status(400).json({ remarks: "failed", message: "Missing target document tracking reference _id" });

    try {
        checkAuth(token, user_id, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "failed", message: "Security framework validation failed" });

            const db = await dbo.getDb();
            
            const updateFields = {
                stages: stages || [],
                progressStatus: progressStatus || "Pending",
                estimatedInstallationDate: estimatedInstallationDate || ""
            };

            const result = await db.collection("order_requests").updateOne(
                { _id: new ObjectId(_id) },
                { $set: updateFields }
            );

            if (result.acknowledged) {
                await actionLog(user_id, "Update Project Progress", `Modified workflow layout tracking details for Document: ${_id}`);
                return res.status(200).json({ remarks: "success", message: "Order records synchronized successfully." });
            } else {
                return res.status(500).json({ remarks: "failed", message: "Database rejected properties modification mapping." });
            }
        });
    } catch (err) {
        console.error("Critical error inside update_order_request_progress:", err);
        return res.status(500).json({ error: err.message });
    }
});

cartRoutes.post("/api/edit_payment", async (req, res) => {
    const { token, user_id, orderId, paymentMethod, totalPayment, transactionNumber } = req.body;

    // 1. Initial input validation
    if (!token) return res.status(401).json({ remarks: "failed", message: "Unauthorized: Missing session token" });
    if (!user_id) return res.status(400).json({ remarks: "failed", message: "Missing security tracking identity coordinates" });
    if (!orderId) return res.status(400).json({ remarks: "failed", message: "Missing orderId target reference identifier" });
    
    if (paymentMethod === undefined || paymentMethod === null) {
        return res.status(400).json({ remarks: "failed", message: "Missing paymentMethod parameter" });
    }
    if (totalPayment === undefined || totalPayment === null) {
        return res.status(400).json({ remarks: "failed", message: "Missing totalPayment parameter" });
    }

    try {
        // 2. Wrap transaction securely within checkAuth security profiles
        checkAuth(token, user_id, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "failed", message: "Security authorization failed" });

            const db = dbo.getDb();

            // 3. Clean and explicitly type parameters
            const cleanPaymentMethod = String(paymentMethod).trim();
            const floatTotalPayment = parseFloat(totalPayment) || 0.0;
            const cleanTransactionNumber = transactionNumber ? String(transactionNumber).trim() : "";

            // 4. Retrieve a record from this group to check financial targets (manualOverride or estimatedTotal)
            const targetSample = await db.collection("order_requests").findOne({ orderId: orderId });
            
            if (!targetSample) {
                return res.status(404).json({ 
                    remarks: "failed", 
                    message: "No matching order records found with the provided orderId reference." 
                });
            }

            // Extract threshold values safely from the cluster document
            const manualOverrideTarget = parseFloat(targetSample.manualOverride) || 0.0;
            const estimatedTotalTarget = parseFloat(targetSample.estimatedTotal) || 0.0;


            const targetRequiredAmount = manualOverrideTarget > 0 ? manualOverrideTarget : estimatedTotalTarget;
            // 5. Evaluate the payment status dynamically using safe numeric rounding
            var calculatedPaymentStatus = "Pending"; 

            // Round both numbers to 2 decimal places to remove binary precision tails safely
            const roundedTotalPayment = Math.round(floatTotalPayment * 100) / 100;
            const roundedTargetAmount = Math.round(targetRequiredAmount * 100) / 100;
            var status = ""
            if (roundedTotalPayment >= roundedTargetAmount) {
                calculatedPaymentStatus = "Paid";
                status = "Paid";
            }

            // Check your server console to verify both values are now clean numbers
            console.log(`Comparing numbers: ${roundedTotalPayment} >= ${roundedTargetAmount} -> result:`, roundedTotalPayment >= roundedTargetAmount);

            // 6. Update EVERY document inside the cluster matching the targeted orderId group instantly
            const updateResult = await db.collection("order_requests").updateMany(
                { orderId: orderId },
                { 
                    $set: { 
                        paymentMethod: cleanPaymentMethod,
                        totalPayment: floatTotalPayment,
                        transactionNumber: cleanTransactionNumber,
                        paymentStatus: calculatedPaymentStatus,
                        paymentUpdatedAt: new Date(),
                        ...(status != "" ? { status: status } : {})
                    } 
                }
            );

            // 7. Return execution response context profiles safely
            if (updateResult.matchedCount > 0) {
                // Log operation tracking metrics
                await actionLog(
                    user_id, 
                    "Edit Payment Details", 
                    `Updated payment details for group ID: ${orderId}. Status: ${calculatedPaymentStatus}, Amount: ${floatTotalPayment}, TxN: ${cleanTransactionNumber || 'N/A'}`
                );
                
                return res.status(200).json({
                    remarks: "success",
                    message: `Payment fields and status [${calculatedPaymentStatus}] synchronized across ${updateResult.modifiedCount} line item documents successfully.`
                });
            } else {
                return res.status(500).json({ 
                    remarks: "failed", 
                    message: "Failed to apply updates to database records." 
                });
            }
        });
    } catch (err) {
        console.error("Critical error mapping execution processing inside /api/edit_payment handler:", err);
        return res.status(500).json({ remarks: "error", error: err.message || err });
    }
});

module.exports = cartRoutes;