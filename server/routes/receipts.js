const express = require("express");
const receiptRoutes = express.Router();
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


receiptRoutes.post("/api/get_user_receipts", async (req, res) => {
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
                // {
                //     $lookup: {
                //         from: "products",
                //         localField: "product_id",
                //         foreignField: "_id",
                //         as: "product_details"
                //     }
                // },
                // {
                //     $unwind: {
                //         path: "$product_details",
                //         preserveNullAndEmptyArrays: true
                //     }
                // },
                // {
                //     $project: {
                //         _id: 1,
                //         user_id: 1,
                //         product_id: 1,
                //         width: 1,
                //         height: 1,
                //         unit: 1,
                //         quantity: 1,
                //         createdAt: 1,
                //         updatedAt: 1,
                //         name: "$product_details.name",
                //         price: "$product_details.price",
                //         pricePerSqFt: "$product_details.pricePerSqFt",
                //         estimatedCost: "$product_details.estimatedCost",
                //         mainImg: "$product_details.mainImg",
                //         category: "$product_details.category"
                //     }
                // }
            ]
            const result = await get_data_helper("receipts", query);
            if (result?.payload?.length > 0) {
                // await actionLog(_id, "Viewed receipts");
                return res.status(200).json({ remarks: "success", message: "Receipts retrieved successfully", payload: result.payload });
            } else {
                return res.status(200).json({ remarks: "success", message: "No receipts found", payload: [] });
            }
        });
    } catch (err) {
        console.error("Error fetching receipts:", err);
        return res.status(500).json({ error: err.message });
    }
});
module.exports = receiptRoutes;