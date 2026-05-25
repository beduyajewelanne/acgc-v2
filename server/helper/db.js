const { MongoClient } = require("mongodb");
const Db = process.env.ATLAS_URI;
const app_env = process.env.REACT_APP_ENV;
if (!Db) {
  console.error("❌ Error: ATLAS_URI is not defined in your environment variables.");
}

const client = new MongoClient(Db);
let _db;

async function connectToServer(callback) {
  try {
    await client.connect();
    if (app_env === "development") {
      _db = client.db("acgc-development");
      console.log("Development Server");
      console.log("Successfully connected to MongoDB.");
    } else if (app_env === "production") {
      _db = client.db("acgc-production");
      console.log("Production Server");
      console.log("Successfully connected to MongoDB.");
    } else {
      console.log("Application environment (REACT_APP_ENV) not recognized. Not connected to a specific server instance.");
    }

    if (typeof callback === "function") callback(null);
  } catch (err) {
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