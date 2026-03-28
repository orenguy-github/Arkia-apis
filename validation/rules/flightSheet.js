"use strict";

/**
 * Validates the Flight sheet (vertical key→value format).
 * Returns { errors, warnings } — errors block, warnings allow proceeding.
 */

const DATE_RE        = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;
const TIME_STRICT_RE = /^\d{2}:\d{2}$/;
const TIME_LOOSE_RE  = /^\d{1,2}:\d{2}$/;

function parseDate(str) {
  if (!DATE_RE.test(String(str))) return null;
  const [m, d, y] = String(str).split("/").map(Number);
  const date = new Date(y, m - 1, d);
  return (date.getMonth() === m - 1 && date.getDate() === d) ? date : null;
}

function isEmpty(v) {
  return v === "" || v === null || v === undefined;
}

function validateTime(rawValue, fieldName) {
  const errors   = [];
  const warnings = [];

  if (isEmpty(rawValue)) {
    errors.push({ sheet: "Flight", field: fieldName, message: "שדה חובה ריק" });
    return { errors, warnings };
  }

  const str = String(rawValue).trim();

  if (!TIME_LOOSE_RE.test(str)) {
    errors.push({ sheet: "Flight", field: fieldName, message: `פורמט שגוי: "${str}" — נדרש HH:MM` });
    return { errors, warnings };
  }

  const [hh, mm] = str.split(":").map(Number);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    errors.push({ sheet: "Flight", field: fieldName, message: `שעה לא תקינה: "${str}"` });
    return { errors, warnings };
  }

  if (!TIME_STRICT_RE.test(str)) {
    const fixed = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    warnings.push({ sheet: "Flight", field: fieldName, message: `פורמט חסר אפס מוביל: "${str}" — מומלץ ${fixed}` });
  }

  return { errors, warnings };
}

function validate(data) {
  const errors   = [];
  const warnings = [];

  function err(field, msg)  { errors.push({ sheet: "Flight", field, message: msg }); }
  function warn(field, msg) { warnings.push({ sheet: "Flight", field, message: msg }); }
  function get(field)       { return data[field]; }

  // ── Carrier Code: exactly 2 letters ────────────────────────────
  const cc = String(get("Carrier Code") ?? "").trim();
  if (isEmpty(cc))              err("Carrier Code", "שדה חובה ריק");
  else if (!/^[A-Za-z0-9]{2}$/.test(cc))
    err("Carrier Code", `פורמט שגוי: "${cc}" — נדרש בדיוק 2 תווים (אותיות ו/או מספרים)`);

  // ── Flight Number: digits only ──────────────────────────────────
  const fn = String(get("Flight Number") ?? "").trim();
  if (isEmpty(fn))             err("Flight Number", "שדה חובה ריק");
  else if (!/^\d+$/.test(fn)) err("Flight Number", `פורמט שגוי: "${fn}" — מספרים בלבד`);

  // ── Departure Airport: IATA 3 uppercase letters ────────────────
  const depAp = String(get("Departure Airport") ?? "").trim();
  if (isEmpty(depAp))                   err("Departure Airport", "שדה חובה ריק");
  else if (!/^[A-Z]{3}$/.test(depAp))  err("Departure Airport", `פורמט IATA שגוי: "${depAp}" — נדרש 3 אותיות גדולות`);

  // ── Departure Date: MM/DD/YYYY + not in the past ───────────────
  const depDateStr = String(get("Departure Date") ?? "").trim();
  let depDate = null;
  if (isEmpty(depDateStr)) err("Departure Date", "שדה חובה ריק");
  else {
    depDate = parseDate(depDateStr);
    if (!depDate) {
      err("Departure Date", `תאריך לא תקין: "${depDateStr}" — נדרש MM/DD/YYYY`);
    } else {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (depDate < today)
        err("Departure Date", `תאריך יציאה (${depDateStr}) הוא בעבר — נדרש תאריך היום או עתיד`);
    }
  }

  // ── Departure Time: HH:MM (warning if H:MM) ────────────────────
  const depTime = validateTime(get("Departure Time"), "Departure Time");
  errors.push(...depTime.errors);
  warnings.push(...depTime.warnings);

  // ── Destination Airport: IATA 3 uppercase letters ───────────────
  const destAp = String(get("Destination Airport") ?? "").trim();
  if (isEmpty(destAp))                    err("Destination Airport", "שדה חובה ריק");
  else if (!/^[A-Z]{3}$/.test(destAp))   err("Destination Airport", `פורמט IATA שגוי: "${destAp}" — נדרש 3 אותיות גדולות`);

  // ── Destination Date: MM/DD/YYYY + >= dep + within 30 days ─────
  const destDateStr = String(get("Destination Date") ?? "").trim();
  let destDate = null;
  if (isEmpty(destDateStr)) err("Destination Date", "שדה חובה ריק");
  else {
    destDate = parseDate(destDateStr);
    if (!destDate) {
      err("Destination Date", `תאריך לא תקין: "${destDateStr}" — נדרש MM/DD/YYYY`);
    } else {
      if (depDate && destDate < depDate)
        err("Destination Date", `תאריך יעד (${destDateStr}) לפני תאריך יציאה (${depDateStr})`);

      const maxDest = new Date(); maxDest.setDate(maxDest.getDate() + 30); maxDest.setHours(0, 0, 0, 0);
      if (destDate > maxDest)
        err("Destination Date", `תאריך יעד (${destDateStr}) חורג מ-30 יום מהיום`);
    }
  }

  // ── Destination Time: same-day check + HH:MM ───────────────────
  const destTimeRaw = get("Destination Time");
  const destTime = validateTime(destTimeRaw, "Destination Time");
  errors.push(...destTime.errors);
  warnings.push(...destTime.warnings);

  // If same departure and destination date, destination time must be >= departure time
  if (depDate && destDate && depDate.getTime() === destDate.getTime() &&
      destTime.errors.length === 0 && depTime.errors.length === 0) {
    const [dh, dm] = String(get("Departure Time") || "").split(":").map(Number);
    const [ah, am] = String(destTimeRaw || "").split(":").map(Number);
    if (!isNaN(dh) && !isNaN(ah) && (ah * 60 + am) < (dh * 60 + dm))
      err("Destination Time", `שעת הגעה (${destTimeRaw}) לפני שעת יציאה (${get("Departure Time")}) באותו יום`);
  }

  // ── Crew: integer >= 0 ──────────────────────────────────────────
  const crew = get("Crew");
  if (isEmpty(crew) && crew !== 0)         err("Crew", "שדה חובה ריק");
  else if (!/^\d+$/.test(String(crew).trim())) err("Crew", `פורמט שגוי: "${crew}" — מספר שלם בלבד`);

  // ── Passengers: integer >= 0, max 50 per eAPIS submission ───────
  const pax = get("Passengers");
  if (isEmpty(pax) && pax !== 0)              err("Passengers", "שדה חובה ריק");
  else if (!/^\d+$/.test(String(pax).trim())) err("Passengers", `פורמט שגוי: "${pax}" — מספר שלם בלבד`);
  else if (Number(pax) > 50)
    warn("Passengers", `ערך ${pax} חורג ממגבלת 50 נוסעים לטעינה אחת — יוזנו 50 בלבד`);

  // ── In-transit Passengers: integer >= 0 ────────────────────────
  const transit = get("In-transit Passengers");
  if (isEmpty(transit) && transit !== 0)          err("In-transit Passengers", "שדה חובה ריק");
  else if (!/^\d+$/.test(String(transit).trim())) err("In-transit Passengers", `פורמט שגוי: "${transit}" — מספר שלם בלבד`);

  return { errors, warnings };
}

module.exports = { validate };
