const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
require("dotenv").config();
const uri = process.env.ATLAS_URI;
const client = new MongoClient(uri);


const app = express();
app.use(cors());
app.use(express.json());

// let db;

// async function connectDB() {
//   await client.connect();
//   db = client.db("mern_demo");
//   console.log("✅ Connected to MongoDB");
// }
// connectDB();

app.get("/api/test", async (req, res) => {
  const collection = db.collection("items");
  const items = await collection.find({}).toArray();
  res.json(items);
}); 


app.listen(process.env.PORT, () => console.log(`🚀 Server running on port ${process.env.PORT}`));
