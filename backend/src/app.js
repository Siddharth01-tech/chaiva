require('dotenv').config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/authroutes");

const app = express();

// Security headers.
app.use(helmet());

// CORS configuration.
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

// Parse incoming JSON requests.
app.use(express.json({ limit: "10kb" }));

// Parse URL-encoded requests.
app.use(
  express.urlencoded({
    extended: true,
    limit: "10kb",
  })
);

// Read HTTP-only cookies.
app.use(cookieParser());

// Health check route.
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Chaiva API is running.",
  });
});

// API routes.
app.use("/api/v1/auth", authRoutes);

// Handle unknown routes.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler.
app.use((err, req, res, next) => {
  console.error("Global error:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong."
        : err.message,
  });
});

module.exports = app;