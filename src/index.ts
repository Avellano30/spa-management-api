import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import app from "./app";


const port = process.env.PORT || 3000;
const DB_NAME = process.env.DB_NAME;
const MONGO_URL = `${process.env.MONGO_URL}`;

mongoose.Promise = global.Promise;

mongoose.connect(MONGO_URL, { dbName: DB_NAME })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
