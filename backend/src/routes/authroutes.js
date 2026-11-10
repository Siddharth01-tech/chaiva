
const express = require("express");

const {
  register,
  login,
  logout,
  refreshAccessToken,
  getMe,
} = require("../controllers/authcontroller");

const { protect } = require("../middleware/authmiddleware");

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Refresh token is read from the HTTP-only cookie.
// It does not require the access-token middleware.
router.post("/refresh", refreshAccessToken);

// Protected routes
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);

module.exports = router;
