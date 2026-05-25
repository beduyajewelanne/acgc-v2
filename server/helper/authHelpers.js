// server/helper/authHelpers.js

const bcrypt = require("bcrypt");
const jwt    = require("jsonwebtoken");

const SALT_ROUNDS = 12;
const JWT_SECRET  = process.env.JWT_SECRET || "change_this_secret_in_production";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "8h";

// ── Encoding ──────────────────────────────────────────────────────────────────

/**
 * Decode a btoa()-encoded value coming from the React frontend.
 * btoa(unescape(encodeURIComponent(value))) → base64 string
 * We reverse: base64 → Buffer → UTF-8 string.
 */
function decodeField(encoded) {
  try {
    return Buffer.from(encoded, "base64").toString("utf8");
  } catch {
    throw new Error("Invalid encoded field.");
  }
}

// ── Password ──────────────────────────────────────────────────────────────────

async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// ── JWT ───────────────────────────────────────────────────────────────────────

/**
 * Sign a JWT containing { id, role }.
 */
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

/**
 * Middleware: verify Bearer token and attach decoded user to req.user.
 */
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authenticated." });
  }
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

/**
 * Middleware: allow only specific roles.
 * Usage: requireRole("admin")
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied." });
    }
    next();
  };
}

module.exports = { decodeField, hashPassword, verifyPassword, signToken, requireAuth, requireRole };