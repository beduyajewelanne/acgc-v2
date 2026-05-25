const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");

const app = express();
app.use(cors());
app.use(express.json());

const uri = "mongodb://localhost:27017"; // or your Atlas URI
const client = new MongoClient(uri);
let db;

async function connectDB() {
  await client.connect();
  db = client.db("mern_demo");
  console.log("✅ Connected to MongoDB");
}
connectDB();

app.get("/api/test", async (req, res) => {
  const collection = db.collection("items");
  const items = await collection.find({}).toArray();
  res.json(items);
}); 

app.post("/api/add", async (req, res) => {
  const { name } = req.body;
  const result = await db.collection("items").insertOne({ name });
  res.json(result);
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
