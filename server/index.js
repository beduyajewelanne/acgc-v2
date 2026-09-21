const { webcrypto } = require("crypto");
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
} else if (!globalThis.crypto.getRandomValues) {
  globalThis.crypto.getRandomValues = webcrypto.getRandomValues.bind(webcrypto);
}

require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const path    = require("path");
const dbo     = require("./helper/db");

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

dbo.connectToServer((err) => {
  if (err) {
    console.error("Database initial connection error:", err);
  } else {
    console.log("Connected to MongoDB");
  }
});

// ── Static Route Imports (Ensures Vercel bundles all dependencies) ────────────
const authRoutes     = require("./routes/authRoutes");
const productsRoutes = require("./routes/products");
const usersRoutes    = require("./routes/users");
const cartRoutes     = require("./routes/cart");
const contractsRoutes= require("./routes/contracts");
const receiptsRoutes = require("./routes/receipts");
const backupRoutes   = require("./routes/backupRoutes");
const notifyRoutes   = require("./routes/notification");

app.use(authRoutes);
app.use(productsRoutes);
app.use(usersRoutes);
app.use(cartRoutes);
app.use(contractsRoutes);
app.use(receiptsRoutes);
app.use(backupRoutes);
app.use(notifyRoutes);

// Health check endpoint
app.get("/api/test", (_req, res) => res.json({ status: "ok" }));

// ── Local Development Listener ────────────────────────────────────────────────
// if (process.env.NODE_ENV !== "production") {
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
// }

module.exports = app;