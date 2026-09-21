const { MongoClient } = require("mongodb");
const Db = process.env.ATLAS_URI;
const app_env = process.env.REACT_APP_ENV;

if (!Db) {
  console.error("❌ Error: ATLAS_URI is not defined in your environment variables.");
}

const client = new MongoClient(Db);
let _db;
let isConnecting = false;

async function connectToServer(callback) {
  // Reuse existing connection if available
  if (_db) {
    if (typeof callback === "function") callback(null);
    return;
  }

  try {
    if (!isConnecting) {
      isConnecting = true;
      await client.connect();
      
      if (app_env === "development") {
        _db = client.db("acgc-development");
        console.log("Development Server - Connected to MongoDB");
      } else if (app_env === "production") {
        _db = client.db("acgc-production");
        console.log("Production Server - Connected to MongoDB");
      } else {
        // Default fallback if REACT_APP_ENV is not set
        _db = client.db("acgc-production");
        console.log("Connected to MongoDB default database");
      }
      isConnecting = false;
    }

    if (typeof callback === "function") callback(null);
  } catch (err) {
    isConnecting = false;
    console.error("Failed to connect to MongoDB:", err.message);
    if (typeof callback === "function") callback(err);
  }
}

function getDb() {
  return _db;
}

module.exports = {
  connectToServer,
  getDb
};