const express = require("express");
const authRoutes = express.Router();
const port = process.env.PORT || 5000;
const dbo = require("../helper/db");
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
                    email: decrypted_payload.email,
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

module.exports = authRoutes;