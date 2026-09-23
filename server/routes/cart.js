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
const { pushNotification } = require("./notification");

const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper function to stream memory buffers directly to Cloudinary
const uploadToCloudinary = (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

// Configure file upload storage options for disk storage (old legacy flow)
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

// Configure file upload storage for Cloudinary streaming (in-memory buffer)
const memoryStorage = multer.memoryStorage();
const memoryUpload = multer({ storage: memoryStorage });

const { BrevoClient } = require("@getbrevo/brevo");

const brevo = new BrevoClient({
    apiKey: process.env.BREVO_API_KEY
});

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

                const finalQuantity = parseInt(quantity) || 1;

                const widthVal = width !== "" && width !== undefined ? parseFloat(width) : (parseFloat(productData.width) || 0);
                const heightVal = height !== "" && height !== undefined ? parseFloat(height) : (parseFloat(productData.height) || 0);
                
                const unitVal = width !== "" && width !== undefined ? (unit || "in") : (productData.unit || "in");

                let areaSqFt = 0;
                const ratePerSqFt = parseFloat(productData.pricePerSqFt) || parseFloat(productData.price) || 0;
                
                if (unitVal === "cm") {
                    areaSqFt = (widthVal * heightVal) / 929.03;
                } else if (unitVal === "m") {
                    areaSqFt = (widthVal * 3.28084) * (heightVal * 3.28084);
                } else if (unitVal === "in") {
                    areaSqFt = (widthVal / 12) * (heightVal / 12);
                } else {
                    areaSqFt = widthVal * heightVal;
                }
                
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
                        estimatedCost: parseFloat(totalEstimatedCost.toFixed(2))
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
            
            let areaSqFt = 0;
            if (finalUnit === "cm") {
                areaSqFt = (finalWidth * finalHeight) / 929.03;
            } else if (finalUnit === "in" || finalUnit === "inch") {
                areaSqFt = (finalWidth * finalHeight) / 144;
            } else if (finalUnit === "m") {
                areaSqFt = (finalWidth * 3.28084) * (finalHeight * 3.28084);
            } else if (finalUnit === "ft") {
                areaSqFt = finalWidth * finalHeight;
            } else {
                areaSqFt = parseFloat(product.areaSqFt) || 0;
            }

            const rate = parseFloat(product.pricePerSqFt) || parseFloat(product.price) || 0;
            const finalQuantity = parseInt(quantity) || 1;
            
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
                    areaSqFt: parseFloat(areaSqFt.toFixed(4)),
                    ratePerSqFt: rate,
                    estimatedCost: parseFloat(dynamicEstimatedCost.toFixed(2))
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

cartRoutes.post("/api/get_my_orders", async (req, res) => {
    const { token, userId } = req.body;

    if (!token) return res.status(401).json({ remarks: "failed", message: "Unauthorized: Missing identity token" });
    if (!userId) return res.status(400).json({ remarks: "failed", message: "Missing tracking identification user properties" });

    try {
        checkAuth(token, userId, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "failed", message: "Security authentication failed" });

            const ordersResult = await get_data_helper("order_requests", [
                { $match: { user_id: new ObjectId(userId), isCancelled: 0 } },
                { $sort: { createdAt: -1 } },
            ]);

            const rawOrdersList = ordersResult?.payload || ordersResult || [];

            const groupedMap = {};

            rawOrdersList.forEach(doc => {
                const groupKey = doc.orderId || (doc._id ? doc._id.toString() : "unassigned");

                if (!groupedMap[groupKey]) {
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
                        paymentProofLink: doc.paymentProofLink || null,
                        paymentNotifiedByCustomer: !!doc.paymentNotifiedByCustomer,
                        declaredPaymentAmount: parseFloat(doc.declaredPaymentAmount) || 0,
                        lastDeclaredAmount: parseFloat(doc.lastDeclaredAmount) || 0,
                        lastConfirmedIncrement: parseFloat(doc.lastConfirmedIncrement) || 0,
                        lastPaymentMatchedDeclaration: typeof doc.lastPaymentMatchedDeclaration === 'boolean' ? doc.lastPaymentMatchedDeclaration : null,
                        totalPayment: parseFloat(doc.totalPayment) || 0,
                        paymentTerms: doc.paymentTerms || '',
                        manualOverride: parseFloat(doc.manualOverride) || 0,
                        installationCompleted: true,
                        items: []
                    };
                }
                if (doc.progressStatus !== "Completed") {
                    groupedMap[groupKey].installationCompleted = false;
                }

                const rootQuantity = parseInt(doc.quantity) || 1;

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

            const normalizedOrders = Object.values(groupedMap).map(order => {
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
                    downpaymentPaid: order.downpaymentPaid ? (order.estimatedTotal * 0.5) : 0,
                    requiredDownpayment: order.estimatedTotal * 0.5,
                    siteInspection: order.siteInspection,
                    contractLink: order.contractLink,
                    receiptLink: order.receiptLink,
                    is_cancelledAllowed: order.is_cancelledAllowed,
                    paymentProofLink: order.paymentProofLink,
                    paymentNotifiedByCustomer: order.paymentNotifiedByCustomer,
                    declaredPaymentAmount: order.declaredPaymentAmount,
                    lastDeclaredAmount: order.lastDeclaredAmount,
                    lastConfirmedIncrement: order.lastConfirmedIncrement,
                    lastPaymentMatchedDeclaration: order.lastPaymentMatchedDeclaration,
                    totalPayment: order.totalPayment,
                    paymentTerms: order.paymentTerms,
                    manualOverride: order.manualOverride,
                    installationCompleted: order.installationCompleted,
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

cartRoutes.post("/api/cancel_order_request", async (req, res) => {
    const { token, userId, order_id } = req.body;
    const db = await dbo.getDb();
    if (!token) return res.status(401).json({ remarks: "failed", message: "Unauthorized: Missing session tokens" });
    if (!userId) return res.status(400).json({ remarks: "failed", message: "Missing security tracking identity coordinates" });
    if (!order_id) return res.status(400).json({ remarks: "failed", message: "Missing order transaction key parameter reference" });

    try {
        checkAuth(token, userId, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "failed", message: "Security authorization failed" });

            const findResult = await get_data_helper("order_requests", [
                { $match: { orderId: order_id } }
            ]);
            const existingOrderList = findResult?.payload || findResult || [];

            if (existingOrderList.length === 0) {
                return res.status(404).json({ remarks: "failed", message: "Target document order request profile not found or access unauthorized" });
            }

            const targetOrder = existingOrderList[0];

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
            { $match: { orderId: orderId } }
        ]);

        const rawList = result?.payload || result || [];

        if (!Array.isArray(rawList) || rawList.length === 0) {
            return res.status(404).json({ 
                remarks: "failed", 
                message: "No matching project tracking code discovered record match." 
            });
        }

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
                        baseDoc: { $first: "$$ROOT" },
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
                    id: group._id,
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
                    ...(b.warrantyDays !== undefined && b.warrantyDays !== null ? { warrantyDays: b.warrantyDays } : {}),
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
                        $or: [
                            { contractApproved: { $exists: true, $ne: null } },
                            { totalPayment: { $gt: 0 } },
                            { downpaymentPaid: true },
                            { contractSentToCustomer: true },
                            { contractLink: { $exists: true, $nin: [null, "", "#"] } }
                        ]
                    }
                },
                {
                    $group: {
                        _id: "$orderId",
                        baseDoc: { $first: "$$ROOT" },
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
                    id: group._id,
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
                    ...(b.warrantyDays !== undefined && b.warrantyDays !== null ? { warrantyDays: b.warrantyDays } : {}),
                    paymentDate: b.paymentDate || "",
                    contractId: b.contractId,
                    totalPayment: b.totalPayment || 0,
                    transactionNumber: b.transactionNumber || "",
                    category: (() => {
                        const grandTotalForCat = parseFloat(b.manualOverride) || parseFloat(b.estimatedTotal) || group.totalEstimatedCost || 0;
                        const paidForCat = parseFloat(b.totalPayment) || 0;
                        const isFullyPaidForCat = grandTotalForCat > 0 && paidForCat >= grandTotalForCat;
                        if (isFullyPaidForCat) {
                            return "Completed Project";
                        }

                        const isAllCompleted = group.measurements.every(m => m.progressStatus === "Completed");
                        
                        if (!isAllCompleted) {
                            return "In Progress";
                        }

                        const hasExplicitWarrantyDaysForCat = b.warrantyDays !== undefined && b.warrantyDays !== null && b.warrantyDays !== '';
                        const warrantyDaysForCat = hasExplicitWarrantyDaysForCat ? Number(b.warrantyDays) : 90;
                        const warrantyCutoffDate = new Date();
                        warrantyCutoffDate.setDate(warrantyCutoffDate.getDate() - warrantyDaysForCat);

                        const isPastWarrantyAll = group.measurements.every(m => {
                            if (!m.estimatedInstallationDate) return false; 
                            
                            const installationDate = new Date(m.estimatedInstallationDate);
                            return installationDate < warrantyCutoffDate;
                        });

                        return isPastWarrantyAll ? "Completed Project" : "Warranty";
                    })(),
                    paymentMethod: b.paymentMethod || 'Cash',
                    paymentStatus: b.paymentStatus || 'Pending',
                    contractLink: b.contractLink || "",
                    paymentProofLink: b.paymentProofLink || null,
                    paymentNotifiedByCustomer: !!b.paymentNotifiedByCustomer,
                    declaredPaymentAmount: parseFloat(b.declaredPaymentAmount) || 0,
                };
            });

            const feedbacksResult = await get_data_helper("feedbacks", [{ $sort: { createdAt: -1 } }]);
            const allFeedbacks = feedbacksResult?.payload || feedbacksResult || [];

            const matchedFeedbackOrderIds = new Set();
            normalizedPayload.forEach(tx => {
                const feedbacksForOrder = allFeedbacks.filter(f => String(f.orderId) === String(tx.id));
                if (feedbacksForOrder.length > 0) {
                    matchedFeedbackOrderIds.add(String(tx.id));
                    const latest = feedbacksForOrder[0];
                    tx.feedback = latest.comment || "";
                    tx.rating = latest.rating || null;
                    tx.feedbacks = feedbacksForOrder;
                }
            });
            allFeedbacks.forEach(f => {
                if (!f.orderId || matchedFeedbackOrderIds.has(String(f.orderId))) return;
                normalizedPayload.push({
                    id: f._id ? String(f._id) : (f.orderId || `FB-${Math.random().toString(36).substr(2, 5)}`),
                    contractId: f.orderId || "Direct Feedback",
                    clientName: f.userName || "Customer",
                    customerEmail: "",
                    category: f.productCategory || "Completed Project",
                    dateCreated: f.createdAt ? new Date(f.createdAt).toISOString().split('T')[0] : "",
                    feedback: f.comment || "",
                    rating: f.rating || null,
                    feedbacks: [f],
                    measurements: []
                });
            });

            return res.status(200).json({ remarks: "success", payload: normalizedPayload });
        });
    } catch (err) {
        console.error("Error fetching grouped site inspections:", err);
        return res.status(500).json({ error: err.message });
    }
});

cartRoutes.post("/api/create_order_request", async (req, res) => {
    const { 
        token, _id, clientName, clientNumber, siteAddress, inspectionDate, 
        estimatedInstallationDate, status, notes, paymentTerms, downpaymentPaid, 
        paymentDate, customerHasAccount, customerEmail, measurements, manualOverride, estimatedTotal,
        warrantyDays
    } = req.body;

    if (!token) return res.status(401).json({ remarks: "Unauthorized" });

    try {
        checkAuth(token, _id, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "Unauthorized" });

            const db = await await dbo.getDb();
            let matchedUserId = null;
            let matchedUser = null;

            if (customerHasAccount && customerEmail) {
                const userDoc = await db.collection("users").findOne({ email: customerEmail.trim() });
                if (userDoc) {
                    matchedUserId = userDoc._id; 
                    matchedUser = userDoc;
                }
            }

            const sharedOrderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const isCancelledValue = status === "Canceled" || status === "Cancelled" ? 1 : 0;
            const hasExplicitWarrantyDays = warrantyDays !== undefined && warrantyDays !== null && warrantyDays !== '';
            const warrantyDaysValue = hasExplicitWarrantyDays ? Number(warrantyDays) : undefined;

            const documentBatch = (measurements || []).map((row, index) => {
                const widthVal = parseFloat(row.width) || 0;
                const heightVal = parseFloat(row.height) || 0;
                const qtyVal = parseInt(row.qty) || 1;
                const rateVal = parseFloat(row.pricePerSqFt) || 0;
                
                let unitVal = row.unit || "cm";
                if (unitVal === "in") unitVal = "inch"; 
                
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
                    ...(warrantyDaysValue !== undefined ? { warrantyDays: warrantyDaysValue } : {}),
                    
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

cartRoutes.post("/api/update_order_request", async (req, res) => {
    const { 
        token, user_id, id, orderId, clientName, clientNumber, siteAddress, inspectionDate, 
        estimatedInstallationDate, status, notes, paymentTerms, downpaymentPaid, 
        paymentDate, customerHasAccount, customerEmail, measurements, manualOverride, estimatedTotal,
        warrantyDays
    } = req.body;

    if (!token) return res.status(401).json({ remarks: "Unauthorized" });
    
    const targetOrderId = orderId || id;
    if (!targetOrderId) return res.status(400).json({ remarks: "failed", message: "Missing target orderId reference identifier" });

    try {
        checkAuth(token, user_id, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "Unauthorized" });

            const db = await await dbo.getDb();
            let matchedUserId = null;

            if (customerHasAccount && customerEmail) {
                const userDoc = await db.collection("users").findOne({ email: customerEmail.trim() });
                if (userDoc) matchedUserId = userDoc._id;
            }

            const isCancelledValue = status === "Canceled" || status === "Cancelled" ? 1 : 0;

            const hasExplicitWarrantyDays = warrantyDays !== undefined && warrantyDays !== null && warrantyDays !== '';
            const warrantyDaysValue = hasExplicitWarrantyDays ? Number(warrantyDays) : undefined;

            await db.collection("order_requests").deleteMany({ orderId: targetOrderId });

            const documentBatch = (measurements || []).map(row => {
                const widthVal = parseFloat(row.width) || 0;
                const heightVal = parseFloat(row.height) || 0;
                const qtyVal = parseInt(row.qty) || 1;
                const rateVal = parseFloat(row.pricePerSqFt) || 0;
                const unitVal = row.unit || "cm";
                
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
                    ...(warrantyDaysValue !== undefined ? { warrantyDays: warrantyDaysValue } : {}),
                    manualOverride: manualOverride !== undefined && manualOverride !== null ? parseFloat(manualOverride) : "",
                    estimatedTotal: parseFloat(estimatedTotal) || 0,
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

cartRoutes.post("/api/send_inspection_contract", async (req, res) => {
    const { token, _id, orderRequestId } = req.body;

    if (!token) return res.status(401).json({ remarks: "Unauthorized" });
    if (!orderRequestId) return res.status(400).json({ remarks: "failed", message: "Missing orderRequestId target identification" });

    try {
        checkAuth(token, _id, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "Unauthorized" });

            const targetQuery = ObjectId.isValid(orderRequestId) ? { _id: new ObjectId(orderRequestId) } : { orderId: orderRequestId };

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

cartRoutes.post("/api/send_contract_email-old", upload.single('contractFile'), async (req, res) => {
  const { inspectionId, orderId, customerEmail, contractId } = req.body;

  if (!req.file) {
    return res.status(400).json({ remarks: 'failed', message: 'Missing compiled contract binary file streaming parameter.' });
  }

  try {
    const savedRelativePath = `/uploads/${req.file.filename}`;
    const db = await dbo.getDb ? await dbo.getDb() : req.app.get('db');

    if (orderId && orderId !== "") {
      await db.collection('order_requests').updateMany(
        { orderId: orderId },
        { $set: { contractLink: savedRelativePath, contractSentToCustomer: true, contractUpdatedAt: new Date(), contractId: contractId } }
      );
    }

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

cartRoutes.post("/api/send_contract_email", memoryUpload.single('contractFile'), async (req, res) => {
  const { inspectionId, orderId, customerEmail, contractId } = req.body;

  if (!req.file) {
    return res.status(400).json({ remarks: 'failed', message: 'Missing compiled contract binary file streaming parameter.' });
  }
  const isPdf = req.file.mimetype === 'application/pdf';
  try {
    const cloudinaryResult = await uploadToCloudinary(req.file.buffer, {
      folder: "contracts",
      resource_type: isPdf ? "raw" : "image",
      type: "upload",
      access_mode: "public"
    });
    const savedRelativePath = cloudinaryResult.secure_url;
    const db = await dbo.getDb ? await dbo.getDb() : req.app.get('db');

    if (orderId && orderId !== "") {
      await db.collection('order_requests').updateMany(
        { orderId: orderId },
        { $set: { contractLink: savedRelativePath, contractSentToCustomer: true, contractUpdatedAt: new Date(), contractId: contractId } }
      );
    }

    if (customerEmail && customerEmail.trim() !== "") {
      const base64Content = req.file.buffer.toString('base64');

      await brevo.transactionalEmails.sendTransacEmail({
        sender: {
          name: process.env.SMTP_SENDER_NAME || "ACGC System",
          email: process.env.SMTP_EMAIL
        },
        to: [{ email: customerEmail }],
        subject: `ACGC System - Service Contract Confirmation - Order Reference: ${orderId || 'SI-' + inspectionId}`,
        textContent: `Hello,\n\nPlease find attached the official Service Contract documentation regarding your service inquiry with ACGC Glass & Aluminum Services.\n\nBest regards,\nAdministration Team`,
        attachment: [
          {
            name: req.file.originalname || `Contract_Reference.pdf`,
            content: base64Content
          }
        ]
      });
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

cartRoutes.post("/api/manual_approve_order-old", upload.single('receiptFile'), async (req, res) => {
  const { orderId, contractId } = req.body;

  if (!orderId) {
    return res.status(400).json({ remarks: 'failed', message: 'Missing target validation identification context orderId.' });
  }
  if (!req.file) {
    return res.status(400).json({ remarks: 'failed', message: 'Validation verification files attachment parameter streams required.' });
  }

  try {
    const savedRelativePath = `/uploads/${req.file.filename}`;
    const db = await dbo.getDb ? await dbo.getDb() : req.app.get('db');

    const matchItems = await db.collection('order_requests').find({ orderId: orderId }).toArray();
    if (!matchItems || matchItems.length === 0) {
      return res.status(404).json({ remarks: 'failed', message: 'Target order request mapping tracking parameters completely missing.' });
    }

    const orderRecord = matchItems[0];
    
    const finalGrandTotal = parseFloat(orderRecord.estimatedTotal || orderRecord.itemDetails?.estimatedCost || 0);
    
    const cleanedTerms = String(orderRecord.paymentTerms || '').trim();
    const isFullPayment = cleanedTerms === 'Full payment';

    let updateFields = {
      contractLink: savedRelativePath,
      approvedAt: new Date(),
      contractId: contractId
    };

    if (isFullPayment) {
      updateFields.status = 'Pending Payment';
      updateFields.contractApproved = 1;
    } else {
      const calculatedDpAmount = finalGrandTotal * 0.5;
      updateFields.status = 'Pending Payment';
      updateFields.contractApproved = 1;
    }

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

cartRoutes.post("/api/manual_approve_order", memoryUpload.single('receiptFile'), async (req, res) => {
  const { orderId, contractId } = req.body;

  if (!orderId) {
    return res.status(400).json({ remarks: 'failed', message: 'Missing target validation identification context orderId.' });
  }
  if (!req.file) {
    return res.status(400).json({ remarks: 'failed', message: 'Validation verification files attachment parameter streams required.' });
  }
    const isPdf = req.file.mimetype === 'application/pdf';
  try {
    const cloudinaryResult = await uploadToCloudinary(req.file.buffer, {
      folder: "receipts",
      resource_type: isPdf ? "raw" : "image",
      type: "upload",
      access_mode: "public"
    });
    const savedRelativePath = cloudinaryResult.secure_url;
    const db = await dbo.getDb ? await dbo.getDb() : req.app.get('db');

    const matchItems = await db.collection('order_requests').find({ orderId: orderId }).toArray();
    if (!matchItems || matchItems.length === 0) {
      return res.status(404).json({ remarks: 'failed', message: 'Target order request mapping tracking parameters completely missing.' });
    }

    const orderRecord = matchItems[0];
    
    const finalGrandTotal = parseFloat(orderRecord.estimatedTotal || orderRecord.itemDetails?.estimatedCost || 0);
    
    const cleanedTerms = String(orderRecord.paymentTerms || '').trim();
    const isFullPayment = cleanedTerms === 'Full payment';

    let updateFields = {
      contractLink: savedRelativePath,
      approvedAt: new Date(),
      contractId: contractId
    };

    if (isFullPayment) {
      updateFields.status = 'Pending Payment';
      updateFields.contractApproved = 1;
    } else {
      const calculatedDpAmount = finalGrandTotal * 0.5;
      updateFields.status = 'Pending Payment';
      updateFields.contractApproved = 1;
    }

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
    checkAuth(token, userId, async (isValid) => {
      if (!isValid) return res.status(401).json({ remarks: "Unauthorized" });

      const userObjectId = new ObjectId(userId);

      const pipeline = [
        {
          $match: {
            user_id: userObjectId,
            $or: [
              { contractApproved: 1 },
              { contractSentToCustomer: true },
              { status: "Completed" },
              { status: "Cancelled" }
            ]
          }
        },
        {
          $group: {
            _id: "$orderId",
            baseDoc: { $first: "$$ROOT" },
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

      const result = await get_data_helper("order_requests", pipeline);
      const rawPayload = result?.payload || result || [];

      const normalizedPayload = rawPayload.map(group => {
        const b = group.baseDoc;
        return {
          orderId: group._id,
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

cartRoutes.route("/api/client_respond_contract-old").post(upload.single("contractFile"), async (req, res) => {
  const { token, userId, orderId, action } = req.body;

  if (!token || !userId || !orderId || !action) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({ remarks: "failed", message: "Missing tracking credentials or response parameters." });
  }

  try {
    checkAuth(token, userId, async (isValid) => {
      try {
        if (!isValid) {
          if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
          return res.status(401).json({ remarks: "failed", message: "Unauthorized transaction attempt." });
        }

        const db = await dbo.getDb();
        const userObjectId = new ObjectId(userId);

        const targetGroupSample = await db.collection("order_requests").findOne({
          orderId: orderId,
          user_id: userObjectId
        });

        if (!targetGroupSample) {
          if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
          return res.status(404).json({ remarks: "failed", message: "Target order reference group not found." });
        }

        let savedRelativePath = targetGroupSample.contractLink || "#";

        if (req.file) {
          const targetUploadDir = path.join(__dirname, "../uploads");
          
          if (targetGroupSample.contractLink && targetGroupSample.contractLink !== "#") {
            const oldFileName = path.basename(targetGroupSample.contractLink);
            const oldFilePath = path.join(targetUploadDir, oldFileName);
            
            if (fs.existsSync(oldFilePath)) {
              try {
                fs.unlinkSync(oldFilePath);
              } catch (e) {
                console.warn("File target locked or already moved, skipping deletion path:", e);
              }
            }
          }
          savedRelativePath = `/uploads/${req.file.filename}`;
        }

        let updateFields = {
          contractLink: savedRelativePath,
          contractUpdatedAt: new Date()
        };

        if (action === "Approve") {
          updateFields.contractApproved = 1;
          updateFields.status = "Pending Payment"; 
        } else if (action === "Decline") {
          updateFields.contractApproved = 0;
          updateFields.status = "Cancelled";
        }

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

cartRoutes.route("/api/client_respond_contract").post(memoryUpload.single("contractFile"), async (req, res) => {
  const { token, userId, orderId, action } = req.body;

  if (!token || !userId || !orderId || !action) {
    return res.status(400).json({ remarks: "failed", message: "Missing tracking credentials or response parameters." });
  }

  try {
    checkAuth(token, userId, async (isValid) => {
      try {
        if (!isValid) {
          return res.status(401).json({ remarks: "failed", message: "Unauthorized transaction attempt." });
        }

        const db = await dbo.getDb();
        const userObjectId = new ObjectId(userId);

        const targetGroupSample = await db.collection("order_requests").findOne({
          orderId: orderId,
          user_id: userObjectId
        });

        if (!targetGroupSample) {
          return res.status(404).json({ remarks: "failed", message: "Target order reference group not found." });
        }

        let savedRelativePath = targetGroupSample.contractLink || "#";
        const isPdf = req.file.mimetype === 'application/pdf';
        if (req.file) {
          const cloudinaryResult = await uploadToCloudinary(req.file.buffer, {
            folder: "contracts",
            resource_type: isPdf ? "raw" : "image",
            type: "upload",
            access_mode: "public"
          });
          savedRelativePath = cloudinaryResult.secure_url;
        }

        let updateFields = {
          contractLink: savedRelativePath,
          contractUpdatedAt: new Date()
        };

        if (action === "Approve") {
          updateFields.contractApproved = 1;
          updateFields.status = "Pending Payment"; 
        } else if (action === "Decline") {
          updateFields.contractApproved = 0;
          updateFields.status = "Cancelled";
        }

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
        return res.status(500).json({ remarks: "error", message: "Internal data synchronization processing error." });
      }
    });

  } catch (error) {
    console.error("Critical outer pipeline crash in client_respond_contract:", error);
    return res.status(500).json({ remarks: "error", message: "Internal server error executing file operations." });
  }
});

cartRoutes.post("/api/get_progress_monitor", async (req, res) => {
    const { token, user_id } = req.body;
    if (!token || !user_id) return res.status(400).json({ remarks: "failed", message: "Missing tracking credentials or response parameters." }); 

    try {
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

cartRoutes.post("/api/upload_proof_file-old", upload.single("proofFile"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ remarks: "failed", message: "No binary file payload received." });
        }

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

cartRoutes.post("/api/upload_proof_file", memoryUpload.single("proofFile"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ remarks: "failed", message: "No binary file payload received." });
        }

        const isPdf = req.file.mimetype === 'application/pdf';
        const cloudinaryResult = await uploadToCloudinary(req.file.buffer, {
            folder: "proofs",
            resource_type: isPdf ? "raw" : "image",
            type: "upload",
            access_mode: "public"
        });

        return res.status(200).json({
            remarks: "success",
            proof: {
                id: "p" + Date.now() + Math.floor(Math.random() * 100),
                fileName: cloudinaryResult.secure_url,
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

            const db = await await dbo.getDb();
            
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
    const { token, user_id, orderId, paymentMethod, totalPayment, transactionNumber, resolvesCustomerNotification, customerDeclaredAmount } = req.body;

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
        checkAuth(token, user_id, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "failed", message: "Security authorization failed" });

            const db = await dbo.getDb();

            const cleanPaymentMethod = String(paymentMethod).trim();
            const floatTotalPayment = parseFloat(totalPayment) || 0.0;
            const cleanTransactionNumber = transactionNumber ? String(transactionNumber).trim() : "";

            const targetSample = await db.collection("order_requests").findOne({ orderId: orderId });
            
            if (!targetSample) {
                return res.status(404).json({ 
                    remarks: "failed", 
                    message: "No matching order records found with the provided orderId reference." 
                });
            }

            const manualOverrideTarget = parseFloat(targetSample.manualOverride) || 0.0;
            const estimatedTotalTarget = parseFloat(targetSample.estimatedTotal) || 0.0;
            const previousTotalPayment = parseFloat(targetSample.totalPayment) || 0.0;

            const targetRequiredAmount = manualOverrideTarget > 0 ? manualOverrideTarget : estimatedTotalTarget;
            var calculatedPaymentStatus = "Pending"; 

            const roundedTotalPayment = Math.round(floatTotalPayment * 100) / 100;
            const roundedTargetAmount = Math.round(targetRequiredAmount * 100) / 100;
            var status = ""
            if (roundedTotalPayment >= roundedTargetAmount) {
                calculatedPaymentStatus = "Paid";
                status = "Paid";
            }

            console.log(`Comparing numbers: ${roundedTotalPayment} >= ${roundedTargetAmount} -> result:`, roundedTotalPayment >= roundedTargetAmount);
            const incrementalRecorded = Math.round((floatTotalPayment - previousTotalPayment) * 100) / 100;
            const floatDeclaredAmount = parseFloat(customerDeclaredAmount) || 0;
            const matchesDeclaration = floatDeclaredAmount > 0 && Math.abs(floatDeclaredAmount - incrementalRecorded) <= 1;

            const updateResult = await db.collection("order_requests").updateMany(
                { orderId: orderId },
                { 
                    $set: { 
                        paymentMethod: cleanPaymentMethod,
                        totalPayment: floatTotalPayment,
                        transactionNumber: cleanTransactionNumber,
                        paymentStatus: calculatedPaymentStatus,
                        paymentUpdatedAt: new Date(),
                        ...(status != "" ? { status: status } : {}),
                        ...(resolvesCustomerNotification ? {
                            paymentNotifiedByCustomer: false,
                            paymentConfirmedByAdmin: true,
                            lastDeclaredAmount: floatDeclaredAmount,
                            lastConfirmedIncrement: incrementalRecorded,
                            lastPaymentMatchedDeclaration: matchesDeclaration
                        } : {})
                    } 
                }
            );

            if (resolvesCustomerNotification && targetSample.user_id) {
                await pushNotification({
                    recipientRole: "customer",
                    recipientId: targetSample.user_id,
                    type: "payment_confirmed",
                    title: matchesDeclaration ? "Payment Confirmed" : "Payment Reviewed",
                    message: matchesDeclaration
                        ? `Your payment of ₱${incrementalRecorded.toLocaleString('en-PH', { minimumFractionDigits: 2 })} for order ${orderId} has been confirmed.`
                        : `Admin recorded ₱${incrementalRecorded.toLocaleString('en-PH', { minimumFractionDigits: 2 })} for order ${orderId}${floatDeclaredAmount > 0 ? ` (you reported ₱${floatDeclaredAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })})` : ''}. Please call us if this doesn't look right.`,
                    link: "/orders",
                    orderId: orderId
                });
            }

            if (updateResult.matchedCount > 0) {
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

// ─── CUSTOMER: UPLOAD PROOF OF PAYMENT (used by the "I've Already Paid" action) ───
cartRoutes.post("/api/upload_payment_proof-old", upload.single("proofFile"), async (req, res) => {
    const { token, userId, orderId } = req.body;

    if (!token) return res.status(401).json({ remarks: "failed", message: "Unauthorized: Missing session token" });
    if (!orderId) return res.status(400).json({ remarks: "failed", message: "Missing orderId target reference identifier" });

    try {
        checkAuth(token, userId, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "failed", message: "Security authorization failed" });
            if (!req.file) return res.status(400).json({ remarks: "failed", message: "No proof of payment file was received." });

            const db = await dbo.getDb();
            const savedRelativePath = `/uploads/${req.file.filename}`;

            const updateResult = await db.collection("order_requests").updateMany(
                { orderId: orderId },
                { $set: { paymentProofLink: savedRelativePath, paymentProofUploadedAt: new Date() } }
            );

            if (updateResult.matchedCount > 0) {
                await actionLog(userId, "Uploaded Proof of Payment", `Customer uploaded proof of payment for orderId: ${orderId}`);
                return res.status(200).json({
                    remarks: "success",
                    message: "Proof of payment uploaded successfully.",
                    payload: { paymentProofLink: savedRelativePath }
                });
            } else {
                return res.status(404).json({ remarks: "failed", message: "No matching order records found with the provided orderId reference." });
            }
        });
    } catch (err) {
        console.error("Critical error inside /api/upload_payment_proof handler:", err);
        return res.status(500).json({ remarks: "failed", error: err.message || err });
    }
});

cartRoutes.post("/api/upload_payment_proof", memoryUpload.single("proofFile"), async (req, res) => {
    const { token, userId, orderId } = req.body;

    if (!token) return res.status(401).json({ remarks: "failed", message: "Unauthorized: Missing session token" });
    if (!orderId) return res.status(400).json({ remarks: "failed", message: "Missing orderId target reference identifier" });

    try {
        checkAuth(token, userId, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "failed", message: "Security authorization failed" });
            if (!req.file) return res.status(400).json({ remarks: "failed", message: "No proof of payment file was received." });

            const isPdf = req.file.mimetype === "application/pdf";
            const cloudinaryResult = await uploadToCloudinary(req.file.buffer, {
                folder: "payment_proofs",
                resource_type: isPdf ? "raw" : "image",
                type: "upload",
                access_mode: "public"
            });

            const db = await dbo.getDb();
            const savedRelativePath = cloudinaryResult.secure_url;

            const updateResult = await db.collection("order_requests").updateMany(
                { orderId: orderId },
                { $set: { paymentProofLink: savedRelativePath, paymentProofUploadedAt: new Date() } }
            );

            if (updateResult.matchedCount > 0) {
                await actionLog(userId, "Uploaded Proof of Payment", `Customer uploaded proof of payment for orderId: ${orderId}`);
                return res.status(200).json({
                    remarks: "success",
                    message: "Proof of payment uploaded successfully.",
                    payload: { paymentProofLink: savedRelativePath }
                });
            } else {
                return res.status(404).json({ remarks: "failed", message: "No matching order records found with the provided orderId reference." });
            }
        });
    } catch (err) {
        console.error("Critical error inside /api/upload_payment_proof handler:", err);
        return res.status(500).json({ remarks: "failed", error: err.message || err });
    }
});

// ─── CUSTOMER: NOTIFY ADMIN THAT PAYMENT WAS SENT ─────────────────────────
cartRoutes.post("/api/notify_payment_sent", async (req, res) => {
    const { token, userId, orderId, declaredAmount } = req.body;

    if (!token) return res.status(401).json({ remarks: "failed", message: "Unauthorized: Missing session token" });
    if (!orderId) return res.status(400).json({ remarks: "failed", message: "Missing orderId target reference identifier" });

    const floatDeclaredAmount = parseFloat(declaredAmount);
    if (isNaN(floatDeclaredAmount) || floatDeclaredAmount <= 0) {
        return res.status(400).json({ remarks: "failed", message: "Please provide a valid amount you paid." });
    }

    try {
        checkAuth(token, userId, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "failed", message: "Security authorization failed" });

            const db = await dbo.getDb();

            const targetSample = await db.collection("order_requests").findOne({ orderId: orderId });
            if (!targetSample) {
                return res.status(404).json({ remarks: "failed", message: "No matching order records found with the provided orderId reference." });
            }

            const updateResult = await db.collection("order_requests").updateMany(
                { orderId: orderId },
                {
                    $set: {
                        paymentNotifiedByCustomer: true,
                        paymentNotifiedAt: new Date(),
                        declaredPaymentAmount: floatDeclaredAmount,
                        paymentConfirmedByAdmin: false
                    }
                }
            );

            if (updateResult.matchedCount > 0) {
                await actionLog(userId, "Notified Payment Sent", `Customer notified admin that payment was sent for orderId: ${orderId} (declared amount: ${floatDeclaredAmount})`);

                await pushNotification({
                    recipientRole: "admin",
                    type: "payment_declared",
                    title: "Customer Reported a Payment",
                    message: `${targetSample.clientName || "A customer"} says they paid ₱${floatDeclaredAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} for order ${orderId}. Please confirm.`,
                    link: "/admin/transactions",
                    orderId: orderId
                });

                return res.status(200).json({ remarks: "success", message: "Admin notified successfully." });
            } else {
                return res.status(404).json({ remarks: "failed", message: "No matching order records found with the provided orderId reference." });
            }
        });
    } catch (err) {
        console.error("Critical error inside /api/notify_payment_sent handler:", err);
        return res.status(500).json({ remarks: "failed", error: err.message || err });
    }
});

cartRoutes.post('/api/dashboard_data', async (req, res) => {
    const { token, user_id } = req.body;

    if (!token) return res.status(400).json({ remarks: "failed", message: "Missing token parameter" });
    if (!user_id) return res.status(400).json({ remarks: "failed", message: "Missing user_id parameter" });

    try {
        checkAuth(token, user_id, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "failed", message: "Security authorization failed" });

            const pipeline = [
                {
                    $match: {$or: [
                        { contractApproved: { $ne: 1 } },
                        { status: "Completed" }
                        ]
                    }
                },
                {
                    $group: {
                        _id: "$orderId",
                        baseDoc: { $first: "$$ROOT" },
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
                    id: group._id,
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

            const query = [
                {
                    $match: {                         contractApproved: 1,                     }                 },                 {$addFields:{
                        progressStatus: { 
                            $ifNull: ["$progressStatus", "Pending"] 
                        },
                        stages: {
                            $ifNull: ["$stages", []]
                        }
                    }
                }
            ];

            const progress = await get_data_helper("order_requests", query);

            const warranty_query = [
                {
                    $match: {
                        contractApproved: { $exists: true,$ne: null }
                    }
                },
                {
                    $group: {
                        _id: "$orderId",
                        baseDoc: { $first: "$$ROOT" },
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
                        totalEstimatedCost: { $sum: "$itemDetails.estimatedCost" },
                    }
                },
                { $sort: { "baseDoc.createdAt": -1 } }
            ];

            const warranty = await get_data_helper("order_requests", warranty_query);
            const warrantyPayload = warranty?.payload || warranty || [];

            var warrantyNormalized = warrantyPayload.map(group => {
                const b = group.baseDoc;
                return {
                    id: group._id,
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
                    ...(b.warrantyDays !== undefined && b.warrantyDays !== null ? { warrantyDays: b.warrantyDays } : {}),
                    paymentDate: b.paymentDate || "",
                    contractId: b.contractId,
                    totalPayment: b.totalPayment || 0,
                    transactionNumber: b.transactionNumber || "",
                    category: (() => {
                        const grandTotalForCat = parseFloat(b.manualOverride) || parseFloat(b.estimatedTotal) || group.totalEstimatedCost || 0;
                        const paidForCat = parseFloat(b.totalPayment) || 0;
                        const isFullyPaidForCat = grandTotalForCat > 0 && paidForCat >= grandTotalForCat;
                        if (isFullyPaidForCat) {
                            return "Completed Project";
                        }

                        const isAllCompleted = group.measurements.every(m => m.progressStatus === "Completed");
                        
                        if (!isAllCompleted) {
                            return "In Progress";
                        }

                        const hasExplicitWarrantyDaysForCat = b.warrantyDays !== undefined && b.warrantyDays !== null && b.warrantyDays !== '';
                        const warrantyDaysForCat = hasExplicitWarrantyDaysForCat ? Number(b.warrantyDays) : 90;
                        const warrantyCutoffDate = new Date();
                        warrantyCutoffDate.setDate(warrantyCutoffDate.getDate() - warrantyDaysForCat);

                        const isPastWarrantyAll = group.measurements.every(m => {
                            if (!m.estimatedInstallationDate) return false; 
                            
                            const installationDate = new Date(m.estimatedInstallationDate);
                            return installationDate < warrantyCutoffDate;
                        });

                        return isPastWarrantyAll ? "Completed Project" : "Warranty";
                    })(),
                    paymentMethod: b.paymentMethod || 'Cash',
                    paymentStatus: b.paymentStatus || 'Pending',
                    contractLink: b.contractLink || "",
                    paymentProofLink: b.paymentProofLink || null,
                    paymentNotifiedByCustomer: !!b.paymentNotifiedByCustomer,
                };
            });
            warrantyNormalized = warrantyNormalized.filter(d => d.category === "Warranty");
            return res.status(200).json({ remarks: "success", payload:{ transactions: normalizedPayload, projects: progress.payload, warranty: warrantyNormalized } });
        })
    } catch (err) {
        console.error("Critical error mapping execution processing inside /api/edit_payment handler:", err);
        return res.status(500).json({ remarks: "error", error: err.message || err });
    }
})
module.exports = cartRoutes;