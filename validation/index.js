"use strict";

const xlsx       = require("xlsx");
const flightRule = require("./rules/flightSheet");
const paxRule    = require("./rules/paxSheet");

/**
 * Parse and validate the APIS Excel file (two sheets: Flight + PAX).
 * @param {string} filePath
 * @returns {{ valid: boolean, errors: object[], warnings: object[], rows: object }}
 */
async function validate(filePath) {
  const workbook = xlsx.readFile(filePath);

  const errors   = [];
  const warnings = [];

  // ── Locate sheets ───────────────────────────────────────────────
  const flightSheetName = workbook.SheetNames.find(n => /flight/i.test(n));
  const paxSheetName    = workbook.SheetNames.find(n => /pax/i.test(n));

  if (!flightSheetName) errors.push({ sheet: "כללי", field: "", message: 'גליון Flight לא נמצא בקובץ' });
  if (!paxSheetName)    errors.push({ sheet: "כללי", field: "", message: 'גליון PAX לא נמצא בקובץ' });
  if (errors.length)    return { valid: false, errors, warnings, rows: {} };

  // ── Parse Flight sheet (vertical key→value) ──────────────────────
  const flightRaw  = xlsx.utils.sheet_to_json(workbook.Sheets[flightSheetName], { header: 1, defval: "" });
  const flightData = {};
  flightRaw.forEach(row => {
    if (row[0] !== "") flightData[String(row[0]).trim()] = row[1] ?? "";
  });

  // ── Parse PAX sheet (tabular) ────────────────────────────────────
  const paxRaw      = xlsx.utils.sheet_to_json(workbook.Sheets[paxSheetName], { header: 1, defval: "" });
  const paxHeaders  = (paxRaw[0] || []).map(h => String(h).trim());
  const paxDataRows = paxRaw.slice(1).filter(row => row.some(cell => cell !== ""));
  const paxRows     = paxDataRows.map(row => {
    const obj = {};
    paxHeaders.forEach((h, i) => { obj[h] = row[i] ?? ""; });
    return obj;
  });

  // ── Run validators ───────────────────────────────────────────────
  const flightResult = flightRule.validate(flightData);
  errors.push(...flightResult.errors);
  warnings.push(...flightResult.warnings);

  const paxResult = paxRule.validate(paxHeaders, paxDataRows);
  errors.push(...paxResult.errors);
  warnings.push(...(paxResult.warnings || []));

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    rows: { flight: flightData, pax: paxRows },
  };
}

module.exports = validate;
