import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

const SESSION_DURATION = "10d"; // 10-day token expiry

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: SESSION_DURATION,
  });
};

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  const { fullName, email, password } = req.body;

  // Basic validation
  const cleanName = typeof fullName === "string" ? fullName.trim() : "";
  const cleanEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  const cleanPassword = typeof password === "string" ? password : "";

  if (!cleanName || !cleanEmail || !cleanPassword) {
    return res
      .status(400)
      .json({ error: "Full name, email, and password are required." });
  }

  if (cleanPassword.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters." });
  }

  // Simple email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ error: "Invalid email format." });
  }

  try {
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res
        .status(409)
        .json({ error: "An account with this email already exists." });
    }

    const user = new User({
      fullName: cleanName,
      email: cleanEmail,
      password: cleanPassword, // will be hashed by pre-save hook
    });

    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      message: "Account created successfully.",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Signup error:", err);
    res
      .status(500)
      .json({ error: "Failed to create account. Please try again." });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const cleanEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  const cleanPassword = typeof password === "string" ? password : "";

  if (!cleanEmail || !cleanPassword) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      // Intentionally vague to prevent email enumeration
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isMatch = await user.comparePassword(cleanPassword);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = generateToken(user._id);

    res.json({
      message: "Logged in successfully.",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Failed to log in. Please try again." });
  }
});

// GET /api/auth/me  — verify token & return current user info
router.get("/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json({
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
      },
    });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ error: "Session expired. Please log in again." });
    }
    return res.status(401).json({ error: "Invalid token." });
  }
});

// POST /api/auth/logout
// The real logout happens on the frontend (delete the token).
// This endpoint just confirms it server-side and can be used for audit logging.
router.post("/logout", (req, res) => {
  // Since JWT is stateless, we don't need to do anything on the server.
  // The frontend is responsible for deleting the token from storage.
  res.json({ message: "Logged out successfully." });
});

export default router;
