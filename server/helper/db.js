// server/helper/db.js
// Native MongoDB connection — no Mongoose

const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const DB_NAME   = process.env.DB_NAME   || "acgc";

let client = null;
let db     = null;

/**
 * Returns a connected MongoClient instance (singleton).
 */
async function getClient() {
  if (!client) {
    client = new MongoClient(MONGO_URI);
    await client.connect();
  }
  return client;
}

/**
 * Returns the default database handle.
 */
async function getDB() {
  if (!db) {
    const c = await getClient();
    db = c.db(DB_NAME);
  }
  return db;
}

/**
 * Gracefully close the connection (call on process exit).
 */
async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    db     = null;
  }
}

module.exports = { getDB, closeDB };