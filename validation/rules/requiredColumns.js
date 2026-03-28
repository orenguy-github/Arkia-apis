"use strict";

/**
 * Rule: Required column headers
 *
 * TODO: Replace REQUIRED_COLUMNS with the actual column names once the
 *       Excel format is confirmed.
 *
 * Contract: export a `validate(headers, dataRows)` function that returns
 * an array of { row, column, message } error objects (empty = no errors).
 */

// ── Configure here ────────────────────────────────────────────────────────────
const REQUIRED_COLUMNS = [
  // "שם נוסע",
  // "מספר דרכון",
  // "תאריך טיסה",
];
// ─────────────────────────────────────────────────────────────────────────────

function validate(headers, _dataRows) {
  const errors = [];

  for (const col of REQUIRED_COLUMNS) {
    if (!headers.includes(col)) {
      errors.push({
        row: 1,
        column: col,
        message: `עמודה חובה חסרה: "${col}"`,
      });
    }
  }

  return errors;
}

module.exports = { validate };
