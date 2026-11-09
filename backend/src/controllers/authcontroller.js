
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// Hash refresh tokens before storing them in MongoDB.
const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

// Generate access and refresh tokens.
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { role: user.role },
    process.env.JWT_ACCESS_SECRET,
    {
      subject: user._id.toString(),
      expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
    }
  );

  const refreshToken = jwt.sign(
    { tokenVersion: 1 },
    process.env.JWT_REFRESH_SECRET,
    {
      subject: user._id.toString(),
      expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
    }
  );

  return { accessToken, refreshToken };
};

// Refresh token cookie configuration.
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.COOKIE_SAME_SITE || "lax",
  path: "/api/v1/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

// Remove sensitive fields from user response.
const sanitizeUser = (user) => {
  const userObject = user.toObject();

  delete userObject.password;
  delete userObject.refreshTokenHash;

  return userObject;
};

// REGISTER
const register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Required field validation.
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required.",
      });
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedName.length < 2 || normalizedName.length > 60) {
      return res.status(400).json({
        success: false,
        message: "Name must contain between 2 and 60 characters.",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long.",
      });
    }

    if (password.length > 72) {
      return res.status(400).json({
        success: false,
        message: "Password must not exceed 72 characters.",
      });
    }

    // Check whether the email is already registered.
    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // Hash password before saving.
    const hashedPassword = await bcrypt.hash(password, 12);

    // Never accept role from public registration input.
    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      phone: phone?.trim(),
      password: hashedPassword,
      role: "customer",
    });

    // Generate tokens.
    const { accessToken, refreshToken } = generateTokens(user);

    // Store only the hash of the refresh token.
    user.refreshTokenHash = hashToken(refreshToken);
    await user.save();

    // Send refresh token through an HTTP-only cookie.
    res.cookie("refreshToken", refreshToken, getCookieOptions());

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      accessToken,
      user: sanitizeUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    console.error("Register error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create account. Please try again.",
    });
  }
};

// LOGIN
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Password and refreshTokenHash are normally excluded by the schema.
    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password +refreshTokenHash");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive. Please contact support.",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Generate new tokens.
    const { accessToken, refreshToken } = generateTokens(user);

    user.refreshTokenHash = hashToken(refreshToken);
    await user.save();

    res.cookie("refreshToken", refreshToken, getCookieOptions());

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      accessToken,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to login. Please try again.",
    });
  }
};

// REFRESH ACCESS TOKEN
const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is missing. Please login again.",
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET
      );
    } catch {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token. Please login again.",
      });
    }

    const user = await User.findById(decoded.sub).select(
      "+refreshTokenHash"
    );

    if (!user || !user.isActive || !user.refreshTokenHash) {
      return res.status(401).json({
        success: false,
        message: "Session is no longer valid. Please login again.",
      });
    }

    const incomingHash = hashToken(refreshToken);

    const storedBuffer = Buffer.from(user.refreshTokenHash, "hex");
    const incomingBuffer = Buffer.from(incomingHash, "hex");

    if (
      storedBuffer.length !== incomingBuffer.length ||
      !crypto.timingSafeEqual(storedBuffer, incomingBuffer)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid session. Please login again.",
      });
    }

    // Rotate refresh token after successful verification.
    const { accessToken, refreshToken: newRefreshToken } =
      generateTokens(user);

    user.refreshTokenHash = hashToken(newRefreshToken);
    await user.save();

    res.cookie(
      "refreshToken",
      newRefreshToken,
      getCookieOptions()
    );

    return res.status(200).json({
      success: true,
      message: "Access token refreshed successfully.",
      accessToken,
    });
  } catch (error) {
    console.error("Refresh token error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to refresh session.",
    });
  }
};

// LOGOUT
const logout = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    if (userId) {
      await User.findByIdAndUpdate(userId, {
        $unset: { refreshTokenHash: 1 },
      });
    }

    res.clearCookie("refreshToken", getCookieOptions());

    return res.status(200).json({
      success: true,
      message: "Logout successful.",
    });
  } catch (error) {
    console.error("Logout error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to logout.",
    });
  }
};

// GET LOGGED-IN USER PROFILE
const getMe = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const user = await User.findById(userId);

    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: "User not found or inactive.",
      });
    }

    return res.status(200).json({
      success: true,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Get profile error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch profile.",
    });
  }
};

module.exports ={
    register,
    login,
    refreshAccessToken,
    logout,
    getMe
}