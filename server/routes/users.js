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

            const db = await dbo.getDb();

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
                    modules: accessResult ? accessResult.modules : null,
                    isSuperAdmin: u.isSuperAdmin === true 
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
        const db = await dbo.getDb();
        const { token, admin_id, target_user_id, role, subrole, modules } = req.body;

        if (!token || !admin_id) {
            return res.status(400).json({ remarks: "failed", message: "Authentication details are required" });
        }
        if (!target_user_id) {
            return res.status(400).json({ remarks: "failed", message: "Missing targeted identifier token" });
        }

        checkAuth(token, admin_id, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "failed", message: "Unauthorized" });

            try {
                if (String(admin_id) === String(target_user_id)) {
                    return res.status(403).json({ remarks: "failed", message: "You cannot modify your own account permissions." });
                }
                const requestingUser = await db.collection("users").findOne({ _id: new ObjectId(admin_id) });
                const requesterIsFullAdmin = requestingUser?.role?.toLowerCase() === "admin" || requestingUser?.isSuperAdmin === true;

                if (!requesterIsFullAdmin) {
                    const requestingAccess = await db.collection("access_level").findOne({ user_id: new ObjectId(admin_id) });
                    const settingsPerms = requestingAccess?.modules?.Settings || {};
                    const canManageAccess = settingsPerms["Edit"] === 1 || settingsPerms["Manage Access"] === 1;

                    if (!canManageAccess) {
                        return res.status(403).json({ remarks: "failed", message: "You do not have permission to modify staff access levels." });
                    }
                }
                const targetUserDoc = await db.collection("users").findOne({ _id: new ObjectId(target_user_id) });
                if (targetUserDoc?.isSuperAdmin) {
                    return res.status(403).json({ remarks: "failed", message: "The Super Admin account is protected and cannot be modified." });
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
    } catch (innerErr) {
        console.error("Individual User Permission Write Fail:", innerErr);
        res.status(500).json({ remarks: "failed", message: "Internal server error occurred", error: innerErr.message });
    }
});

    } catch (err) {
        console.error("Individual User Permission Write Fail:", err);
        res.status(500).json({ remarks: "failed", message: "Internal server error occurred", error: err.message });
    }
});

// GLOBAL MASS UPDATE CONFIGURATOR FOR CLIENTS
userRoutes.post("/api/update_global_customer_permissions", async (req, res) => {
    const db = await dbo.getDb();
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

            const db_connect = await dbo.getDb();
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
    const db = await dbo.getDb();
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
        "Can Track Products": 0,
        "Estimate Pricing": 0,
        "Can upload feedback": 0,
        "Show Ratings Homepage": 0
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

            const db_connect = await dbo.getDb();
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
    if (!token || !_id) return res.status(400).json({ error: "Token and user ID are required" });

    checkAuth(token, _id, async (isValid) => {
        if (!isValid) return res.status(401).json({ error: "Unauthorized" });

        try {
            const db_connect = await dbo.getDb();
            const userObjectId = new ObjectId(_id);

            // 1. Pipeline for Grouped Orders Dashboard Display
            const orderPipeline = [
                {
                    $match: {
                        user_id: userObjectId
                    }
                },
                {
                    $group: {
                        _id: "$orderId", // Group entries sharing the same orderId cluster
                        docId: { $first: "$_id" },
                        user_id: { $first: "$user_id" },
                        clientName: { $first: "$clientName" },
                        clientEmail: { $first: "$clientEmail" },
                        clientPhone: { $first: "$clientPhone" },
                        installationAddress: { $first: "$installationAddress" },
                        clientNotes: { $first: { $ifNull: ["$clientNotes", ""] } },
                        status: { $first: "$status" },
                        isCancelled: { $first: { $ifNull: ["$isCancelled", 0] } },
                        createdAt: { $first: "$createdAt" },
                        quantity: { $first: { $ifNull: ["$quantity", 1] } },
                        paymentTerms: { $first: { $ifNull: ["$paymentTerms", "50% downpayment, 50% upon completion"] } },
                        // Pulls the items into an array structure or preserves the structural sample mapping
                        itemsList: {
                            $push: {
                                product_id: "$itemDetails.product_id",
                                name: "$itemDetails.name",
                                type: "$itemDetails.type",
                                category: "$itemDetails.category",
                                variant: "$itemDetails.variant",
                                width: "$itemDetails.width",
                                height: "$itemDetails.height",
                                unit: "$itemDetails.unit",
                                areaSqFt: "$itemDetails.areaSqFt",
                                ratePerSqFt: "$itemDetails.ratePerSqFt",
                                estimatedCost: "$itemDetails.estimatedCost"
                            }
                        },
                        estimatedTotal: { $sum: "$itemDetails.estimatedCost" }
                    }
                },
                { $sort: { createdAt: -1 } }
            ];

            const rawOrders = await db_connect.collection("order_requests").aggregate(orderPipeline).toArray();

            // // Format grouped results to resemble your precise flat JSON structure mapping
            // const normalizedOrders = rawOrders.map(group => ({
            //     _id: group.docId,
            //     user_id: group.user_id,
            //     clientName: group.clientName || "Unknown Client",
            //     clientEmail: group.clientEmail || "",
            //     clientPhone: group.clientPhone || "",
            //     installationAddress: group.installationAddress || "",
            //     clientNotes: group.clientNotes,
            //     itemDetails: group.itemsList[0] || {}, // Returns the main context product or change to list if needed
            //     orderId: group._id,
            //     status: group.status || "Pending",
            //     isCancelled: group.isCancelled,
            //     createdAt: group.createdAt,
            //     quantity: group.quantity,
            //     paymentTerms: group.paymentTerms,
            //     estimatedTotal: group.estimatedTotal
            // }));

            // 2. Fetch Active Contracts Pipeline 
            const contractPipeline = [
                {
                    $match: {
                        user_id: userObjectId,
                        $or: [
                            { contractApproved: 1 },
                            { contractSentToCustomer: true },
                            { status: "Cancelled" }
                        ]
                    }
                },
                {
                    $group: {
                        _id: "$orderId",
                        docId: { $first: "$_id" },
                        user_id: { $first: "$user_id" },
                        clientName: { $first: "$clientName" },
                        clientEmail: { $first: "$clientEmail" },
                        clientPhone: { $first: "$clientPhone" },
                        installationAddress: { $first: "$installationAddress" },
                        clientNotes: { $first: { $ifNull: ["$clientNotes", ""] } },
                        status: { $first: "$status" },
                        isCancelled: { $first: { $ifNull: ["$isCancelled", 0] } },
                        createdAt: { $first: "$createdAt" },
                        quantity: { $first: { $ifNull: ["$quantity", 1] } },
                        paymentTerms: { $first: "$paymentTerms" },
                        contractLink: { $first: "$contractLink" },
                        contractApproved: { $first: "$contractApproved" },
                        itemsList: {
                            $push: {
                                name: "$itemDetails.name",
                                width: "$itemDetails.width",
                                height: "$itemDetails.height",
                                qty: { $ifNull: ["$quantity", 1] },
                                pricePerSqFt: "$itemDetails.ratePerSqFt"
                            }
                        },
                        estimatedTotal: { $sum: "$itemDetails.estimatedCost" }
                    }
                },
                { $sort: { createdAt: -1 } }
            ];

            const rawContracts = await db_connect.collection("order_requests").aggregate(contractPipeline).toArray();

            const normalizedContracts = rawContracts.map(group => ({
                _id: group.docId,
                orderId: group._id,
                user_id: group.user_id,
                clientName: group.clientName,
                installationAddress: group.installationAddress,
                status: group.status,
                createdAt: group.createdAt,
                estimatedTotal: group.estimatedTotal,
                contractLink: group.contractLink || "#",
                contractApproved: group.contractApproved || 0,
                measurements: group.itemsList
            }));

            return res.status(200).json({ 
                remarks: "success", 
                message: "Dashboard data metrics compiled successfully.", 
                payload: { 
                    orders: rawOrders, 
                    contracts: normalizedContracts 
                } 
            });

        } catch (err) {
            console.error("Dashboard calculation pipeline error:", err);
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

            const db = await dbo.getDb();
            
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

userRoutes.post("/api/update_admin_account", async (req, res) => {
    const { token, user_id, email, currentPassword, newPassword } = req.body;
    
    if (!token) return res.status(400).json({ error: "Token is required" });
    if (!user_id) return res.status(400).json({ error: "User ID is required" });
    if (!email) return res.status(400).json({ error: "Email address is required" });

    try {
        // Enforce state session authenticity using your existing validation module hook
        checkAuth(token, user_id, async (isValid) => {
            if (!isValid) return res.status(401).json({ error: "Unauthorized" });

            const db = await dbo.getDb();
            const targetQuery = { _id: new ObjectId(user_id) };

            // Fetch current record to verify current password and validate email changes
            const userRecord = await db.collection("users").findOne(targetQuery);
            if (!userRecord) {
                return res.status(404).json({ remarks: "failed", message: "User record not found" });
            }

            // Check if email is already allocated to another administrator account
            if (email.trim().toLowerCase() !== userRecord.email?.toLowerCase()) {
                const emailInUse = await db.collection("users").findOne({ 
                    email: email.trim().toLowerCase(), 
                    _id: { $ne: new ObjectId(user_id) } 
                });
                if (emailInUse) {
                    return res.status(400).json({ remarks: "failed", field: "email", message: "This email address is already in use by another account." });
                }
            }

            // Build the standard update payload tracking structural elements
            const updateFields = {
                email: email.trim().toLowerCase()
            };

            // Dynamic Security Validation: If a user changes their password, enforce verification
            if (newPassword && newPassword.trim() !== "") {
                if (!currentPassword || currentPassword.trim() === "") {
                    return res.status(400).json({ remarks: "failed", field: "curPw", message: "Current password is required to update security credentials." });
                }

                // Verify the user's current password matches the database string hash
                const passwordIsValid = validateHash(currentPassword, userRecord.password);
                if (!passwordIsValid) {
                    return res.status(400).json({ remarks: "failed", field: "currentPassword", message: "Incorrect current password verification." });
                }

                // Utilizing your helper function 'hashPass' provided in your helper utilities
                updateFields.password = await hashPass(newPassword.trim());
            }

            // Perform targeted document updates inside the users database collection
            const updateResult = await db.collection("users").updateOne(
                targetQuery,
                { $set: updateFields }
            );

            if (updateResult.matchedCount === 0) {
                return res.status(404).json({ remarks: "failed", message: "User record not found" });
            }

            // Fire audit log action mapping your application helper's signature parameters
            const logActionType = newPassword ? "Update Security Credentials" : "Update Profile Details";
            await actionLog(user_id, logActionType, "Users");

            return res.status(200).json({ 
                remarks: "success", 
                message: "Profile updated successfully"
            });
        });
    } catch (err) {
        console.error("Admin account profile settings writing failure:", err);
        return res.status(500).json({ error: err.message });
    }
});

userRoutes.post("/api/get_logs", async (req, res) => {
    const { token, user_id } = req.body;
    
    if (!token) return res.status(400).json({ error: "Token is required" });
    if (!user_id) return res.status(400).json({ error: "User ID is required" });

    try {
        // Enforce state session authenticity using your existing validation module hook
        checkAuth(token, user_id, async (isValid) => {
            if (!isValid) return res.status(401).json({ error: "Unauthorized" });

            const filter_query = [ 
                {
                    $match: {
                        userId: new ObjectId(user_id)
                    }
                },
                {
                    $sort: { createdAt: -1 }
                }
            ]

            const response = await get_data_helper("action_logs", filter_query);
            if (response && response.payload.length > 0) {
                return res.status(200).json({ 
                    remarks: "success", 
                    message: "Profile updated successfully", 
                    payload: response.payload
                });
            }

        });
    } catch (err) {
        console.error("Profile settings writing failure:", err);
        return res.status(500).json({ error: err.message });
    }
});
userRoutes.post("/api/check_customer_account", async (req, res) => {
    const { token, _id, email } = req.body;

    if (!token) return res.status(400).json({ error: "Token is required" });
    if (!email) return res.status(400).json({ remarks: "failed", message: "Email is required" });

    try {
        checkAuth(token, _id, async (isValid) => {
            if (!isValid) return res.status(401).json({ error: "Unauthorized" });

            const emailCheckQuery = [
                { $match: { email: { $regex: `^${email}$`, $options: "i" } } }
            ];
            const existingEmail = await check_record_exists("users", emailCheckQuery);
            const hasAccount = existingEmail?.payload?.length > 0;

            return res.status(200).json({ remarks: "success", hasAccount });
        });
    } catch (err) {
        console.error("Error checking customer account:", err);
        return res.status(500).json({ error: err.message });
    }
});

module.exports = userRoutes;