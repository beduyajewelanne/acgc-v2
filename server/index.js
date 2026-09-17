require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const app  = express();
const PORT = process.env.PORT || 5000;
const dbo = require("./helper/db");
const path = require("path");
const fs = require("fs");

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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

app.get("/api/test", (_req, res) => res.json({ status: "ok" }));

dbo.connectToServer((err) => {
  if (err) console.error("DB connection error:", err);
  else console.log("Connected to MongoDB");
});

module.exports = app;

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
  });
}