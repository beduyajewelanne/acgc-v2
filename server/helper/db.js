const { MongoClient } = require("mongodb");

const Db = process.env.ATLAS_URI;
const app_env = process.env.REACT_APP_ENV;

let client;
let _db;
let connectionPromise = null;

async function connectToServer(callback) {
  if (_db) {
    if (typeof callback === "function") callback(null);
    return _db;
  }

  if (!Db) {
    const err = new Error("❌ Error: ATLAS_URI is not defined in your environment variables.");
    console.error(err.message);
    if (typeof callback === "function") callback(err);
    throw err;
  }

  // Reuse the existing connection attempt if one is already in flight
  if (!connectionPromise) {
    client = new MongoClient(Db);
    connectionPromise = client.connect().then(() => {
      if (app_env === "development") {
        _db = client.db("acgc-development");
        console.log("Development Server - Connected to MongoDB");
      } else if (app_env === "production") {
        _db = client.db("acgc-production");
        console.log("Production Server - Connected to MongoDB");
      } else {
        _db = client.db("acgc-production");
        console.log("Connected to MongoDB default database");
      }
      return _db;
    }).catch((err) => {
      connectionPromise = null; // Reset on failure so future attempts can retry
      console.error("Failed to connect to MongoDB:", err.message);
      throw err;
    });
  }

  try {
    const db = await connectionPromise;
    if (typeof callback === "function") callback(null);
    return db;
  } catch (err) {
    if (typeof callback === "function") callback(err);
    throw err;
  }
}

async function getDb() {
  if (!_db) {
    await connectToServer();
  }
  return _db;
}

module.exports = {
  connectToServer,
  getDb
};