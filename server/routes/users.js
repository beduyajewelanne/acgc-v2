const express = require("express");
const port = process.env.PORT || 5000;
const dbo = require("../helper/db");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { ObjectId } = require("mongodb"); // Ensure ObjectId is imported
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
                { $match: { archive: { $ne: 1 }, role: { $ne: "admin" } } }
            ]);
            const usersList = usersResult.payload || [];

            // Stitch user documents with their respective configurations inside "access_level"
            const detailedUsers = await Promise.all(usersList.map(async (u) => {
                const accessResult = await get_data_helper("access_level", [
                    { $match: { userId: new ObjectId(u._id) } }
                ]);
                
                return {
                    _id: u._id,
                    firstName: u.firstName,
                    lastName: u.lastName,
                    email: u.email,
                    role: u.role,          // "Staff" or "Customer"
                    subrole: u.subrole,    // "Skilled Worker", "Helper", etc.
                    status: u.status || "Active",
                    modules: accessResult.payload?.[0]?.modules || null
                };
            }));

            return res.status(200).json({ remarks: "success", payload: detailedUsers });
        });
    } catch (err) {
        console.error("Error fetching settings user repository:", err);
        return res.status(500).json({ error: err.message });
    }
});

// 2. GET BASE SYSTEM ACCESS MATRIX TEMPLATE
userRoutes.post("/api/get_base_access_level", async (req, res) => {
    const { token, _id } = req.body;
    try {
        checkAuth(token, _id, async (isValid) => {
            if (!isValid) return res.status(401).json({ error: "Unauthorized" });

            const baseResult = await get_data_helper("base_access_level", [{$limit: 1}]);
            if (!baseResult?.payload?.length) {
                return res.status(404).json({ remarks: "failed", message: "Base layout matrix not found" });
            }
            return res.status(200).json({ remarks: "success", payload: baseResult.payload[0] });
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// 3. SAVE INDIVIDUAL CUSTOM ACCESS PERMISSIONS
userRoutes.post("/api/save_user_access_level", async (req, res) => {
    const { token, _id, targetUserId, modules, subrole, fullName } = req.body;
    const adminName = fullName || "Admin";

    if (!token || !targetUserId || !modules) return res.status(400).json({ error: "Missing properties" });

    try {
        checkAuth(token, _id, async (isValid) => {
            if (!isValid) return res.status(401).json({ error: "Unauthorized" });

            // 1. Update user profile details (like dynamic subroles if changed)
            if (subrole) {
                await update_one_helper("users", 
                    { _id: new ObjectId(targetUserId) }, 
                    { $set: { subrole, updatedAt: new Date() } }
                );
            }

            // 2. Update or insert the custom user override access matrix
            const db_connect = dbo.getDb();
            await db_connect.collection("access_level").updateOne(
                { userId: new ObjectId(targetUserId) },
                { 
                    $set: { 
                        modules: modules,
                        updatedAt: new Date()
                    } 
                },
                { upsert: true }
            );

            // Fetch target user's details for historical tracking context
            const targetUser = await db_connect.collection("users").findOne({ _id: new ObjectId(targetUserId) });
            const targetName = targetUser ? `${targetUser.firstName} ${targetUser.lastName}` : "Personnel";

            // Trigger log registration tracking
            await actionLog(_id, "Manage Access", `${adminName} modified access permission criteria configurations for ${targetName}`);

            return res.status(200).json({ remarks: "success", message: "Permissions updated successfully" });
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// 4. GLOBAL MASS UPDATE CONFIGURATOR FOR CLIENTS
userRoutes.post("/api/apply_global_client_permissions", async (req, res) => {
    const { token, _id, clientModulePermissions, fullName } = req.body;
    const adminName = fullName || "Admin";

    if (!token || !clientModulePermissions) return res.status(400).json({ error: "Payload parameters missing" });

    try {
        checkAuth(token, _id, async (isValid) => {
            if (!isValid) return res.status(401).json({ error: "Unauthorized" });

            const db_connect = dbo.getDb();
            
            // Fetch all users designated under the 'Customer' profile tier
            const customers = await db_connect.collection("users").find({ role: "Customer", archive: { $ne: 1 } }).toArray();
            
            if (customers.length > 0) {
                const bulkOps = customers.map(customer => ({
                    updateOne: {
                        filter: { userId: new ObjectId(customer._id) },
                        update: { 
                            $set: { 
                                "modules.Client": clientModulePermissions,
                                updatedAt: new Date()
                            } 
                        },
                        upsert: true
                    }
                }));
                
                await db_connect.collection("access_level").bulkWrite(bulkOps);
            }

            // Record structural configuration modification event log
            await actionLog(_id, "Manage Access", `${adminName} executed global permissions sync patch deployment to all (${customers.length}) active Client portal accounts`);

            return res.status(200).json({ remarks: "success", message: "Global permissions synced across portals successfully" });
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
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

module.exports = userRoutes;