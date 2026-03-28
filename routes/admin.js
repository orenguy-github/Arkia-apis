"use strict";

const express = require("express");
const bcrypt  = require("bcryptjs");
const db      = require("../db/database");

const router = express.Router();

// GET /api/admin/runs
router.get("/runs", (_req, res) => {
  const runs = db.getAllUploads();
  return res.json({ success: true, runs });
});

// GET /api/admin/users
router.get("/users", (_req, res) => {
  const users = db.getAllUsers();
  return res.json({ success: true, users });
});

// POST /api/admin/users
router.post("/users", (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "יש למלא שם משתמש וסיסמה" });
  }
  const validRole = role === "admin" ? "admin" : "user";
  const passwordHash = bcrypt.hashSync(password, 10);
  try {
    db.createUser(username, passwordHash, validRole);
    return res.json({ success: true });
  } catch (err) {
    if (err.message && err.message.includes("UNIQUE")) {
      return res.status(400).json({ success: false, message: "שם משתמש כבר קיים" });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/admin/users/:id
router.delete("/users/:id", (req, res) => {
  const id = Number(req.params.id);
  if (id === req.session.user.id) {
    return res.status(400).json({ success: false, message: "לא ניתן למחוק את החשבון שלך" });
  }
  db.deleteUser(id);
  return res.json({ success: true });
});

module.exports = router;
