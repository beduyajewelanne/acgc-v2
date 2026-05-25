const express = require("express");
const authRoutes = express.Router();
const port = process.env.PORT || 5000;
const dbo = require("../helper/db");
const nodemailer = require("nodemailer");
const { get_data_helper, check_record_exists, decrypt, insert_one_helper, validateHash, hashPass } = require("../helper/Helper");

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
                delete user.password;

                return res.json({
                    remarks: "success",
                    message: "Login successful",
                    payload: user,
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

authRoutes.post("/api/register", async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            phoneNumber,
            streetAddress,
            province,
            cityMunicipality,
            barangay,
            zipCode,
            username,
            password
        } = req.body;

        if (!firstName || !lastName || !email || !phoneNumber || !streetAddress || 
            !province || !cityMunicipality || !barangay || !zipCode || !username || !password) {
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

        // Check if username already exists
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

        // Hash the password
        const hashedPassword = await hashPass(password);

        // Construct new user document
        const newUser = {
            firstName,
            lastName,
            email,
            phoneNumber,
            address: {
                streetAddress,
                province,
                cityMunicipality,
                barangay,
                zipCode
            },
            username,
            password: hashedPassword,
            userType: "client",
            createdAt: new Date()
        };

        // Insert into MongoDB 
        const result = await insert_one_helper("users", newUser);
        if (result.remarks == "success") {
            return res.status(201).json({
                remarks: "success",
                message: "Account created successfully",
                payload: { userId: result.insertedId }
            });
        } else {
            throw new Error("Failed to insert user document");
        }

    } catch (error) {
        console.error("Signup error:", error);
        return res.status(500).json({ 
            remarks: "error", 
            message: "Internal server error" 
        });
    }
});

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

authRoutes.post("/api/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ remarks: "failed", message: "Email is required" });

        const db = dbo.getDb();
        const user = await db.collection("users").findOne({ email: { $regex: `^${email}$`, $options: "i" } });
        
        if (!user) {
            return res.status(400).json({ remarks: "failed", message: "No account found with this email" });
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const codeExpiry = new Date(Date.now() + 10 * 60 * 1000);

        await db.collection("users").updateOne(
            { _id: user._id },
            { $set: { resetCode: verificationCode, resetCodeExpiry: codeExpiry } }
        );

        const htmlEmailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333333;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #2563eb; margin-bottom: 5px; font-size: 28px; font-weight: bold;">ACGC System</h1>
                <p style="color: #666666; margin: 0; font-size: 14px;">Password Reset Request</p>
            </div>
            <hr style="border: none; border-top: 2px solid #2563eb; margin-bottom: 20px;" />
            <p style="font-size: 16px; line-height: 1.5;">Hello,</p>
            <p style="font-size: 16px; line-height: 1.5;">We received a request to reset your password. Please use the verification code below to proceed with your password reset.</p>
            
            <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 20px; text-align: center; margin: 25px 0; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #5f6368;">Your Verification Code:</p>
                <div style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 4px;">${verificationCode}</div>
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

authRoutes.post("/api/verify-code", async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) return res.status(400).json({ remarks: "failed", message: "All fields are required" });

        const db = dbo.getDb();
        const user = await db.collection("users").findOne({ 
            email: { $regex: `^${email}$`, $options: "i" },
            resetCode: code
        });

        if (!user) {
            return res.status(400).json({ remarks: "failed", message: "Invalid verification code" });
        }

        // Check expiration
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

        const db = dbo.getDb();
        const user = await db.collection("users").findOne({ 
            email: { $regex: `^${email}$`, $options: "i" },
            resetCode: code
        });

        if (!user || new Date() > user.resetCodeExpiry) {
            return res.status(400).json({ remarks: "failed", message: "Session expired or invalid code" });
        }

        // Hash and save the brand new password
        const hashedPassword = await hashPass(newPassword);
        
        await db.collection("users").updateOne(
            { _id: user._id },
            { 
                $set: { password: hashedPassword },
                $unset: { resetCode: "", resetCodeExpiry: "" } // Wipe token clean after use
            }
        );

        return res.json({ remarks: "success", message: "Password updated successfully" });
    } catch (error) {
        return res.status(500).json({ remarks: "error", message: "Internal server error" });
    }
});
module.exports = authRoutes;