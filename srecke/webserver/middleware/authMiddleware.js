const axios = require("axios");

const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL || "http://user_service:8000/auth/verify-token";

module.exports = async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "Missing Authorization header" });
    }

    const [type, token] = authHeader.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({ error: "Invalid Authorization format" });
    }

    // call auth service
    const response = await axios.post(AUTH_SERVICE_URL, {
      token,
    });

    if (!response.data || response.data.valid !== true) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // attach verified user info to request
    req.user = {
      id: response.data.user_id,
      username: response.data.username,
      email: response.data.email,
      userType: response.data.user_type,
    };

    next();
  } catch (err) {
    console.error("Auth service error:", err.message);

    return res.status(401).json({
      error: "Authentication failed",
    });
  }
};
