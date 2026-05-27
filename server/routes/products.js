const express = require("express");
const productRoutes = express.Router();
const port = process.env.PORT || 5000;
const dbo = require("../helper/db");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { get_data_helper, check_record_exists, decrypt, insert_one_helper, validateHash, hashPass, update_one_helper, checkAuth } = require("../helper/Helper");

//Multer set up
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const getUploadDir = () => {
    const baseDir = __dirname.split("routes")[0];
    return path.join(baseDir, "uploads");
};

// Custom Disk Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, callBack) => {
        const uploadDir = getUploadDir();
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        callBack(null, uploadDir);
    },
    filename: (req, file, callBack) => {
        // Appending timestamp prevents collisions if two users upload "image.png"
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        callBack(null, uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({ storage: storage });

// Helper to remove array of local files if operations fail
const cleanupFiles = (files) => {
    if (files && Array.isArray(files)) {
        files.forEach(file => {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        });
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
                const result = await update_one_helper("products", { _id: new ObjectId(id) }, { $set: { archive: archive } });
                response = { remarks: "success", message: "Data updated successfully", payload: result };
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
                const result = await update_one_helper("products", { _id: new ObjectId(id) }, { $set: { archive: archive } });
                response = { remarks: "success", message: "Data updated successfully", payload: result };
            } else {
                response = { remarks: "failed", message: "No data found", payload: null };
            }
            res.status(200).json(response);
        })
    } catch (err) {
        console.error("Error in /api/restore_product/:id:", err);
        res.status(500).json({ error: err });
    }
})

productRoutes.post("/api/add_product", upload.array("images", 5), async (req, res) => {
    const { token, _id, title, description, category, subcategory, product_type, base_price, max_price } = req.body;

    if (!token) {
        cleanupFiles(req.files);
        return res.status(400).json({ error: "Token is required" });
    }

    try {
        checkAuth(token, _id, async (isValid) => {
            if (!isValid) {
                cleanupFiles(req.files);
                return res.status(401).json({ error: "Unauthorized" });
            }

            // Save the relative URL route for front-end consumption
            const image_urls = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

            const newProduct = {
                title: title || "",
                description: description || "",
                category: category || "",
                subcategory: subcategory || "",
                product_type: product_type || "",
                base_price: parseFloat(base_price) || 0,
                max_price: parseFloat(max_price) || 0,
                image_url: image_urls,
                archive: 0,
                createdAt: new Date()
            };

            const result = await insert_one_helper("products", newProduct);
            return res.status(200).json({ remarks: "success", message: "Product added successfully", payload: result });
        });
    } catch (err) {
        cleanupFiles(req.files);
        console.error("Error in /api/add_product:", err);
        return res.status(500).json({ error: err.message || err });
    }
});

productRoutes.post("/api/update_product/:id", upload.array("images", 5), async (req, res) => {
    const token = req.body.token;
    const userId = req.body._id;
    const productId = req.params.id;
    const { title, description, category, subcategory, product_type, base_price, max_price, existing_images } = req.body;

    if (!token) {
        cleanupFiles(req.files);
        return res.status(400).json({ error: "Token is required" });
    }

    try {
        checkAuth(token, userId, async (isValid) => {
            if (!isValid) {
                cleanupFiles(req.files);
                return res.status(401).json({ error: "Unauthorized" });
            }

            const product_query = [{ $match: { _id: new ObjectId(productId) } }];
            const currentProductResult = await get_data_helper("products", product_query);

            if (!currentProductResult?.payload?.length) {
                cleanupFiles(req.files);
                return res.status(404).json({ remarks: "failed", message: "Product not found" });
            }

            const currentProduct = currentProductResult.payload[0];
            
            // Handle parsing of remaining client-side images
            let retainedImages = [];
            if (existing_images) {
                retainedImages = Array.isArray(existing_images) ? existing_images : [existing_images];
            }

            // Delete physical images that were removed by the client during edit
            if (currentProduct.image_url && Array.isArray(currentProduct.image_url)) {
                currentProduct.image_url.forEach(img => {
                    if (!retainedImages.includes(img)) {
                        const fileName = img.replace("/uploads/", "");
                        const filePath = path.join(getUploadDir(), fileName);
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                    }
                });
            }

            const newUploadedImages = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
            const finalImages = [...retainedImages, ...newUploadedImages];

            const updatedData = {
                title: title || currentProduct.title,
                description: description || currentProduct.description,
                category: category || currentProduct.category,
                subcategory: subcategory || currentProduct.subcategory,
                product_type: product_type || currentProduct.product_type,
                base_price: base_price ? parseFloat(base_price) : currentProduct.base_price,
                max_price: max_price ? parseFloat(max_price) : currentProduct.max_price,
                image_url: finalImages,
                updatedAt: new Date()
            };

            const result = await update_one_helper("products", { _id: new ObjectId(productId) }, { $set: updatedData });
            return res.status(200).json({ remarks: "success", message: "Product updated successfully", payload: result });
        });
    } catch (err) {
        cleanupFiles(req.files);
        console.error("Error in /api/update_product:", err);
        return res.status(500).json({ error: err.message || err });
    }
});

productRoutes.post("/api/delete_product/:id", async (req, res) => {
    const token = req.body.token;
    const userId = req.body._id;
    const id = req.params.id;
    let response = {};

    if (!token) return res.status(400).json({ error: "Token is required" });
    
    try {
        checkAuth(token, userId, async (isValid) => {
            if (!isValid) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const product_query = [{ $match: { _id: new ObjectId(id) } }];
            const productResult = await get_data_helper("products", product_query);

            if (productResult?.payload?.length > 0) {
                const product = productResult.payload[0];

                // Delete all accompanying images out of storage directory
                if (product.image_url && Array.isArray(product.image_url)) {
                    product.image_url.forEach(img => {
                        const fileName = img.replace("/uploads/", "");
                        const filePath = path.join(getUploadDir(), fileName);

                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                    });
                }

                const result = await delete_one_helper("products", { _id: new ObjectId(id) });
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

module.exports = productRoutes;