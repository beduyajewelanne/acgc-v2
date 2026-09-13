const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const { ObjectId } = require('mongodb');
const XLSX = require('xlsx');
const archiver = require('archiver');
// ✅ Corrected: Using CommonJS require to load your helper database utility module cleanly
const dbo = require('../helper/db');

const backupRouter = express.Router();
// Matches helper/db.js exactly: same env var (ATLAS_URI) and same environment-based
// database name selection (REACT_APP_ENV), so backups always hit the actual DB the
// rest of the app is connected to instead of a local fallback that doesn't exist.
const DB_URI = process.env.ATLAS_URI;
const DB_NAME = process.env.REACT_APP_ENV === "production" ? "acgc-production" : "acgc-development";
if (!DB_URI) {
  console.error("❌ Error: ATLAS_URI is not defined in your environment variables. Backups will fail.");
}
const BACKUP_DIR = path.join(process.cwd(), 'backups');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
// Assumption: transactions live in a "transactions" collection with the same
// field names used in Transactions.jsx (dateCreated, clientName, totalPayment,
// manualOverride/estimatedTotal, measurements[].product). Change this if your
// actual collection name is different.
const TRANSACTIONS_COLLECTION = "transactions";

if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Core Helper: Format file bytes cleanly to KB/MB for your UI size column
 */
const formatBytes = (bytes, decimals = 1) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Recursively sums up file sizes inside a folder (mongodump creates a
 * subfolder per database, so a shallow read was always reporting ~0 bytes).
 */
const getFolderSizeBytes = (dirPath) => {
    let total = 0;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            total += getFolderSizeBytes(fullPath);
        } else {
            total += fs.statSync(fullPath).size;
        }
    }
    return total;
};

/**
 * Copies the uploads folder (contracts, payment proofs, etc.) into a backup
 * folder. Only used for "Full System" backups so there's an actual, meaningful
 * difference between that and the DB-only Weekly/Monthly/Yearly backups.
 */
const copyUploadsFolder = (destBackupPath) => {
    if (!fs.existsSync(UPLOADS_DIR)) return;
    const dest = path.join(destBackupPath, 'uploads');
    fs.cpSync(UPLOADS_DIR, dest, { recursive: true });
};

/**
 * Builds "Transactions_Summary.xlsx" inside a backup folder: money that came in
 * (paid amount) and the project/product per client, grouped into one sheet per
 * month so it's easy to scan a specific month's transactions.
 */
const generateTransactionsExcel = async (db, backupPath) => {
    // Mirrors the same $match + $group pipeline used by /api/get_transactions
    // in cart.js — actual transaction data lives in "order_requests" (grouped
    // per orderId), not in a flat "transactions" collection.
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

    const rawGroups = await db.collection("order_requests").aggregate(pipeline).toArray();

    // Normalize into the same field shape the rest of this function expects
    // (matches what the Transaction Management page displays).
    const transactions = rawGroups.map(group => {
        const b = group.baseDoc;
        return {
            clientName: b.clientName || "Unknown Client",
            dateCreated: b.createdAt || "",
            totalPayment: b.totalPayment || 0,
            manualOverride: parseFloat(b.manualOverride) || "",
            estimatedTotal: b.estimatedTotal || group.totalEstimatedCost || 0,
            measurements: group.measurements
        };
    });

    // Group rows by "Month Year" (e.g. "January 2026") based on dateCreated
    const monthGroups = new Map();
    transactions.forEach(t => {
        const created = t.dateCreated ? new Date(t.dateCreated) : null;
        const monthKey = created && !isNaN(created)
            ? created.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            : 'Undated';

        const totalAmount = Number(t.manualOverride || t.estimatedTotal || 0);
        const paidAmount = Number(t.totalPayment || 0);
        const projectLabel = t.measurements && t.measurements.length > 0
            ? t.measurements.map(m => m.product).join(", ")
            : (t.category || "—");

        const row = {
            "Date": created && !isNaN(created) ? created.toLocaleDateString('en-PH') : '—',
            "Client": t.clientName || '—',
            "Project / Product": projectLabel,
            "Amount Paid": paidAmount,
            "Total Amount": totalAmount,
            "Balance": totalAmount - paidAmount,
            "Status": paidAmount >= totalAmount ? "Paid" : "Pending"
        };

        if (!monthGroups.has(monthKey)) monthGroups.set(monthKey, []);
        monthGroups.get(monthKey).push(row);
    });

    // Sort month keys chronologically (Undated goes last)
    const sortedMonthKeys = [...monthGroups.keys()].sort((a, b) => {
        if (a === 'Undated') return 1;
        if (b === 'Undated') return -1;
        return new Date(`1 ${a}`) - new Date(`1 ${b}`);
    });

    const workbook = XLSX.utils.book_new();

    // Overview sheet: total money in per month, so it's the first thing you see
    const overviewRows = sortedMonthKeys.map(key => {
        const rows = monthGroups.get(key);
        const totalPaid = rows.reduce((sum, r) => sum + r["Amount Paid"], 0);
        return { "Month": key, "Transactions": rows.length, "Total Paid": totalPaid };
    });
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(overviewRows), "Overview");

    // One sheet per month with the actual transaction rows
    sortedMonthKeys.forEach(key => {
        const sheetName = key.slice(0, 31); // Excel sheet name limit
        const sheet = XLSX.utils.json_to_sheet(monthGroups.get(key));
        XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
    });

    const excelPath = path.join(backupPath, 'Transactions_Summary.xlsx');
    XLSX.writeFile(workbook, excelPath);
    return excelPath;
};

/**
 * Core Backup Logic - Runs the dump and logs metadata directly to backup_history
 */
const runDatabaseBackup = async (backupType = "Manual") => {
    const db = dbo.getDb();
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const prefix = `${backupType.toUpperCase().replace(/\s+/g, '_')}_BACKUP_${timestamp}`;
    const backupFolderName = `backup-${prefix}-${Date.now()}`;
    const backupPath = path.join(BACKUP_DIR, backupFolderName);

    // 1. Initial Insertion: Put the record in "In Progress" status for your UI
    const historyRecord = {
        backupName: prefix,
        date: new Date(),
        type: backupType,
        size: "0 MB",
        status: "In Progress",
        path: backupPath
    };
    
    const insertionResult = await db.collection("backup_history").insertOne(historyRecord);
    const recordId = insertionResult.insertedId;

    return new Promise((resolve, reject) => {
        const command = `mongodump --uri="${DB_URI}" --db="${DB_NAME}" --out="${backupPath}"`;

        exec(command, async (error, stdout, stderr) => {
            if (error) {
                // 2a. Update historical record to 'Failed' if error occurs
                await db.collection("backup_history").updateOne(
                    { _id: recordId },
                    { $set: { status: "Failed" } }
                );
                return reject(error);
            }

            // 3. Calculate Folder Size to display on dashboard
            let folderSizeString = "0 Bytes";
            try {
                folderSizeString = formatBytes(getFolderSizeBytes(backupPath));
            } catch (szErr) {
                console.error("[Backup] Size calculation failed:", szErr.message);
            }

            // 3b. "Full System" also grabs the uploads folder (contracts, payment
            // proofs, etc.) so it's an actual full copy, not just the database.
            if (backupType === "Full System") {
                try {
                    copyUploadsFolder(backupPath);
                    folderSizeString = formatBytes(getFolderSizeBytes(backupPath));
                } catch (upErr) {
                    console.error("[Backup] Copying uploads folder failed:", upErr.message);
                }
            }

            // 4. Generate the transactions Excel summary alongside this backup.
            // Wrapped so that a problem here (e.g. empty collection) never fails
            // the backup itself — the mongodump already succeeded at this point.
            try {
                await generateTransactionsExcel(db, backupPath);
            } catch (xlsxErr) {
                console.error("[Backup] Transactions_Summary.xlsx generation failed:", xlsxErr.message);
            }

            // 2b. Success: Update historical collection item data 
            await db.collection("backup_history").updateOne(
                { _id: recordId },
                { $set: { status: "Success", size: folderSizeString } }
            );

            resolve({ success: true, path: backupPath });
        });
    });
};

/**
 * DYNAMIC CRON ENGINE 
 * Runs every hour on the hour (:00) to evaluate user options chosen on your frontend UI page
 */
cron.schedule('0 * * * *', async () => {
    const db = dbo.getDb();
    const now = new Date();
    
    try {
        // Query configurations collection setup document 
        const settings = await db.collection("backup_settings").findOne({ _id: "system_backup_config" });
        if (!settings) return; // No parameters set yet

        const scheduleType = settings.activeSchedule.toLowerCase(); // weekly, monthly, yearly, full
        let shouldRun = false;

        // Determine matching requirements based on dates
        if (scheduleType === 'weekly' && now.getDay() === 0 && now.getHours() === 0) {
            // Sunday at Midnight
            shouldRun = true;
        } else if (scheduleType === 'monthly' && now.getDate() === 1 && now.getHours() === 0) {
            // 1st of Month at Midnight
            shouldRun = true;
        } else if (scheduleType === 'yearly' && now.getMonth() === 11 && now.getDate() === 31 && now.getHours() === 0) {
            // Dec 31st at Midnight
            shouldRun = true;
        } else if (scheduleType === 'full') {
            // Custom full backup cycle logic (e.g. running daily)
            if (now.getHours() === 0) shouldRun = true; 
        }

        if (shouldRun) {
            console.log(`[Cron Engine] Starting scheduled backup type: ${settings.activeSchedule}`);
            const typeLabel = scheduleType.charAt(0).toUpperCase() + scheduleType.slice(1);
            await runDatabaseBackup(typeLabel === "Full" ? "Full System" : typeLabel);
        }
    } catch (cronErr) {
        console.error("[Cron Engine System Exception]:", cronErr.message);
    }
});

/**
 * ====================================================================
 * API ENDPOINTS FOR YOUR UI FRONTEND
 * ====================================================================
 */

// 1. GET SETTINGS & HISTORY (Loads your metrics cards and tables)
backupRouter.get('/api/backup/dashboard', async (req, res) => {
    try {
        const db = dbo.getDb();
        const settings = await db.collection("backup_settings").findOne({ _id: "system_backup_config" }) || { activeSchedule: "weekly" };
        const history = await db.collection("backup_history").find({}).sort({ date: -1 }).toArray();

        // Calculate metadata summaries on-the-fly for metrics indicators cards
        const totalRecords = history.length;
        const lastBackupDoc = history.find(b => b.status === "Success");
        const lastBackupDate = lastBackupDoc ? lastBackupDoc.date : "Never";
        
        const successCount = history.filter(b => b.status === "Success").length;
        const successRate = totalRecords > 0 ? Math.round((successCount / totalRecords) * 100) : 100;

        return res.status(200).json({
            remarks: "success",
            payload: {
                settings,
                history,
                metrics: {
                    lastBackup: lastBackupDate,
                    backupStatus: lastBackupDoc ? "Success" : "No Backup Found",
                    totalRecords,
                    successRate: `${successRate}%`
                }
            }
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// 2. UPDATE SCHEDULE SELECTION (Triggered when changing the radio options selection buttons)
backupRouter.post('/api/backup/update-schedule', async (req, res) => {
    const { activeSchedule } = req.body; // Expects "weekly" | "monthly" | "yearly" | "full"
    try {
        const db = dbo.getDb();
        await db.collection("backup_settings").updateOne(
            { _id: "system_backup_config" },
            { $set: { activeSchedule, updatedAt: new Date() } },
            { upsert: true }
        );
        return res.status(200).json({ remarks: "success", message: "Backup settings routine updated successfully" });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// 3. FORCE BACKUP INSTANTLY ("Backup Now" button interaction)
backupRouter.post('/api/backup/run-manual', async (req, res) => {
    try {
        const db = dbo.getDb();
        // Look up settings to grab the target contextual profile string
        const settings = await db.collection("backup_settings").findOne({ _id: "system_backup_config" }) || { activeSchedule: "Weekly" };
        let typeString = settings.activeSchedule === "full" ? "Full System" : settings.activeSchedule;
        typeString = typeString.charAt(0).toUpperCase() + typeString.slice(1);

        const result = await runDatabaseBackup(typeString);
        return res.status(200).json({ remarks: "success", message: "Manual collection snapshot backed up successfully", payload: result });
    } catch (err) {
        return res.status(500).json({ remarks: "failed", error: err.message });
    }
});

// 4. DOWNLOAD A BACKUP (zips the backup folder — DB dump + Transactions_Summary.xlsx
//    + uploads if it was a Full System backup — and streams it as one .zip file)
backupRouter.get('/api/backup/download/:id', async (req, res) => {
    console.log(`[Backup] Download requested for id: ${req.params.id}`);
    try {
        const db = dbo.getDb();
        let record;
        try {
            record = await db.collection("backup_history").findOne({ _id: new ObjectId(req.params.id) });
        } catch (idErr) {
            console.error("[Backup] Invalid backup id:", idErr.message);
            return res.status(400).json({ error: "Invalid backup id" });
        }
        if (!record) {
            console.error("[Backup] No backup_history record found for that id");
            return res.status(404).json({ error: "Backup record not found" });
        }
        if (!record.path || !fs.existsSync(record.path)) {
            console.error("[Backup] Backup path missing on disk:", record.path);
            return res.status(404).json({ error: "Backup files no longer exist on disk" });
        }

        console.log(`[Backup] Zipping folder: ${record.path}`);
        res.attachment(`${record.backupName}.zip`);
        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.on('error', (archiveErr) => {
            console.error("[Backup] Zip stream error:", archiveErr);
            if (!res.headersSent) res.status(500).end();
        });
        archive.on('warning', (warn) => {
            console.warn("[Backup] Zip warning:", warn);
        });
        res.on('close', () => console.log(`[Backup] Download response closed (bytes written: ${archive.pointer()})`));
        archive.pipe(res);
        archive.directory(record.path, false);
        await archive.finalize();
        console.log(`[Backup] Zip finalized successfully for ${record.backupName}`);
    } catch (err) {
        console.error("[Backup] Download route crashed:", err);
        if (!res.headersSent) return res.status(500).json({ error: err.message });
    }
});

// ✅ Now perfectly matching your main file's require syntax structure setup
module.exports = backupRouter;