"use strict";

const express = require("express");
const bcrypt  = require("bcryptjs");
const db      = require("../db/database");

const router = express.Router();

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "יש למלא שם משתמש וסיסמה" });
  }

  const user = db.getUserByUsername(username);
  if (!user) {
    return res.status(401).json({ success: false, message: "שם משתמש או סיסמה שגויים" });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ success: false, message: "שם משתמש או סיסמה שגויים" });
  }

  const sessionUser = { id: user.id, username: user.username, role: user.role };
  req.session.user = sessionUser;
  return res.json({ success: true, user: sessionUser });
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// GET /api/auth/me
router.get("/me", (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ success: false, message: "לא מחובר" });
  }
  return res.json({ success: true, user: req.session.user });
});

module.exports = router;
