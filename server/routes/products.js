const express = require("express");
const productRoutes = express.Router();
const port = process.env.PORT || 5000;
const dbo = require("../helper/db");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { ObjectId } = require("mongodb"); // Ensure ObjectId is imported
const { get_data_helper, check_record_exists, decrypt, insert_one_helper, validateHash, hashPass, update_one_helper, delete_or_archive_helper, checkAuth, actionLog } = require("../helper/Helper");

const path = require("path");
const fs = require("fs");

const getUploadDir = () => {
    const baseDir = __dirname.split("routes")[0];
    return path.join(baseDir, "uploads");
};

// --- HELPER FUNCTION: SAVE BASE64 STRINGS TO DISK ---
// This processes incoming frontend strings, saves them to your uploads directory, and returns the URL string
const saveBase64Image = (base64Str) => {
    if (!base64Str) return null;
    // If it's already a URL path (meaning it wasn't edited or re-uploaded), return it as-is
    if (base64Str.startsWith("/uploads/")) return base64Str;

    try {
        const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) return null;

        const ext = matches[1].split("/")[1] || "png";
        const dataBuffer = Buffer.from(matches[2], 'base64');
        
        const uploadDir = getUploadDir();
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const uniqueFileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${ext}`;
        const filePath = path.join(uploadDir, uniqueFileName);
        
        fs.writeFileSync(filePath, dataBuffer);
        return `/uploads/${uniqueFileName}`;
    } catch (err) {
        console.error("Error saving base64 image:", err);
        return null;
    }
};

productRoutes.post("/api/get_products", async (req, res) => {
    var token = req.body.token;
    var archive = req.body.archive;
    var response = {}
    if (!token) return res.status(400).json({ error: "Token is required" });

    try {
        checkAuth(token, req.body._id, async (isValid) => {
            if (!isValid) return res.status(401).json({ error: "Unauthorized" });

            const product_query = [
                {
                    $match: {
                        archive: archive
                    }
                }
            ]

            const result = await get_data_helper("products", product_query);
            if (result?.payload?.length > 0) {
                response = { remarks: "success", message: "Data fetched successfully", payload: result.payload };
            } else {
                response = { remarks: "failed", message: "No data found", payload: null };
            }
            res.status(200).json(response);
        })
    } catch (err) {
        console.error("Error in /api/get_products:", err);
        res.status(500).json({ error: err });
    }
});

productRoutes.get("/api/get_products_client", async (req, res) => {
    try {
        const product_query = [{
            $match: {
                active: true
            }
        }]
        const result = await get_data_helper("products", product_query);
        if (result?.payload?.length > 0) {
            response = { remarks: "success", message: "Data fetched successfully", payload: result.payload };
        } else {
            response = { remarks: "failed", message: "No data found", payload: null };
        }
        res.status(200).json(response);
    } catch (err) {
        console.error("Error in /api/get_products:", err);
        res.status(500).json({ error: err });
    }
});

productRoutes.post("/api/get_product/:id", async (req, res) => {
    var token = req.body.token;
    var id = req.params.id;
    var response = {}
    if (!token) return res.status(400).json({ error: "Token is required" });

    try {
        checkAuth(token, req.body._id, async (isValid) => {
            if (!isValid) return res.status(401).json({ error: "Unauthorized" });

            const product_query = [
                {
                    $match: {
                        _id: new ObjectId(id)
                    }
                }
            ]

            const result = await get_data_helper("products", product_query);
            if (result?.payload?.length > 0) {
                response = { remarks: "success", message: "Data fetched successfully", payload: result.payload };
            } else {
                response = { remarks: "failed", message: "No data found", payload: null };
            }
            res.status(200).json(response);
        })
    } catch (err) {
        console.error("Error in /api/get_product/:id:", err);
        res.status(500).json({ error: err });
    }
});

productRoutes.post("/api/archive_product/:id", async (req, res) => {
    var token = req.body.token;
    var id = req.params.id;
    var response = {}
    if (!token) return res.status(400).json({ error: "Token is required" });

    try {
        checkAuth(token, req.body._id, async (isValid) => {
            if (!isValid) return res.status(401).json({ error: "Unauthorized" });

            const product_query = [
                {
                    $match: {
                        _id: new ObjectId(id)
                    }
                }
            ]

            const result = await get_data_helper("products", product_query);
            if (result?.payload?.length > 0) {
                const archive = result.payload[0].archive === 1 ? 0 : 1;
                const updateResult = await update_one_helper("products", { _id: new ObjectId(id) }, { $set: { archive: archive } });
                await actionLog(userId, "Archive Product", `Archived product: ${result.payload[0].name}`);
                response = { remarks: "success", message: "Data updated successfully", payload: updateResult };
            } else {
                response = { remarks: "failed", message: "No data found", payload: null };
            }
            res.status(200).json(response);
        })
    } catch (err) {
        console.error("Error in /api/archive_product/:id:", err);
        res.status(500).json({ error: err });
    }
});

productRoutes.post("/api/restore_product/:id", async (req, res) => {
    var token = req.body.token;
    var id = req.params.id;
    var response = {}
    if (!token) return res.status(400).json({ error: "Token is required" });

    try {
        checkAuth(token, req.body._id, async (isValid) => {
            if (!isValid) return res.status(401).json({ error: "Unauthorized" });

            const product_query = [
                {
                    $match: {
                        _id: new ObjectId(id)
                    }
                }
            ]

            const result = await get_data_helper("products", product_query);
            if (result?.payload?.length > 0) {
                const archive = result.payload[0].archive == 1 ? 0 : 1;
                const updateResult = await update_one_helper("products", { _id: new ObjectId(id) }, { $set: { archive: archive } });
                await actionLog(userId, "Restore Product", `Restored product: ${result.payload[0].name}`);
                response = { remarks: "success", message: "Data updated successfully", payload: updateResult };
            } else {
                response = { remarks: "failed", message: "No data found", payload: null };
            }
            res.status(200).json(response);
        })
    } catch (err) {
        console.error("Error in /api/restore_product/:id:", err);
        res.status(500).json({ error: err });
    }
});

// --- UPDATED: ADD PRODUCT ---
// Aligned fields directly to frontend matching: type, name, category, variant, width, height, unit, pricePerSqFt, estimatedCost, active
productRoutes.post("/api/add_product", async (req, res) => {
    const { token, userId, product, fullName } = req.body;

    if (!token) return res.status(400).json({ error: "Token is required" });
    if (!product) return res.status(400).json({ error: "Product payload data is missing" });

    try {
        checkAuth(token, userId, async (isValid) => {
            if (!isValid) return res.status(401).json({ error: "Unauthorized" });

            // Process image strings from the client bundle
            const mainImgUrl = saveBase64Image(product.mainImg);
            const angleImgUrls = Array.isArray(product.angleImgs) 
                ? product.angleImgs.map(img => saveBase64Image(img)) 
                : [null, null, null, null];

            const newProduct = {
                type: product.type || "",
                name: product.name || "",
                category: product.category || "",
                variant: product.variant || "",
                description: product.description || "",
                width: parseFloat(product.width) || 0,
                height: parseFloat(product.height) || 0,
                unit: product.unit || "in",
                pricePerSqFt: parseFloat(product.pricePerSqFt) || 0,
                estimatedCost: parseFloat(product.estimatedCost) || 0,
                mainImg: mainImgUrl,
                angleImgs: angleImgUrls,
                active: product.active !== undefined ? product.active : true,
                archive: 0,
                createdBy: userId,
                createdAt: new Date()
            };

            const result = await insert_one_helper("products", newProduct);
            await actionLog(userId, "Add Product", `${fullName} Added new product: ${newProduct.name}`);
            // Return back the inserted product structure containing the generated database properties
            const insertedPayload = { ...newProduct, _id: result.insertedId || result };
            return res.status(200).json({ remarks: "success", message: "Product added successfully", payload: insertedPayload });
        });
    } catch (err) {
        console.error("Error in /api/add_product:", err);
        return res.status(500).json({ error: err.message || err });
    }
});

// --- UPDATED: UPDATE PRODUCT ---
// Handles unchanged image paths flawlessly without rewriting files
productRoutes.post("/api/update_product", async (req, res) => {
    const { token, userId, product, fullName } = req.body;

    if (!token) return res.status(400).json({ error: "Token is required" });
    if (!product) return res.status(400).json({ error: "Product properties are required" });

    const productId = product._id || product.id;
    if (!productId) return res.status(400).json({ error: "Product Identification Identifier is missing" });

    try {
        checkAuth(token, userId, async (isValid) => {
            if (!isValid) return res.status(401).json({ error: "Unauthorized" });

            const product_query = [{ $match: { _id: new ObjectId(productId) } }];
            const currentProductResult = await get_data_helper("products", product_query);

            if (!currentProductResult?.payload?.length) {
                return res.status(404).json({ remarks: "failed", message: "Product not found" });
            }

            const currentProduct = currentProductResult.payload[0];

            // 1. Evaluate Main Image transformations
            let finalMainImg = currentProduct.mainImg;
            if (product.mainImg !== currentProduct.mainImg) {
                // Remove old picture file physically if it's changing
                if (currentProduct.mainImg && currentProduct.mainImg.startsWith("/uploads/")) {
                    const oldPath = path.join(getUploadDir(), currentProduct.mainImg.replace("/uploads/", ""));
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }
                finalMainImg = saveBase64Image(product.mainImg);
            }

            // 2. Evaluate Angle Multi-view image configurations
            let finalAngleImgs = currentProduct.angleImgs || [null, null, null, null];
            if (Array.isArray(product.angleImgs)) {
                finalAngleImgs = product.angleImgs.map((incomingImg, i) => {
                    const currentImg = finalAngleImgs[i];
                    
                    // If unchanged, keep it
                    if (incomingImg === currentImg) return currentImg;

                    // If it was cleared or updated, prune old path
                    if (currentImg && currentImg.startsWith("/uploads/")) {
                        const oldPath = path.join(getUploadDir(), currentImg.replace("/uploads/", ""));
                        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                    }

                    // Process fresh raw base64 uploads
                    return saveBase64Image(incomingImg);
                });
            }

            const updatedData = {
                type: product.type || currentProduct.type,
                name: product.name || currentProduct.name,
                category: product.category || currentProduct.category,
                variant: product.variant || currentProduct.variant,
                description: product.description !== undefined ? product.description : currentProduct.description,
                width: product.width ? parseFloat(product.width) : currentProduct.width,
                height: product.height ? parseFloat(product.height) : currentProduct.height,
                unit: product.unit || currentProduct.unit,
                pricePerSqFt: product.pricePerSqFt ? parseFloat(product.pricePerSqFt) : currentProduct.pricePerSqFt,
                estimatedCost: product.estimatedCost ? parseFloat(product.estimatedCost) : currentProduct.estimatedCost,
                mainImg: finalMainImg,
                angleImgs: finalAngleImgs,
                active: product.active !== undefined ? product.active : currentProduct.active,
                updatedAt: new Date()
            };

            await update_one_helper("products", { _id: new ObjectId(productId) }, { $set: updatedData });
            await actionLog(userId, "Update Product", `${fullName} Updated product: ${currentProduct.name}`);
            const updatedPayload = { ...currentProduct, ...updatedData };
            return res.status(200).json({ remarks: "success", message: "Product updated successfully", payload: updatedPayload });
        });
    } catch (err) {
        console.error("Error in /api/update_product:", err);
        return res.status(500).json({ error: err.message || err });
    }
});

productRoutes.post("/api/delete_product/:id", async (req, res) => {
    const token = req.body.token;
    const userId = req.body._id;
    const id = req.params.id;
    const fullName = req.body.fullName;
    let response = {};

    if (!token) return res.status(400).json({ error: "Token is required" });
    
    try {
        checkAuth(token, userId, async (isValid) => {
            if (!isValid) return res.status(401).json({ error: "Unauthorized" });

            const product_query = [{ $match: { _id: new ObjectId(id) } }];
            const productResult = await get_data_helper("products", product_query);

            if (productResult?.payload?.length > 0) {
                const product = productResult.payload[0];

                // Delete main image if it exists
                if (product.mainImg && product.mainImg.startsWith("/uploads/")) {
                    const filePath = path.join(getUploadDir(), product.mainImg.replace("/uploads/", ""));
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                }

                // Delete accompanying viewing angle images out of storage directory
                if (product.angleImgs && Array.isArray(product.angleImgs)) {
                    product.angleImgs.forEach(img => {
                        if (img && img.startsWith("/uploads/")) {
                            const filePath = path.join(getUploadDir(), img.replace("/uploads/", ""));
                            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                        }
                    });
                }

                const result = await delete_or_archive_helper("products", { _id: new ObjectId(id) });
                await actionLog(userId, "Delete Product", `${fullName} Deleted product: ${result.payload[0].name}`);
                response = { remarks: "success", message: "Product and associated images deleted successfully", payload: result };
            } else {
                response = { remarks: "failed", message: "Product not found" };
            }
            return res.status(200).json(response);
        });
    } catch (err) {
        console.error("Error in /api/delete_product:", err);
        return res.status(500).json({ error: err.message || err });
    }
});

productRoutes.get("/api/featured_products", async (req, res) => {
    try {
        const result = await get_data_helper("products", [
            { $match: { active: true } },
            { $sample: { size: 3 } }
        ]);
        return res.status(200).json(result);
    } catch (err) {
        console.error("Error in /api/featured_products:", err);
        return res.status(500).json({ error: err.message || err });
    }
});

module.exports = productRoutes;