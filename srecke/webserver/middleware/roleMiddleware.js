module.exports.requireAdmin = function (req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  if (req.user.userType !== "admin") {
    return res.status(403).json({
      error: "Admin privileges required",
    });
  }

  next();
};
