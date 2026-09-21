require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const app  = express();
const PORT = process.env.PORT || 5000;
const dbo = require("./helper/db");
const path = require("path");
const fs = require("fs");
// const authRoutes = require("./routes/authRoutes");

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Database Connection Middleware for Vercel/Serverless
app.use((req, res, next) => {
  dbo.connectToServer((err) => {
    if (err) {
      console.error("Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }
    next();
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
// Each route is loaded independently so that a problem in ONE file (a missing
// npm package, a bad require, etc.) can't silently prevent every route AFTER
// it in the list from ever being mounted. Before, all requires shared one
// try/catch, so one bad file quietly took down itself AND everything below it.
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

// test
app.get("/api/test", (_req, res) => res.json({ status: "ok" }));

// ── Start ─────────────────────────────────────────────────────────────────────

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    dbo.connectToServer(function (err) {
      if (err) console.error(err);
      else {
        console.log(`Server is running on port: ${PORT}`);
      }
    });
  });
}

module.exports = app;