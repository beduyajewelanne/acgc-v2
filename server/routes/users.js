const express = require("express");
const port = process.env.PORT || 5000;
const dbo = require("../helper/db");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { ObjectId } = require("mongodb");
const { get_data_helper, check_record_exists, decrypt, insert_one_helper, validateHash, hashPass, update_one_helper, delete_or_archive_helper, checkAuth, actionLog } = require("../helper/Helper");
const userRoutes = express.Router();

// 1. GET ALL SYSTEM USERS WITH THEIR CUSTOM ACCESS LEVELS
userRoutes.post("/api/get_settings_users", async (req, res) => {
    const { token, _id } = req.body;
    if (!token) return res.status(400).json({ error: "Token is required" });

    try {
        checkAuth(token, _id, async (isValid) => {
            if (!isValid) return res.status(401).json({ error: "Unauthorized" });

            // Fetch users from collection
            const usersResult = await get_data_helper("users", [
                { $match: { archive: { $ne: 1 } } }
            ]);
            const usersList = usersResult.payload || [];

            const db = dbo.getDb();

            // Stitch user documents with their respective configurations inside "access_level"
            const detailedUsers = await Promise.all(usersList.map(async (u) => {
                // Find matching access level by string identifier to preserve consistency
                const accessResult = await db.collection("access_level").findOne({ user_id: new ObjectId(u._id) });
                
                return {
                    _id: u._id,
                    firstName: u.firstName,
                    lastName: u.lastName,
                    email: u.email,
                    role: u.role,          // "staff" or "client"
                    subrole: u.subrole,    // "Skilled Worker", "Helper", etc.
                    status: u.status || "Active",
                    modules: accessResult ? accessResult.modules : null
                };
            }));

            return res.status(200).json({ remarks: "success", payload: detailedUsers });
        });
    } catch (err) {
        console.error("Error fetching settings user repository:", err);
        return res.status(500).json({ error: err.message });
    }
});

// Individual User Access Matrix Persist Update (Upgrades / Downgrades / Fine-grained Staff Permissions)
userRoutes.post("/api/update_user_access_level", async (req, res) => {
    try {
        const db = dbo.getDb();
        const { target_user_id, role, subrole, modules } = req.body;

        if (!target_user_id) {
            return res.status(400).json({ remarks: "failed", message: "Missing targeted identifier token" });
        }

        await db.collection("users").updateOne(
            { _id: new ObjectId(target_user_id) },
            { $set: { role: role.toLowerCase(), subrole: subrole || null } }
        );

        const isStaffTier = role?.toLowerCase() === 'staff' || role?.toLowerCase() === 'admin';
        let updateOperations = {};

        if (isStaffTier) {
            const safeStaffModules = { ...modules };
            updateOperations = {
                $set: { modules: safeStaffModules },
            };
        } else {
            updateOperations = {
                $set: { modules: modules }
            };
        }

        // 2. Synchronize target security data matching by user_id string
        await db.collection("access_level").updateOne(
            { user_id: new ObjectId(target_user_id) }, 
            updateOperations,
            { upsert: true }
        );

        res.json({ remarks: "success", message: "User privileges written successfully" });

    } catch (err) {
        console.error("Individual User Permission Write Fail:", err);
        res.status(500).json({ remarks: "failed", message: "Internal server error occurred", error: err.message });
    }
});

// GLOBAL MASS UPDATE CONFIGURATOR FOR CLIENTS
userRoutes.post("/api/update_global_customer_permissions", async (req, res) => {
    const db = dbo.getDb();
    const { client_modules } = req.body;
    
    // Normalize fetching target client roles
    const users = await db.collection("users").find({ role: { $in: ["client", "customer"] } }).project({ _id: 1 }).toArray();
    const user_ids = users.map(u => u._id);
    
    if (user_ids.length === 0) {
        return res.json({ remarks: "success", message: "No customer users found to update" });
    }
    
    const baseTemplate = {
        type: "client",
        modules: {
            "Client": client_modules,
            "Dashboard": { "View": 0 },
            "Site Inspection": { "View": 0, "Add": 0, "View Details": 0, "Edit": 0, "Cancel": 0, "Generate Contract": 0 },
            "Progress Monitor": { "View": 0, "View Details": 0, "Edit": 0 },
            "Products": { "View": 0, "Add": 0, "Edit": 0, "Delete": 0 },
            "Transactions": { "View": 0, "View Details": 0, "Edit": 0, "View Contract": 0, "Download Contract": 0 },
            "Settings": { "View": 0, "Manage Access": 0, "Back Up": 0 },
            "Profile": { "View": 1, "Edit Profile": 1 }
        }
    };
    
    await db.collection("base_access_level").updateOne(
        { type: "client" },
        { $set: baseTemplate },
        { upsert: true }
    );
    
    await db.collection("access_level").updateMany(
        { user_id : { $in : user_ids }},
        { $set: { "modules.Client": client_modules } }
    );

    res.json({ remarks: "success", message: "Global configurations synchronized" });
});

userRoutes.post("/api/get_user_access_level", async (req, res) => {
    const { token, _id } = req.body;
    if (!token) return res.status(400).json({ error: "Token is required" });

    try {
        checkAuth(token, _id, async (isValid) => {
            if (!isValid) return res.status(401).json({ error: "Unauthorized" });

            const db_connect = dbo.getDb();
            const result = await db_connect.collection("access_level").findOne({ user_id: new ObjectId(_id) });
            if (result) {
                return res.status(200).json({ remarks: "success", message: "Data fetched successfully", payload: result });
            } else {
                return res.status(200).json({ remarks: "failed", message: "No data found", payload: null });
            }
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

userRoutes.post("/api/get_global_client_template", async (req, res) => {
  try {
    const db = dbo.getDb();
    const baseTemplate = await db.collection("base_access_level").findOne({ type: "client" });
    
    if (baseTemplate && baseTemplate.modules && baseTemplate.modules.Client) {
      return res.json({ 
        remarks: "success", 
        payload: baseTemplate.modules.Client 
      });
    }
    
    return res.json({ 
      remarks: "success", 
      payload: {
        "Request Orders": 0,
        "View Only": 0,
        "Track Project Progress": 0,
        "Request Site Inspection": 0,
        "Estimate Pricing": 0
      } 
    });
    
  } catch (err) {
    console.error("Fetch global template error:", err);
    res.status(500).json({ remarks: "failed", message: "Server error reading base matrix template" });
  }
});


userRoutes.post ("/api/get_user_profile", async (req, res) => {
    const { token, _id } = req.body;
    if (!token) return res.status(400).json({ error: "Token is required" });

    try {
        checkAuth(token, _id, async (isValid) => {
            if (!isValid) return res.status(401).json({ error: "Unauthorized" });

            const db_connect = dbo.getDb();
            const result = await db_connect.collection("users").findOne({ _id: new ObjectId(_id) });
            delete result.password;
            if (result) {
                return res.status(200).json({ remarks: "success", message: "Data fetched successfully", payload: result });
            } else {
                return res.status(200).json({ remarks: "failed", message: "No data found", payload: null });
            }
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

userRoutes.post("/api/get_user_dashboard", async (req, res) => {
    const { token, _id } = req.body;
    if (!token) return res.status(400).json({ error: "Token is required" });

    checkAuth(token, _id, async (isValid) => {
        if (!isValid) return res.status(401).json({ error: "Unauthorized" });

        try {
            const db_connect = dbo.getDb();
            const userObjectId = new ObjectId(_id);

            // FIX: Added .toArray() to fully resolve cursors into plain data arrays
            const orders = await db_connect.collection("order_requests").find({ user_id: userObjectId }).toArray();
            const receipts = await db_connect.collection("receipts").find({ user_id: userObjectId }).toArray();
            const contracts = await db_connect.collection("contracts").find({ user_id: userObjectId }).toArray();

            // Arrays are always truthy, so we check if records were parsed successfully 
            return res.status(200).json({ 
                remarks: "success", 
                message: "Data fetched successfully", 
                payload: { 
                    orders: orders, 
                    receipts: receipts, 
                    contracts: contracts 
                } 
            });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    });
});

userRoutes.post("/api/update_user_profile", async (req, res) => {
    const { token, _id, firstName, lastName, email, phone, address, province, city, barangay, zipCode, password } = req.body;
    
    if (!token) return res.status(400).json({ error: "Token is required" });
    if (!_id) return res.status(400).json({ error: "User ID is required" });

    try {
        // Enforce state session authenticity using your existing validation module hook
        checkAuth(token, _id, async (isValid) => {
            if (!isValid) return res.status(401).json({ error: "Unauthorized" });

            const db = dbo.getDb();
            
            // Build the standard update payload tracking structural geography elements
            const updateFields = {
                firstName: firstName?.trim(),
                lastName: lastName?.trim(),
                email: email?.trim()?.toLowerCase(),
                phone: phone?.trim(),
                address: address?.trim(),
                province: province?.trim(),
                city: city?.trim(),
                barangay: barangay?.trim(),
                zipCode: zipCode?.trim()
            };

            // Optional Security Check: If a user specifies a password string, hash it before committing
            if (password && password.trim() !== "") {
                // Utilizing your helper function 'hashPass' provided in your require destructuring top-level line
                updateFields.password = await hashPass(password.trim());
            }

            // Perform targeted document updates inside the users database collection
            const updateResult = await db.collection("users").updateOne(
                { _id: new ObjectId(_id) },
                { $set: updateFields }
            );

            if (updateResult.matchedCount === 0) {
                return res.status(404).json({ remarks: "failed", message: "User record not found" });
            }

            // Fire audit logging if necessary using your framework helper module
            await actionLog(_id, "Update Profile Details", "Users");

            return res.status(200).json({ 
                remarks: "success", 
                message: "Profile updated successfully"
            });
        });
    } catch (err) {
        console.error("Profile settings writing failure:", err);
        return res.status(500).json({ error: err.message });
    }
});

module.exports = userRoutes;