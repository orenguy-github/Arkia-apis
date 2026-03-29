"use strict";

// Must be set before any Playwright require
const path = require("path");
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, ".playwright");

const express = require("express");
const config  = require("./config");

// Load .env file if it exists
try {
  require("fs").readFileSync(path.join(__dirname, ".env"), "utf8")
    .split("\n")
    .forEach(line => {
      const [key, ...rest] = line.split("=");
      if (key && !key.startsWith("#") && rest.length) {
        process.env[key.trim()] = rest.join("=").trim();
      }
    });
} catch (_) {
  // .env not found — rely on real environment variables
}

const session     = require("express-session");
const bcrypt      = require("bcryptjs");
const { requireAuth, requireAdmin } = require("./middleware/auth");
const authRoutes  = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const uploadRoutes = require("./routes/upload");
const db          = require("./db/database");
const { getJob }  = require("./jobs/jobStore");

const PUBLIC_DIR = path.join(__dirname, "public");

const app = express();
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

app.use(session({
  secret:            config.SESSION_SECRET,
  resave:            false,
  saveUninitialized: false,
  cookie:            { maxAge: 8 * 60 * 60 * 1000 }, // 8 hours
}));

app.use("/api/auth", authRoutes);

// Public — job status polling uses a random UUID as the identifier;
// no sensitive data is exposed and no auth is needed to check your own job.
app.get("/api/status/:jobId", (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).json({ success: false, message: "עבודה לא נמצאה — ייתכן שהשרת הופעל מחדש" });
  const { uploadId: _, ...jobData } = job;
  return res.json({ success: true, ...jobData });
});

app.use("/api/admin", requireAuth, requireAdmin, adminRoutes);
app.use("/api", requireAuth, uploadRoutes);

// Fallback: serve index.html for any non-API route
app.use((req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// Seed the default admin user at startup
const defaultHash = bcrypt.hashSync(config.ADMIN_PASSWORD, 10);
db.seedAdminUser(config.ADMIN_USER, defaultHash);
if (config.ADMIN_PASSWORD === "Arkia2024!") {
  console.warn("⚠️  Using default admin password — change ADMIN_PASSWORD env var in production!");
}

// Seed permanent operator user
db.seedAdminUser("arkia", bcrypt.hashSync("Arkia2026!", 10), "user");

// Seed optional additional user (set SEED_USER + SEED_PASSWORD env vars)
if (config.SEED_USER && config.SEED_PASSWORD) {
  const seedHash = bcrypt.hashSync(config.SEED_PASSWORD, 10);
  db.seedAdminUser(config.SEED_USER, seedHash, config.SEED_ROLE);
}

app.listen(config.PORT, () => {
  console.log(`שרת פועל: http://localhost:${config.PORT}`);
});
