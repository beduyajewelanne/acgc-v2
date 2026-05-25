// server/index.js

require("dotenv").config();

const express    = require("express");
const cors       = require("cors");
const { closeDB } = require("./helper/db");

const authRoutes = require("./server/authRoutes");

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  credentials: true,
}));

app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────

app.use("/api/auth", authRoutes);

// Health check
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// ── Start ─────────────────────────────────────────────────────────────────────

const server = app.listen(PORT, () => {
  console.log(`[server] Running on http://localhost:${PORT}`);
});

// Graceful shutdown
async function shutdown() {
  server.close(async () => {
    await closeDB();
    process.exit(0);
  });
}
process.on("SIGTERM", shutdown);
process.on("SIGINT",  shutdown);