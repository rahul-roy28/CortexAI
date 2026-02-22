import express from "express";
import "dotenv/config";
import cors from "cors";
import mongoose from "mongoose";
import chatRoutes from "./routes/chat.js";
import authRoutes from "./routes/authRoutes.js";

const app = express();
// Render assigns its own PORT via environment variable
const PORT = process.env.PORT || 8080;

app.use(express.json());

// Restrict CORS to your deployed frontend URL (set FRONTEND_URL in Render env vars)
// Falls back to localhost for local development
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  }),
);

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
