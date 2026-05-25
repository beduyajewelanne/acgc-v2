// server/server/authRoutes.js
// Mount at /api/auth in index.js

const express = require("express");
const router  = express.Router();

const { getDB }                                          = require("../helper/db");
const { decodeField, hashPassword, verifyPassword, signToken } = require("../helper/authHelpers");

// ── GET /api/auth/check-admin ────────────────────────────────────────────────
// Returns whether at least one admin account exists.
// The React Login component calls this on mount to decide whether to show
// the first-run admin-creation modal.

router.get("/check-admin", async (req, res) => {
  try {
    const db   = await getDB();
    const user = await db.collection("users").findOne(
      { role: { $in: ["admin", "Admin"] } },
      { projection: { _id: 1 } }
    );
    res.json({ adminExists: !!user });
  } catch (err) {
    console.error("[check-admin]", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────
// Body (btoa-encoded): { emailOrUsername, password }
// Returns: { token, user: { id, name, role } }

router.post("/login", async (req, res) => {
  try {
    const { emailOrUsername: encEmail, password: encPass } = req.body;

    if (!encEmail || !encPass) {
      return res.status(400).json({ message: "Email/username and password are required." });
    }

    // Decode btoa values from the frontend
    const emailOrUsername = decodeField(encEmail);
    const password        = decodeField(encPass);

    const db   = await getDB();
    const user = await db.collection("users").findOne({
      $or: [
        { email:    emailOrUsername.toLowerCase() },
        { username: emailOrUsername.toLowerCase() },
      ],
    });

    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid password." });
    }

    const token = signToken({ id: user._id.toString(), role: user.role || "customer" });

    res.json({
      token,
      user: {
        id:   user._id.toString(),
        name: `${user.first_name} ${user.last_name}`,
        role: user.role || "customer",
      },
    });
  } catch (err) {
    console.error("[login]", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ── POST /api/auth/create-admin ──────────────────────────────────────────────
// First-run only. Blocked if any admin already exists.
// Body (btoa-encoded): { fullName, username, email, password }

router.post("/create-admin", async (req, res) => {
  try {
    const db = await getDB();

    // Guard: refuse if an admin already exists
    const existing = await db.collection("users").findOne(
      { role: { $in: ["admin", "Admin"] } },
      { projection: { _id: 1 } }
    );
    if (existing) {
      return res.status(403).json({ message: "An admin account already exists." });
    }

    const { fullName: encName, username: encUser, email: encEmail, password: encPass } = req.body;

    if (!encName || !encUser || !encEmail || !encPass) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Decode btoa values
    const fullName = decodeField(encName);
    const username = decodeField(encUser).toLowerCase();
    const email    = decodeField(encEmail).toLowerCase();
    const password = decodeField(encPass);

    // Server-side validation (mirrors client + PHP)
    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      return res.status(400).json({ message: "Username can only contain letters, numbers, dots, hyphens, and underscores." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long." });
    }

    // Duplicate checks
    const emailTaken    = await db.collection("users").findOne({ email });
    if (emailTaken)    return res.status(409).json({ message: "Email already exists in the system." });

    const usernameTaken = await db.collection("users").findOne({ username });
    if (usernameTaken) return res.status(409).json({ message: "Username already exists in the system." });

    // Split full name (same logic as PHP explode with limit 2)
    const [firstName, ...rest] = fullName.trim().split(" ");
    const lastName = rest.length ? rest.join(" ") : firstName;

    const password_hash = await hashPassword(password);

    await db.collection("users").insertOne({
      first_name:     firstName,
      last_name:      lastName,
      email,
      username,
      password_hash,
      role:           "admin",
      terms_accepted: true,
      email_verified: true,
      created_at:     new Date(),
    });

    res.status(201).json({ message: "Admin account created successfully." });
  } catch (err) {
    console.error("[create-admin]", err);
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;