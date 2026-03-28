"use strict";
function requireAuth(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ success: false, message: "נדרשת התחברות" });
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session?.user || req.session.user.role !== "admin")
    return res.status(403).json({ success: false, message: "נדרשות הרשאות מנהל" });
  next();
}
module.exports = { requireAuth, requireAdmin };
