
const jwt = require("jsonwebtoken");
const User = require("../models/user");

// Protect routes using an access token.
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Read Bearer token from Authorization header.
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login.",
      });
    }

    if (!process.env.JWT_ACCESS_SECRET) {
      console.error("JWT_ACCESS_SECRET is missing.");

      return res.status(500).json({
        success: false,
        message: "Server authentication configuration error.",
      });
    }

    // Verify access token.
    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET
    );

    // Fetch current user from MongoDB.
    const user = await User.findById(decoded.sub).select("_id role isActive");

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account not found or inactive. Please login again.",
      });
    }

    // Attach authenticated user information to request.
    req.user = {
      id: user._id.toString(),
      role: user.role,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Access token expired. Please refresh your session.",
      });
    }

    if (
      error.name === "JsonWebTokenError" ||
      error.name === "CastError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    console.error("Authentication middleware error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Authentication failed.",
    });
  }
};

// Restrict routes to specific roles.
exports.authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource.",
      });
    }

    next();
  };
};
