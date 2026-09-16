require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const dbo = require("./helper/db");
const path = require("path");

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors());

// Optional: Works for existing static assets committed to git, but won't persist runtime user uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Middleware: Ensure DB Connection on Every Request ────────────────────────
app.use((req, res, next) => {
  dbo.connectToServer((err) => {
    if (err) {
      console.error("[Database] Connection failed:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }
    next();
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
const loadRoute = (routePath) => {
  try {
    const route = require(routePath);
    app.use(route);
    console.log(`[Routes] Loaded ${routePath}`);
  } catch (err) {
    console.error(`[Routes] FAILED to load ${routePath}:`, err);
  }
};

loadRoute("./routes/authRoutes");
loadRoute("./routes/products");
loadRoute("./routes/users");
loadRoute("./routes/cart");
loadRoute("./routes/contracts");
loadRoute("./routes/receipts");
loadRoute("./routes/backupRoutes");
loadRoute("./routes/notification");

// Test endpoint
app.get("/api/test", (_req, res) => res.json({ status: "ok" }));

// ── Local Development vs. Vercel Execution ────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server is running locally on port: ${PORT}`);
  });
}

// CRITICAL: Export Express app for Vercel Serverless Function
module.exports = app;