const express = require("express");
const authRoutes = express.Router();
const port = process.env.PORT || 5000;
const dbo = require("../helper/db");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { get_data_helper, check_record_exists, decrypt, insert_one_helper, validateHash, hashPass, update_one_helper, actionLog } = require("../helper/Helper");
const { ObjectId } = require("mongodb"); 

const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
    }
});

const { BrevoClient } = require("@getbrevo/brevo");

const brevo = new BrevoClient({
    apiKey: process.env.BREVO_API_KEY
});

async function sendBrevoEmail({ to, subject, htmlContent }) {
    return await brevo.transactionalEmails.sendTransacEmail({
        sender: {
            name: process.env.SMTP_SENDER_NAME || "ACGC System",
            email: process.env.SMTP_EMAIL
        },
        to: [{ email: to }],
        subject,
        htmlContent
    });
}

function renderStatusPage(status, message, clientUrl) {
    const isSuccess = status === "success";
    const brandColor = isSuccess ? "#16a34a" : "#dc2626";
    const icon = isSuccess ? "✓" : "×";
    const bgIcon = isSuccess ? "#dcfce7" : "#fee2e2";

    const baseUrl = clientUrl ? clientUrl.replace(/\/+$/, "") : "";
    const loginLink = baseUrl ? `${baseUrl}/#/login` : "/login";

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>ACGC System - Email Verification</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { font-family: Arial, sans-serif; background-color: #f3f4f6; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: white; max-width: 420px; width: 90%; padding: 40px 30px; border-radius: 20px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
            .status-icon { width: 72px; height: 72px; background-color: ${bgIcon}; color: ${brandColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: bold; margin: 0 auto 20px auto; }
            h2 { color: #1f2937; margin-bottom: 10px; font-size: 24px; }
            p { color: #6b7280; font-size: 15px; line-height: 1.5; margin-bottom: 30px; }
            .btn { background-color: #801b1b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 14px; display: inline-block; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="status-icon">${icon}</div>
            <h2>${isSuccess ? 'Email Verified!' : 'Verification Failed'}</h2>
            <p>${message}</p>
            <a href="${loginLink}" class="btn">Go to Login</a>
        </div>
    </body>
    </html>
    `;
}

authRoutes.post("/api/login", async (req, res) => {
    try {
        const { payload } = req.body;
        if (!payload) {
            return res.status(400).json({ remarks: "failed", message: "Missing payload" });
        }

        const decrypted_payload = decrypt(payload);
        if (!decrypted_payload || !decrypted_payload.email || !decrypted_payload.password) {
            return res.status(400).json({ remarks: "failed", message: "Invalid payload data" });
        }

        const userQuery = [
            {
                $match: {
                    $or: [
                        { email: { $regex: `^${decrypted_payload.email}$`, $options: "i" } },
                        { username: { $regex: `^${decrypted_payload.email}$`, $options: "i" } }
                    ]
                }
            }
        ];
        
        const usersFound = await check_record_exists("users", userQuery);

        if (usersFound?.payload?.length > 0) {
            const user = usersFound.payload[0];
            const isPasswordValid = await validateHash(decrypted_payload.password, user.password);

            if (isPasswordValid) {
                if (user.is_verified === false || user.is_verified == undefined) {
                    return res.json({
                        remarks: "failed",
                        message: "Your email address has not been verified yet. Please check your inbox.",
                        payload: null
                    });
                }
                actionLog(user._id, "Login", `${user.firstName} ${user.lastName} logged in`);
                const token = crypto.randomBytes(32).toString("hex");
                await update_one_helper("users", { _id: user._id }, { $set: { token, lastLogin: new Date() } });

                delete user.password;

                return res.json({
                    remarks: "success",
                    message: "Login successful",
                    payload: {...user, token},
                });
            }
        }
        return res.json({
            remarks: "failed",
            message: "Invalid email or password",
            payload: null,
        });

    } catch (error) {
        console.error("Login route error:", error);
        return res.status(500).json({ remarks: "error", message: "Internal server error" });
    }
});

authRoutes.post("/api/register-old", async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            phone,
            address,
            province,
            city,
            barangay,
            zipCode,
            username,
            password
        } = req.body;

        const apiUrl = `${req.protocol}://${req.get('host')}/api/`;
        const clientUrl = req.get('origin') || req.get('referer');

        if (!firstName || !lastName || !email || !phone || !address || 
            !province || !city || !barangay || !zipCode || !username || !password) {
            return res.status(400).json({ 
                remarks: "failed", 
                message: "All fields are required" 
            });
        }

        const emailCheckQuery = [
            { 
                $match: { 
                    email: { $regex: `^${email}$`, $options: "i" } 
                } 
            }
        ];
        const existingEmail = await check_record_exists("users", emailCheckQuery);
        if (existingEmail?.payload?.length > 0) {
            return res.status(400).json({ 
                remarks: "failed", 
                message: "Email address is already registered" 
            });
        }

        const usernameCheckQuery = [
            { 
                $match: { 
                    username: { $regex: `^${username}$`, $options: "i" } 
                } 
            }
        ];
        const existingUsername = await check_record_exists("users", usernameCheckQuery);
        if (existingUsername?.payload?.length > 0 ) {
            return res.status(400).json({ 
                remarks: "failed", 
                message: "Username is already taken" 
            });
        }

        const hashedPassword = await hashPass(password);
        const emailVerificationToken = crypto.randomBytes(32).toString("hex");

        const db = await dbo.getDb();
        const existingUsersCount = await db.collection("users").countDocuments();
        const assignedRole = existingUsersCount === 0 ? "admin" : "client";
        const isSuperAdmin = existingUsersCount === 0;

        const verificationLink = `${apiUrl}verify-email?token=${emailVerificationToken}&clientUrl=${encodeURIComponent(clientUrl || '')}`;

        const htmlEmailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333333; background-color: #f8fafc;">
            <div style="background-color: #801b1b; padding: 30px 20px; border-top-left-radius: 8px; border-top-right-radius: 8px; text-align: center;">
                <span style="background-color: #fef2f2; color: #801b1b; padding: 4px 12px; font-size: 11px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; border-radius: 4px; display: inline-block; margin-bottom: 12px;">SECURE SIGN-UP</span>
                <h1 style="color: #ffffff; margin: 0 0 6px 0; font-size: 26px; font-weight: bold;">ACGC System</h1>
                <p style="color: #fca5a5; margin: 0; font-size: 14px;">Verify your email to activate your account</p>
            </div>
            
            <div style="background-color: #ffffff; padding: 30px 25px; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; border: 1px solid #e5e7eb; border-top: none;">
                <p style="font-size: 16px; line-height: 1.5; color: #111827; margin-top: 0;">Hello,</p>
                <p style="font-size: 15px; line-height: 1.6; color: #4b5563;">Thank you for registering with <strong>ACGC System</strong>. Please click the button below to verify your email address and finish creating your profile.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationLink}" style="background-color: #801b1b; color: #ffffff; padding: 14px 28px; font-size: 15px; font-weight: bold; text-decoration: none; border-radius: 6px; display: inline-block; box-shadow: 0 4px 6px rgba(128, 27, 27, 0.2);">
                        Verify Email Address
                    </a>
                </div>

                <div style="background-color: #fbf1f1; border: 1px solid #fecaca; border-radius: 6px; padding: 14px; margin-bottom: 25px; font-size: 13px; color: #7f1d1d; word-break: break-all;">
                    <strong>If the button doesn't work, copy and paste this link into your browser:</strong><br />
                    <a href="${verificationLink}" style="color: #801b1b; text-decoration: underline;">${verificationLink}</a>
                </div>

                <p style="font-size: 13px; color: #6b7280; line-height: 1.5;">If you did not create this account, you can safely ignore this email.</p>
                <p style="font-size: 14pxx; color: #111827; margin-top: 25px; margin-bottom: 0; line-height: 1.5;">
                    Best regards,<br />
                    <strong style="color: #801b1b;">ACGC System Team</strong>
                </p>
            </div>
        </div>
        `;

        const mailOptions = {
            from: `"ACGC System" <${process.env.SMTP_EMAIL}>`,
            to: email,
            subject: "ACGC System - Verify Your Email Address",
            html: htmlEmailContent
        };

        await transporter.sendMail(mailOptions);

        const newUser = {
            firstName,
            lastName,
            email,
            phone,
            address,
            province,
            city,
            barangay,
            zipCode,
            username,
            password: hashedPassword,
            role: assignedRole,
            isSuperAdmin,
            is_verified: false,
            verificationToken: emailVerificationToken,
            createdAt: new Date()
        };

        const result = await insert_one_helper("users", newUser);

        if (result.remarks === "success") {
            await actionLog(null, "Register", `${firstName} ${lastName} registered`);

            const rawUserId = Buffer.from(result.return, "base64").toString("utf8");
            if (assignedRole === "client") {
                const base_access_level = await get_data_helper("base_access_level", { type: "client" });
                const modulesTemplate = base_access_level?.payload?.[0]?.modules || {};
                await insert_one_helper("access_level", {
                    user_id: new ObjectId(rawUserId),
                    modules: modulesTemplate
                });
            }

            return res.status(201).json({
                remarks: "success",
                message: "Account created successfully. Please check your email to verify your account.",
                payload: { userId: result.insertedId }
            });
        } else {
            throw new Error("Failed to insert user document");
        }

    } catch (error) {
        console.error("Signup error:", error);
        return res.status(500).json({ 
            remarks: "error", 
            message: "Failed to complete registration or send verification email." 
        });
    }
});

authRoutes.post("/api/register", async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            phone,
            address,
            province,
            city,
            barangay,
            zipCode,
            username,
            password
        } = req.body;

        const apiUrl = `${req.protocol}://${req.get('host')}/api/`;
        const clientUrl = req.get('origin') || req.get('referer');

        if (!firstName || !lastName || !email || !phone || !address || 
            !province || !city || !barangay || !zipCode || !username || !password) {
            return res.status(400).json({ 
                remarks: "failed", 
                message: "All fields are required" 
            });
        }

        const emailCheckQuery = [
            { 
                $match: { 
                    email: { $regex: `^${email}$`, $options: "i" } 
                } 
            }
        ];
        const existingEmail = await check_record_exists("users", emailCheckQuery);
        if (existingEmail?.payload?.length > 0) {
            return res.status(400).json({ 
                remarks: "failed", 
                message: "Email address is already registered" 
            });
        }

        const usernameCheckQuery = [
            { 
                $match: { 
                    username: { $regex: `^${username}$`, $options: "i" } 
                } 
            }
        ];
        const existingUsername = await check_record_exists("users", usernameCheckQuery);
        if (existingUsername?.payload?.length > 0 ) {
            return res.status(400).json({ 
                remarks: "failed", 
                message: "Username is already taken" 
            });
        }

        const hashedPassword = await hashPass(password);
        const emailVerificationToken = crypto.randomBytes(32).toString("hex");

        const db = await dbo.getDb();
        const existingUsersCount = await db.collection("users").countDocuments();
        const assignedRole = existingUsersCount === 0 ? "admin" : "client";
        const isSuperAdmin = existingUsersCount === 0;

        const verificationLink = `${apiUrl}verify-email?token=${emailVerificationToken}&clientUrl=${encodeURIComponent(clientUrl || '')}`;

        const htmlEmailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333333; background-color: #f8fafc;">
            <div style="background-color: #801b1b; padding: 30px 20px; border-top-left-radius: 8px; border-top-right-radius: 8px; text-align: center;">
                <span style="background-color: #fef2f2; color: #801b1b; padding: 4px 12px; font-size: 11px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; border-radius: 4px; display: inline-block; margin-bottom: 12px;">SECURE SIGN-UP</span>
                <h1 style="color: #ffffff; margin: 0 0 6px 0; font-size: 26px; font-weight: bold;">ACGC System</h1>
                <p style="color: #fca5a5; margin: 0; font-size: 14px;">Verify your email to activate your account</p>
            </div>
            
            <div style="background-color: #ffffff; padding: 30px 25px; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; border: 1px solid #e5e7eb; border-top: none;">
                <p style="font-size: 16px; line-height: 1.5; color: #111827; margin-top: 0;">Hello,</p>
                <p style="font-size: 15px; line-height: 1.6; color: #4b5563;">Thank you for registering with <strong>ACGC System</strong>. Please click the button below to verify your email address and finish creating your profile.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationLink}" style="background-color: #801b1b; color: #ffffff; padding: 14px 28px; font-size: 15px; font-weight: bold; text-decoration: none; border-radius: 6px; display: inline-block; box-shadow: 0 4px 6px rgba(128, 27, 27, 0.2);">
                        Verify Email Address
                    </a>
                </div>

                <div style="background-color: #fbf1f1; border: 1px solid #fecaca; border-radius: 6px; padding: 14px; margin-bottom: 25px; font-size: 13px; color: #7f1d1d; word-break: break-all;">
                    <strong>If the button doesn't work, copy and paste this link into your browser:</strong><br />
                    <a href="${verificationLink}" style="color: #801b1b; text-decoration: underline;">${verificationLink}</a>
                </div>

                <p style="font-size: 13px; color: #6b7280; line-height: 1.5;">If you did not create this account, you can safely ignore this email.</p>
                <p style="font-size: 14px; color: #111827; margin-top: 25px; margin-bottom: 0; line-height: 1.5;">
                    Best regards,<br />
                    <strong style="color: #801b1b;">ACGC System Team</strong>
                </p>
            </div>
        </div>
        `;

        await sendBrevoEmail({
            to: email,
            subject: "ACGC System - Verify Your Email Address",
            htmlContent: htmlEmailContent
        });

        const newUser = {
            firstName,
            lastName,
            email,
            phone,
            address,
            province,
            city,
            barangay,
            zipCode,
            username,
            password: hashedPassword,
            role: assignedRole,
            isSuperAdmin,
            is_verified: false,
            verificationToken: emailVerificationToken,
            createdAt: new Date()
        };

        const result = await insert_one_helper("users", newUser);

        if (result.remarks === "success") {
            await actionLog(null, "Register", `${firstName} ${lastName} registered`);

            const rawUserId = Buffer.from(result.return, "base64").toString("utf8");
            if (assignedRole === "client") {
                const base_access_level = await get_data_helper("base_access_level", { type: "client" });
                const modulesTemplate = base_access_level?.payload?.[0]?.modules || {};
                await insert_one_helper("access_level", {
                    user_id: new ObjectId(rawUserId),
                    modules: modulesTemplate
                });
            }

            return res.status(201).json({
                remarks: "success",
                message: "Account created successfully. Please check your email to verify your account.",
                payload: { userId: result.insertedId }
            });
        } else {
            throw new Error("Failed to insert user document");
        }

    } catch (error) {
        console.error("Signup error:", error);
        return res.status(500).json({ 
            remarks: "error", 
            message: "Failed to complete registration or send verification email." 
        });
    }
});

authRoutes.get("/api/verify-email", async (req, res) => {
    try {
        const { token, clientUrl } = req.query;
        if (!token) {
            return res.status(400).send(renderStatusPage("failed", "Missing verification token.", clientUrl));
        }

        const db = await dbo.getDb();
        const user = await db.collection("users").findOne({ verificationToken: token });

        if (!user) {
            return res.status(400).send(renderStatusPage("failed", "Invalid or expired verification link.", clientUrl));
        }

        await update_one_helper("users", { _id: user._id }, { 
            $set: { is_verified: true },
            $unset: { verificationToken: "" } 
        });
        await actionLog(user._id, "Email Verified", `${user.firstName} ${user.lastName} verified their email address`);

        return res.send(renderStatusPage("success", "Email verified successfully! You can now log into your account.", clientUrl));
    } catch (error) {
        console.error("Email verification route error:", error);
        return res.status(500).send(renderStatusPage("error", "An internal server error occurred.", clientUrl));
    }
});

authRoutes.post("/api/forgot-password-old", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ remarks: "failed", message: "Email is required" });

        const db = await dbo.getDb();
        const user = await db.collection("users").findOne({ email: { $regex: `^${email}$`, $options: "i" } });
        
        if (!user) {
            return res.status(400).json({ remarks: "failed", message: "No account found with this email" });
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const codeExpiry = new Date(Date.now() + 10 * 60 * 1000);

        await update_one_helper("users", { _id: user._id }, { $set: { resetCode: verificationCode, resetCodeExpiry: codeExpiry } });

        const htmlEmailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333333;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #801b1b; margin-bottom: 5px; font-size: 28px; font-weight: bold;">ACGC System</h1>
                <p style="color: #666666; margin: 0; font-size: 14px;">Password Reset Request</p>
            </div>
            <hr style="border: none; border-top: 2px solid #801b1b; margin-bottom: 20px;" />
            <p style="font-size: 16px; line-height: 1.5;">Hello,</p>
            <p style="font-size: 16px; line-height: 1.5;">We received a request to reset your password. Please use the verification code below to proceed with your password reset.</p>
            
            <div style="background-color: #eff6ff; border-left: 4px solid #801b1b; padding: 20px; text-align: center; margin: 25px 0; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #5f6368;">Your Verification Code:</p>
                <div style="font-size: 32px; font-weight: bold; color: #801b1b; letter-spacing: 4px;">${verificationCode}</div>
            </div>

            <div style="background-color: #fef7e0; border: 1px solid #fae29c; border-radius: 4px; padding: 12px 15px; margin-bottom: 25px; font-size: 14px; color: #b06000;">
                <strong>⚠️ Important:</strong> This code will expire in 10 minutes. If you did not request a password reset, please ignore this email.
            </div>

            <p style="font-size: 14px; color: #5f6368; line-height: 1.5;">If you have any questions, please contact our support team.</p>
            <p style="font-size: 14px; color: #333333; margin-top: 25px; line-height: 1.5;">
                Best regards,<br />
                <strong>ACGC System Team</strong>
            </p>
        </div>
        `;

        const mailOptions = {
            from: `"ACGC System" <${process.env.SMTP_EMAIL}>`,
            to: email,
            subject: "ACGC System - Password Reset Code",
            html: htmlEmailContent
        };

        await transporter.sendMail(mailOptions);
        return res.json({ remarks: "success", message: "Verification code sent to your email" });

    } catch (error) {
        console.error("Forgot password server error:", error);
        return res.status(500).json({ remarks: "error", message: "Internal server error" });
    }
});

authRoutes.post("/api/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ remarks: "failed", message: "Email is required" });

        const db = await dbo.getDb();
        const user = await db.collection("users").findOne({ email: { $regex: `^${email}$`, $options: "i" } });
        
        if (!user) {
            return res.status(400).json({ remarks: "failed", message: "No account found with this email" });
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const codeExpiry = new Date(Date.now() + 10 * 60 * 1000);

        await update_one_helper("users", { _id: user._id }, { $set: { resetCode: verificationCode, resetCodeExpiry: codeExpiry } });

        const htmlEmailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333333;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #801b1b; margin-bottom: 5px; font-size: 28px; font-weight: bold;">ACGC System</h1>
                <p style="color: #666666; margin: 0; font-size: 14px;">Password Reset Request</p>
            </div>
            <hr style="border: none; border-top: 2px solid #801b1b; margin-bottom: 20px;" />
            <p style="font-size: 16px; line-height: 1.5;">Hello,</p>
            <p style="font-size: 16px; line-height: 1.5;">We received a request to reset your password. Please use the verification code below to proceed with your password reset.</p>
            
            <div style="background-color: #eff6ff; border-left: 4px solid #801b1b; padding: 20px; text-align: center; margin: 25px 0; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #5f6368;">Your Verification Code:</p>
                <div style="font-size: 32px; font-weight: bold; color: #801b1b; letter-spacing: 4px;">${verificationCode}</div>
            </div>

            <div style="background-color: #fef7e0; border: 1px solid #fae29c; border-radius: 4px; padding: 12px 15px; margin-bottom: 25px; font-size: 14px; color: #b06000;">
                <strong>⚠️ Important:</strong> This code will expire in 10 minutes. If you did not request a password reset, please ignore this email.
            </div>

            <p style="font-size: 14px; color: #5f6368; line-height: 1.5;">If you have any questions, please contact our support team.</p>
            <p style="font-size: 14px; color: #333333; margin-top: 25px; line-height: 1.5;">
                Best regards,<br />
                <strong>ACGC System Team</strong>
            </p>
        </div>
        `;

        await sendBrevoEmail({
            to: email,
            subject: "ACGC System - Password Reset Code",
            htmlContent: htmlEmailContent
        });

        return res.json({ remarks: "success", message: "Verification code sent to your email" });

    } catch (error) {
        console.error("Forgot password server error:", error);
        return res.status(500).json({ remarks: "error", message: "Internal server error" });
    }
});

authRoutes.post("/api/verify-code", async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) return res.status(400).json({ remarks: "failed", message: "All fields are required" });

        const db = await dbo.getDb();
        const user = await db.collection("users").findOne({ 
            email: { $regex: `^${email}$`, $options: "i" },
            resetCode: code
        });

        if (!user) {
            return res.status(400).json({ remarks: "failed", message: "Invalid verification code" });
        }

        if (new Date() > user.resetCodeExpiry) {
            return res.status(400).json({ remarks: "failed", message: "Code has expired. Please request a new one." });
        }

        return res.json({ remarks: "success", message: "Code verified successfully" });
    } catch (error) {
        return res.status(500).json({ remarks: "error", message: "Internal server error" });
    }
});

authRoutes.post("/api/reset-password", async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;
        if (!email || !code || !newPassword) return res.status(400).json({ remarks: "failed", message: "Missing required details" });

        const db = await dbo.getDb();
        const user = await db.collection("users").findOne({ 
            email: { $regex: `^${email}$`, $options: "i" },
            resetCode: code
        });

        if (!user || new Date() > user.resetCodeExpiry) {
            return res.status(400).json({ remarks: "failed", message: "Session expired or invalid code" });
        }

        const hashedPassword = await hashPass(newPassword);
        await actionLog(user._id, "Password Reset", `${user.firstName} ${user.lastName} reset their password`);
        await update_one_helper("users", { _id: user._id }, { 
            $set: { password: hashedPassword },
            $unset: { resetCode: "", resetCodeExpiry: "" }
        });

        return res.json({ remarks: "success", message: "Password updated successfully" });
    } catch (error) {
        return res.status(500).json({ remarks: "error", message: "Internal server error" });
    }
});

authRoutes.post("/api/get_audit_logs", async (req, res) => {
    var token = req.body.token;
    var archive = req.body.archive;
    var response = {}
    if (!token) return res.status(400).json({ error: "Token is required" });

    try {
        checkAuth(token, req.body._id, async (isValid) => {
            if (!isValid) return res.status(401).json({ error: "Unauthorized" });
            const product_query = [
                { $sort: { createdAt: -1 } }
            ];
            const result = await get_data_helper("action_logs", product_query);
            if (result?.payload?.length > 0) {
                response = { remarks: "success", message: "Data fetched successfully", payload: result.payload };
            } else {
                response = { remarks: "failed", message: "No data found", payload: null };
            }
            res.status(200).json(response);
        })
    } catch (err) {
        console.error("Error in /api/get_audit_logs:", err);
        res.status(500).json({ error: err });
    }
});

module.exports = authRoutes;