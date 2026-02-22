import express from "express";
import "dotenv/config";
import cors from "cors";
import mongoose from "mongoose";
import chatRoutes from "./routes/chat.js";
import authRoutes from "./routes/authRoutes.js";

const app = express();
const PORT = 8080;

app.use(express.json());
app.use(cors());

// Auth routes (public - no middleware)
app.use("/api/auth", authRoutes);

// Chat routes (protected - auth middleware applied inside chat.js)
app.use("/api", chatRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();
});

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
  }
};
