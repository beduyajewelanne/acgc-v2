const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { ObjectId } = require('mongodb');
const XLSX = require('xlsx');
const archiver = require('archiver');
const dbo = require('../helper/db');

const backupRouter = express.Router();

// Helper to get writable temporary folder on Vercel (/tmp)
const getTempBackupDir = (folderName) => {
    return path.join(os.tmpdir(), 'backups', folderName);
};

const formatBytes = (bytes, decimals = 1) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const generateTransactionsExcel = async (db, backupPath) => {
    const pipeline = [
        {
            $match: {$or: [
                    { contractApproved: { $exists: true,$ne: null } },
                    { totalPayment: { $gt: 0 } },
                    { downpaymentPaid: true },
                    { contractSentToCustomer: true },
                    { contractLink: { $exists: true,$nin: [null, "", "#"] } }
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

    const sortedMonthKeys = [...monthGroups.keys()].sort((a, b) => {
        if (a === 'Undated') return 1;
        if (b === 'Undated') return -1;
        return new Date(`1 ${a}`) - new Date(`1 ${b}`);
    });

    const workbook = XLSX.utils.book_new();

    const overviewRows = sortedMonthKeys.map(key => {
        const rows = monthGroups.get(key);
        const totalPaid = rows.reduce((sum, r) => sum + r["Amount Paid"], 0);
        return { "Month": key, "Transactions": rows.length, "Total Paid": totalPaid };
    });
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(overviewRows), "Overview");

    sortedMonthKeys.forEach(key => {
        const sheetName = key.slice(0, 31);
        const sheet = XLSX.utils.json_to_sheet(monthGroups.get(key));
        XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
    });

    const excelPath = path.join(backupPath, 'Transactions_Summary.xlsx');
    XLSX.writeFile(workbook, excelPath);
    return excelPath;
};

// Pure Node.js Mongo Data Backup (Vercel-compatible)
const runDatabaseBackup = async (backupType = "Manual") => {
    const db = dbo.getDb();
    const timestamp = new Date().toISOString().split('T')[0];
    const prefix = `${backupType.toUpperCase().replace(/\s+/g, '_')}_BACKUP_${timestamp}`;
    const backupFolderName = `backup-${prefix}-${Date.now()}`;
    const backupPath = getTempBackupDir(backupFolderName);

    // Create folder inside writable /tmp
    if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true });
    }

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

    try {
        // Backup Mongo Collections to JSON files directly without mongodump CLI
        const collections = await db.listCollections().toArray();
        let totalBytes = 0;

        for (const col of collections) {
            const data = await db.collection(col.name).find({}).toArray();
            const filePath = path.join(backupPath, `${col.name}.json`);
            const content = JSON.stringify(data, null, 2);
            fs.writeFileSync(filePath, content);
            totalBytes += Buffer.byteLength(content);
        }

        // Generate Excel Summary
        await generateTransactionsExcel(db, backupPath);

        const folderSizeString = formatBytes(totalBytes);

        await db.collection("backup_history").updateOne(
            { _id: recordId },
            { $set: { status: "Success", size: folderSizeString } }
        );

        return { success: true, path: backupPath };
    } catch (err) {
        await db.collection("backup_history").updateOne(
            { _id: recordId },
            { $set: { status: "Failed" } }
        );
        throw err;
    }
};

/* API ENDPOINTS */

backupRouter.get('/api/backup/dashboard', async (req, res) => {
    try {
        const db = dbo.getDb();
        const settings = await db.collection("backup_settings").findOne({ _id: "system_backup_config" }) || { activeSchedule: "weekly" };
        const history = await db.collection("backup_history").find({}).sort({ date: -1 }).toArray();

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

backupRouter.post('/api/backup/update-schedule', async (req, res) => {
    const { activeSchedule } = req.body;
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

backupRouter.post('/api/backup/run-manual', async (req, res) => {
    try {
        const db = dbo.getDb();
        const settings = await db.collection("backup_settings").findOne({ _id: "system_backup_config" }) || { activeSchedule: "Weekly" };
        let typeString = settings.activeSchedule === "full" ? "Full System" : settings.activeSchedule;
        typeString = typeString.charAt(0).toUpperCase() + typeString.slice(1);

        const result = await runDatabaseBackup(typeString);
        return res.status(200).json({ remarks: "success", message: "Manual collection snapshot backed up successfully", payload: result });
    } catch (err) {
        return res.status(500).json({ remarks: "failed", error: err.message });
    }
});

backupRouter.get('/api/backup/download/:id', async (req, res) => {
    try {
        const db = dbo.getDb();
        let record;
        try {
            record = await db.collection("backup_history").findOne({ _id: new ObjectId(req.params.id) });
        } catch (idErr) {
            return res.status(400).json({ error: "Invalid backup id" });
        }
        
        if (!record || !record.path || !fs.existsSync(record.path)) {
            return res.status(404).json({ error: "Backup files no longer exist or timed out in temporary memory" });
        }

        res.attachment(`${record.backupName}.zip`);
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        archive.on('error', (archiveErr) => {
            if (!res.headersSent) res.status(500).end();
        });

        archive.pipe(res);
        archive.directory(record.path, false);
        await archive.finalize();
    } catch (err) {
        if (!res.headersSent) return res.status(500).json({ error: err.message });
    }
});

module.exports = backupRouter;