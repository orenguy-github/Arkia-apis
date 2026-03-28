"use strict";

/**
 * Validates the PAX sheet (tabular format, one row per passenger).
 * Returns { errors, warnings }.
 */

const DATE_RE = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;

const REQUIRED_HEADERS = [
  "Last Name", "First Name", "Sex", "Country of Residence",
  "Date of Birth", "Citizenship", "Street Address", "City",
  "State", "ZIP", "Document Type", "Document Number",
  "Country of Issuance", "Expiration Date",
];

function parseDate(str) {
  if (!DATE_RE.test(String(str))) return null;
  const [m, d, y] = String(str).split("/").map(Number);
  const date = new Date(y, m - 1, d);
  return (date.getMonth() === m - 1 && date.getDate() === d) ? date : null;
}

function isEmpty(v) {
  return String(v ?? "").trim() === "";
}

function validate(headers, dataRows) {
  const errors   = [];
  const warnings = [];

  // ── Check all required headers exist ───────────────────────────
  const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));
  if (missingHeaders.length) {
    missingHeaders.forEach(h =>
      errors.push({ sheet: "PAX", field: h, row: null, message: `עמודה חסרה: "${h}"` })
    );
    return { errors, warnings };
  }

  const COL = {};
  headers.forEach((h, i) => { COL[h] = i; });

  function get(row, col)       { return row[COL[col]] ?? ""; }
  function err(rowNum, field, msg) {
    errors.push({ sheet: "PAX", row: rowNum, field, message: msg });
  }

  const TODAY = new Date();
  TODAY.setHours(0, 0, 0, 0);

  dataRows.forEach((row, i) => {
    const rowNum = i + 2; // +1 for 1-based, +1 for header row

    // Last Name: letters and spaces only, not empty
    const lastName = String(get(row, "Last Name")).trim();
    if (isEmpty(lastName))
      err(rowNum, "Last Name", "שדה חובה ריק");
    else if (!/^[A-Za-z\s]+$/.test(lastName))
      err(rowNum, "Last Name", `תווים לא חוקיים: "${lastName}" — אותיות ורווחים בלבד`);

    // First Name: letters and spaces only, not empty
    const firstName = String(get(row, "First Name")).trim();
    if (isEmpty(firstName))
      err(rowNum, "First Name", "שדה חובה ריק");
    else if (!/^[A-Za-z\s]+$/.test(firstName))
      err(rowNum, "First Name", `תווים לא חוקיים: "${firstName}" — אותיות ורווחים בלבד`);

    // Sex: F or M
    const sex = String(get(row, "Sex")).trim();
    if (isEmpty(sex))
      err(rowNum, "Sex", "שדה חובה ריק");
    else if (sex !== "F" && sex !== "M")
      err(rowNum, "Sex", `ערך לא תקין: "${sex}" — נדרש F או M`);

    // Country of Residence: 3 uppercase letters (ISO alpha-3)
    const cor = String(get(row, "Country of Residence")).trim();
    if (isEmpty(cor))
      err(rowNum, "Country of Residence", "שדה חובה ריק");
    else if (!/^[A-Z]{3}$/.test(cor))
      err(rowNum, "Country of Residence", `פורמט ISO שגוי: "${cor}" — נדרש 3 אותיות גדולות`);

    // Date of Birth: MM/DD/YYYY
    const dob = String(get(row, "Date of Birth")).trim();
    if (isEmpty(dob))
      err(rowNum, "Date of Birth", "שדה חובה ריק");
    else if (!parseDate(dob))
      err(rowNum, "Date of Birth", `תאריך לא תקין: "${dob}" — נדרש MM/DD/YYYY`);

    // Citizenship: 3 uppercase letters (ISO alpha-3)
    const cit = String(get(row, "Citizenship")).trim();
    if (isEmpty(cit))
      err(rowNum, "Citizenship", "שדה חובה ריק");
    else if (!/^[A-Z]{3}$/.test(cit))
      err(rowNum, "Citizenship", `פורמט ISO שגוי: "${cit}" — נדרש 3 אותיות גדולות`);

    // Street Address: not empty
    if (isEmpty(get(row, "Street Address")))
      err(rowNum, "Street Address", "שדה חובה ריק");

    // City: not empty
    if (isEmpty(get(row, "City")))
      err(rowNum, "City", "שדה חובה ריק");

    // State: exactly 2 letters, not empty
    const state = String(get(row, "State")).trim();
    if (isEmpty(state))
      err(rowNum, "State", "שדה חובה ריק");
    else if (!/^[A-Za-z]{2}$/.test(state))
      err(rowNum, "State", `פורמט שגוי: "${state}" — נדרש 2 אותיות`);

    // ZIP: digits only, not empty
    const zip = String(get(row, "ZIP")).trim();
    if (isEmpty(zip))
      err(rowNum, "ZIP", "שדה חובה ריק");
    else if (!/^\d+$/.test(zip))
      err(rowNum, "ZIP", `פורמט שגוי: "${zip}" — מספרים בלבד`);

    // Document Type: must be P
    const docType = String(get(row, "Document Type")).trim();
    if (isEmpty(docType))
      err(rowNum, "Document Type", "שדה חובה ריק");
    else if (docType !== "P")
      err(rowNum, "Document Type", `סוג מסמך לא נתמך: "${docType}" — רק דרכון (P) מותר`);

    // Document Number: alphanumeric only, not empty
    const docNum = String(get(row, "Document Number")).trim();
    if (isEmpty(docNum))
      err(rowNum, "Document Number", "שדה חובה ריק");
    else if (!/^[A-Za-z0-9]+$/.test(docNum))
      err(rowNum, "Document Number", `תווים לא חוקיים: "${docNum}" — אותיות ומספרים בלבד`);

    // Country of Issuance: 3 uppercase letters (ISO alpha-3)
    const coi = String(get(row, "Country of Issuance")).trim();
    if (isEmpty(coi))
      err(rowNum, "Country of Issuance", "שדה חובה ריק");
    else if (!/^[A-Z]{3}$/.test(coi))
      err(rowNum, "Country of Issuance", `פורמט ISO שגוי: "${coi}" — נדרש 3 אותיות גדולות`);

    // Expiration Date: MM/DD/YYYY + must be after today
    const expStr = String(get(row, "Expiration Date")).trim();
    if (isEmpty(expStr)) {
      err(rowNum, "Expiration Date", "שדה חובה ריק");
    } else {
      const expDate = parseDate(expStr);
      if (!expDate)
        err(rowNum, "Expiration Date", `תאריך לא תקין: "${expStr}" — נדרש MM/DD/YYYY`);
      else if (expDate <= TODAY)
        err(rowNum, "Expiration Date", `תעודה פגת תוקף: "${expStr}"`);
    }
  });

  return { errors, warnings };
}

module.exports = { validate };
