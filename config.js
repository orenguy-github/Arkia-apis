"use strict";

const path = require("path");

// DATA_DIR: defaults to local db/ directory (works on all platforms)
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "db");

module.exports = {
  PORT: process.env.PORT || 3002,

  // Paths — override via DATA_DIR in production
  DATA_DIR,
  DB_PATH:      path.join(DATA_DIR, "uploads.db"),
  UPLOADS_DIR:  path.join(DATA_DIR, "uploads"),

  // --- Target website (to be filled in later) ---
  AUTOMATION_URL:  process.env.AUTOMATION_URL  || "",
  AUTOMATION_USER: process.env.AUTOMATION_USER || "",
  AUTOMATION_PASS: process.env.AUTOMATION_PASS || "",

  // Run browser in headless mode (true in production, false for debugging)
  HEADLESS: process.env.HEADLESS !== "false",

  // Upload limits
  UPLOAD_SIZE_LIMIT_MB: 10,

  SESSION_SECRET: process.env.SESSION_SECRET || "arkia-apis-dev-secret",
  ADMIN_USER:     process.env.ADMIN_USER     || "admin",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "Arkia2024!",

  // Optional second permanent user (seeded on every startup, survives DB wipe)
  // Set SEED_USER + SEED_PASSWORD in Render environment to activate
  SEED_USER:      process.env.SEED_USER      || "",
  SEED_PASSWORD:  process.env.SEED_PASSWORD  || "",
  SEED_ROLE:      process.env.SEED_ROLE      || "user",
};
