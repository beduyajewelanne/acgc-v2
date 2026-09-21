const express = require("express");
const notificationRoutes = express.Router();
const dbo = require("../helper/db");
const { ObjectId } = require("mongodb");
const { checkAuth } = require("../helper/Helper");
const notificationsCollection = () => dbo.getDb().collection("notifications");
const dedupeLocksCollection = () => dbo.getDb().collection("notification_dedupe_locks");

let dedupeIndexesEnsured = false;
async function ensureDedupeIndexes() {
    if (dedupeIndexesEnsured) return;
    try {
        await dedupeLocksCollection().createIndex({ type: 1, orderId: 1, discriminator: 1 }, { unique: true });
        dedupeIndexesEnsured = true;
    } catch (err) {
        console.error("[Notifications] Failed to ensure dedupe indexes:", err.message);
    }
}

async function pushNotification({ recipientRole, recipientId = null, type, title, message, link = null, orderId = null }) {
    try {
        await notificationsCollection().insertOne({
            recipientRole,                                   // "admin" | "customer"
            recipientId: recipientId ? new ObjectId(recipientId) : null,
            type,
            title,
            message,
            link,
            orderId: orderId || null,
            read: false,
            createdAt: new Date()
        });
    } catch (err) {
        console.error("[Notifications] Failed to insert notification:", err.message);
    }
}
async function claimNotificationSlot(type, orderId, discriminator = null) {
    if (!orderId) return true; // walang orderId na pagbabasehan ng dedupe, palagi na lang payagan (dating behavior din ito)
    await ensureDedupeIndexes();
    try {
        await dedupeLocksCollection().insertOne({ type, orderId, discriminator, createdAt: new Date() });
        return true;
    } catch (err) {
        if (err.code === 11000) return false; // duplicate key = may nauna nang naka-claim
        console.error("[Notifications] Dedupe claim error, allowing notification through:", err.message);
        return true; 
    }
}

function startWatchers() {
    let db;
    try {
        db = dbo.getDb();
    } catch (e) {
        db = null;
    }

    if (!db) {
        setTimeout(startWatchers, 2000);
        return;
    }

    try {
        // ---------- ORDER REQUESTS WATCHER ----------
        const orderStream = db.collection("order_requests").watch([], { fullDocument: "updateLookup" });

        orderStream.on("change", async (change) => {
            try {
                const doc = change.fullDocument;
                if (!doc) return;

                if (change.operationType === "insert") {
                    if (!(await claimNotificationSlot("new_order", doc.orderId))) return;

                    await pushNotification({
                        recipientRole: "admin",
                        type: "new_order",
                        title: "New Order Request",
                        message: `${doc.clientName || "A customer"} submitted a new order request (${doc.orderId}).`,
                        link: "/admin/site-inspections",
                        orderId: doc.orderId
                    });

                    if (doc.user_id) {
                        await pushNotification({
                            recipientRole: "customer",
                            recipientId: doc.user_id,
                            type: "order_submitted",
                            title: "Order Request Submitted",
                            message: `Your order request (${doc.orderId}) has been submitted successfully. We'll notify you once it's reviewed.`,
                            link: "/orders",
                            orderId: doc.orderId
                        });
                    }
                    return;
                }

                if (change.operationType === "update") {
                    const updated = change.updateDescription?.updatedFields || {};

                    // ---- 1. Customer cancelled an order (cancel_order_request sets isCancelled:1) ----
                    if ("isCancelled" in updated && updated.isCancelled === 1) {
                        if (await claimNotificationSlot("order_cancelled", doc.orderId)) {
                            await pushNotification({
                                recipientRole: "admin",
                                type: "order_cancelled",
                                title: "Order Cancelled",
                                message: `${doc.clientName || "A customer"} cancelled order request ${doc.orderId}.`,
                                link: "/admin/site-inspections",
                                orderId: doc.orderId
                            });

                            if (doc.user_id) {
                                await pushNotification({
                                    recipientRole: "customer",
                                    recipientId: doc.user_id,
                                    type: "order_cancelled_confirm",
                                    title: "Order Cancelled",
                                    message: `Your order request (${doc.orderId}) has been cancelled successfully.`,
                                    link: "/orders",
                                    orderId: doc.orderId
                                });
                            }
                        }
                    }

                    // ---- 2. Contract confirmed/declined (client_respond_contract / manual_approve_order) ----
                    if ("contractApproved" in updated) {
                        const approved = updated.contractApproved === 1;
                        if (await claimNotificationSlot("contract_decision", doc.orderId, approved)) {
                            await pushNotification({
                                recipientRole: "admin",
                                type: "contract_decision",
                                title: approved ? "Contract Approved" : "Contract Declined",
                                message: `Contract for order ${doc.orderId} was ${approved ? "approved" : "declined"}.`,
                                link: "/admin/transactions",
                                orderId: doc.orderId
                            });

                            if (doc.user_id) {
                                await pushNotification({
                                    recipientRole: "customer",
                                    recipientId: doc.user_id,
                                    type: "contract_decision_customer",
                                    title: approved ? "Contract Approved" : "Contract Declined",
                                    message: approved
                                        ? `Your contract for order ${doc.orderId} has been approved.`
                                        : `Your contract for order ${doc.orderId} was declined.`,
                                    link: "/contracts",
                                    orderId: doc.orderId
                                });
                            }
                        }
                    }

                    // ---- 3. Contract sent to customer for review ----
                    if ("contractSentToCustomer" in updated && updated.contractSentToCustomer === true) {
                        if (doc.user_id && await claimNotificationSlot("contract_sent", doc.orderId)) {
                            await pushNotification({
                                recipientRole: "customer",
                                recipientId: doc.user_id,
                                type: "contract_sent",
                                title: "Contract Ready for Review",
                                message: `A contract for order ${doc.orderId} has been sent to you for review.`,
                                link: "/contracts",
                                orderId: doc.orderId
                            });
                        }
                    }

                    // ---- 4. Order marked Completed ----
                    if ("status" in updated && updated.status === "Completed") {
                        if (doc.user_id && await claimNotificationSlot("order_completed", doc.orderId)) {
                            await pushNotification({
                                recipientRole: "customer",
                                recipientId: doc.user_id,
                                type: "order_completed",
                                title: "Order Completed",
                                message: `Your order (${doc.orderId}) has been marked as completed.`,
                                link: "/orders",
                                orderId: doc.orderId
                            });
                        }
                    }
                }
            } catch (innerErr) {
                console.error("[Notifications] order_requests watcher processing error:", innerErr.message);
            }
        });

        orderStream.on("error", (err) => {
            console.error("[Notifications] order_requests change stream error (needs replica set/Atlas):", err.message);
        });

        // ---------- FEEDBACK / RATINGS WATCHER ----------
        const feedbackStream = db.collection("feedbacks").watch([], { fullDocument: "updateLookup" });

        feedbackStream.on("change", async (change) => {
            try {
                if (change.operationType !== "insert") return;
                const doc = change.fullDocument;
                if (!doc) return;

                await pushNotification({
                    recipientRole: "admin",
                    type: "new_rating",
                    title: "New Customer Rating",
                    message: `${doc.userName || "A customer"} left a ${doc.rating}-star rating${doc.productName ? ` for ${doc.productName}` : ""}.`,
                    link: "/admin/products",
                    orderId: doc.orderId || null
                });
            } catch (innerErr) {
                console.error("[Notifications] feedbacks watcher processing error:", innerErr.message);
            }
        });

        feedbackStream.on("error", (err) => {
            console.error("[Notifications] feedbacks change stream error (needs replica set/Atlas):", err.message);
        });

        console.log("[Notifications] Change stream watchers started successfully.");
    } catch (err) {
        console.error("[Notifications] Could not start change streams. This DB deployment may not support them (requires a MongoDB replica set / Atlas):", err.message);
    }
}
setTimeout(startWatchers, 3000);

// 1. GET NOTIFICATIONS (customer or admin, depende sa "role" na ipapasa)
notificationRoutes.post("/api/get_notifications", async (req, res) => {
    const { token, _id, role } = req.body;
    if (!token) return res.status(401).json({ remarks: "failed", message: "Unauthorized" });

    try {
        checkAuth(token, _id, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "failed", message: "Unauthorized" });

            const isAdmin = String(role).toLowerCase() === "admin";
            const filter = isAdmin
                ? { recipientRole: "admin" }
                : {
                    recipientRole: "customer",
                    $or: [{ recipientId: new ObjectId(_id) }, { recipientId: null }]
                };

            const notifications = await notificationsCollection()
                .find(filter)
                .sort({ createdAt: -1 })
                .limit(50)
                .toArray();

            const unreadCount = notifications.filter((n) => !n.read).length;

            return res.status(200).json({
                remarks: "success",
                payload: notifications,
                unreadCount
            });
        });
    } catch (err) {
        console.error("Error in /api/get_notifications:", err);
        return res.status(500).json({ remarks: "error", error: err.message });
    }
});

// 2. MARK ONE NOTIFICATION AS READ
notificationRoutes.post("/api/mark_notification_read", async (req, res) => {
    const { token, _id, notificationId } = req.body;
    if (!token) return res.status(401).json({ remarks: "failed", message: "Unauthorized" });
    if (!notificationId) return res.status(400).json({ remarks: "failed", message: "Missing notificationId" });

    try {
        checkAuth(token, _id, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "failed", message: "Unauthorized" });

            await notificationsCollection().updateOne(
                { _id: new ObjectId(notificationId) },
                { $set: { read: true } }
            );

            return res.status(200).json({ remarks: "success" });
        });
    } catch (err) {
        console.error("Error in /api/mark_notification_read:", err);
        return res.status(500).json({ remarks: "error", error: err.message });
    }
});

// 3. MARK ALL AS READ
notificationRoutes.post("/api/mark_all_notifications_read", async (req, res) => {
    const { token, _id, role } = req.body;
    if (!token) return res.status(401).json({ remarks: "failed", message: "Unauthorized" });

    try {
        checkAuth(token, _id, async (isValid) => {
            if (!isValid) return res.status(401).json({ remarks: "failed", message: "Unauthorized" });

            const isAdmin = String(role).toLowerCase() === "admin";
            const filter = isAdmin
                ? { recipientRole: "admin" }
                : {
                    recipientRole: "customer",
                    $or: [{ recipientId: new ObjectId(_id) }, { recipientId: null }]
                };

            await notificationsCollection().updateMany(filter, { $set: { read: true } });

            return res.status(200).json({ remarks: "success" });
        });
    } catch (err) {
        console.error("Error in /api/mark_all_notifications_read:", err);
        return res.status(500).json({ remarks: "error", error: err.message });
    }
});

module.exports = notificationRoutes;
module.exports.pushNotification = pushNotification;