"use strict";

const Database = require("better-sqlite3");
const fs       = require("fs");
const config   = require("../config");

// Ensure the data directory exists (important on first run in production)
fs.mkdirSync(config.DATA_DIR, { recursive: true });

const db = new Database(config.DB_PATH);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");

// Create uploads log table
db.exec(`
  CREATE TABLE IF NOT EXISTS uploads (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    filename      TEXT    NOT NULL,
    original_name TEXT    NOT NULL,
    row_count     INTEGER NOT NULL DEFAULT 0,
    status        TEXT    NOT NULL DEFAULT 'uploaded',
    created_at    DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at    DATETIME NOT NULL DEFAULT (datetime('now', 'localtime'))
  )
`);

// ── Queries ───────────────────────────────────────────────────────────────────

const stmtInsert = db.prepare(`
  INSERT INTO uploads (filename, original_name, row_count, status)
  VALUES (@filename, @original_name, @row_count, @status)
`);

const stmtUpdateStatus = db.prepare(`
  UPDATE uploads
  SET status = @status, updated_at = datetime('now', 'localtime')
  WHERE id = @id
`);

const stmtGetAll = db.prepare(`
  SELECT * FROM uploads ORDER BY created_at DESC
`);

const stmtGetById = db.prepare(`
  SELECT * FROM uploads WHERE id = ?
`);

// ── Exports ───────────────────────────────────────────────────────────────────

function logUpload({ filename, originalName, rowCount }) {
  const result = stmtInsert.run({
    filename,
    original_name: originalName,
    row_count:     rowCount,
    status:        "uploaded",
  });
  return result.lastInsertRowid;
}

function updateStatus(id, status) {
  stmtUpdateStatus.run({ id, status });
}

function getAllUploads() {
  return stmtGetAll.all();
}

function getUploadById(id) {
  return stmtGetById.get(id) || null;
}

module.exports = { logUpload, updateStatus, getAllUploads, getUploadById };
