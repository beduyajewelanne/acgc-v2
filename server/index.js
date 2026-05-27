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
// ── Routes ────────────────────────────────────────────────────────────────────

try {
  const authRoutes = require("./routes/authRoutes");
  app.use(authRoutes);

  const productRoutes = require("./routes/products");
  app.use(productRoutes);
} catch (err) {
  console.error("Error setting up routes:", err.message);
}

// test
app.get("/api/test", (_req, res) => res.json({ status: "ok" }));

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
    dbo.connectToServer(function (err) {
        if (err) console.error(err);
        else {
            console.log(`Server is running on port: ${PORT}`);
        }
    });
});
