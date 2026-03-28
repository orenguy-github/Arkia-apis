"use strict";

const express            = require("express");
const multer             = require("multer");
const path               = require("path");
const fs                 = require("fs");
const config             = require("../config");
const validate           = require("../validation");
const db                 = require("../db/database");
const { createJob, getJob } = require("../jobs/jobStore");
const { enqueue }        = require("../jobs/jobQueue");
const { runAutomation }  = require("../automation");

const router = express.Router();

// ── Multer setup ─────────────────────────────────────────────────────────────

// Ensure uploads dir exists (runs once on startup)
fs.mkdirSync(config.UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: config.UPLOADS_DIR,
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: config.UPLOAD_SIZE_LIMIT_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".xlsx" || ext === ".xls") return cb(null, true);
    cb(new Error("סוג קובץ לא נתמך — יש להעלות קובץ Excel בלבד (.xlsx / .xls)"));
  },
});

// ── Session store (in-memory, 15-min TTL) ────────────────────────────────────

const sessions = new Map();

function storeSession(token, data) {
  sessions.set(token, data);
  setTimeout(() => sessions.delete(token), 15 * 60 * 1000);
}

// ── POST /api/upload ──────────────────────────────────────────────────────────

router.post("/upload", (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "לא נבחר קובץ" });
    }

    const filePath     = req.file.path;
    const originalName = req.file.originalname;

    try {
      const result = await validate(filePath);

      // Count PAX rows from the result
      const rowCount = (result.rows.pax || []).length;

      // Log to DB (always, regardless of validation result)
      const uploadId = db.logUpload({
        filename:     path.basename(filePath),
        originalName,
        rowCount,
      });

      // Clean up temp file immediately
      fs.unlink(filePath, () => {});

      if (!result.valid) {
        // Update DB status to failed
        db.updateStatus(uploadId, "validation_failed");

        // Cap displayed errors at 100
        const displayed    = result.errors.slice(0, 100);
        const totalErrors  = result.errors.length;

        return res.json({
          success:     false,
          errors:      displayed,
          totalErrors,
          warnings:    result.warnings,
        });
      }

      // Validation passed — store session
      const token = crypto.randomUUID();
      storeSession(token, { uploadId, rows: result.rows, rowCount, originalName });

      return res.json({
        success:      true,
        sessionToken: token,
        rowCount,
        originalName,
        warnings:     result.warnings,
      });

    } catch (parseErr) {
      fs.unlink(filePath, () => {});
      return res.status(500).json({
        success: false,
        message: `שגיאה בקריאת הקובץ: ${parseErr.message}`,
      });
    }
  });
});

// ── POST /api/confirm ─────────────────────────────────────────────────────────

router.post("/confirm", (req, res) => {
  const { sessionToken, action } = req.body;

  if (!sessionToken || !sessions.has(sessionToken)) {
    return res.status(400).json({ success: false, message: "סשן לא תקין — יש להעלות את הקובץ מחדש" });
  }

  const { uploadId, rows } = sessions.get(sessionToken);
  sessions.delete(sessionToken);

  if (action === "cancel") {
    db.updateStatus(uploadId, "cancelled");
    return res.json({ success: true, status: "cancelled" });
  }

  // Confirmed — enqueue automation (runs serially, one at a time)
  db.updateStatus(uploadId, "confirmed");
  const jobId = createJob();
  enqueue(jobId, rows, runAutomation);

  return res.json({ success: true, status: "confirmed", jobId });
});

// ── GET /api/status/:jobId ────────────────────────────────────────────────────

router.get("/status/:jobId", (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).json({ success: false, message: "עבודה לא נמצאה" });
  return res.json({ success: true, ...job });
});

// ── GET /api/uploads ──────────────────────────────────────────────────────────

router.get("/uploads", (_req, res) => {
  return res.json({ success: true, uploads: db.getAllUploads() });
});

module.exports = router;
