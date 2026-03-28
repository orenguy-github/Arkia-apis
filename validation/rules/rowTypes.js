"use strict";

/**
 * Rule: Cell data type validation
 *
 * TODO: Define column type constraints once the Excel format is confirmed.
 *
 * Example entry in COLUMN_TYPES:
 *   { column: "תאריך טיסה", type: "date",   required: true  }
 *   { column: "מחיר",       type: "number",  required: false }
 *   { column: "שם נוסע",    type: "string",  required: true  }
 *
 * Supported types: "string" | "number" | "date"
 */

// ── Configure here ────────────────────────────────────────────────────────────
const COLUMN_TYPES = [
  // { column: "שם נוסע",    type: "string", required: true },
];
// ─────────────────────────────────────────────────────────────────────────────

function validate(headers, dataRows) {
  const errors = [];

  for (const rule of COLUMN_TYPES) {
    const colIndex = headers.indexOf(rule.column);
    if (colIndex === -1) continue; // requiredColumns rule handles missing columns

    dataRows.forEach((row, i) => {
      const value = row[colIndex];
      const rowNum = i + 2; // +2: 1-based + header row

      if (rule.required && (value === "" || value === null || value === undefined)) {
        errors.push({ row: rowNum, column: rule.column, message: `שדה חובה ריק` });
        return;
      }

      if (value === "" || value === null || value === undefined) return;

      if (rule.type === "number" && isNaN(Number(value))) {
        errors.push({ row: rowNum, column: rule.column, message: `ערך לא מספרי: "${value}"` });
      }

      if (rule.type === "date") {
        const d = new Date(value);
        if (isNaN(d.getTime())) {
          errors.push({ row: rowNum, column: rule.column, message: `תאריך לא תקין: "${value}"` });
        }
      }
    });
  }

  return errors;
}

module.exports = { validate };
