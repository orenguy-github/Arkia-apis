"use strict";

/**
 * Step: Fill Passenger Information form (up to 5 passengers per page load)
 * and click "Review Manifest".
 *
 * eAPIS page after crew info: submitCrewInfo.do
 *
 * Each passenger block has these fields (nth(i) within the named group):
 *   Last Name, First Name, Country of Residence, Citizenship,
 *   Street Address, City, State, ZIP               → textbox, nth(i)
 *   Sex                                             → combobox, nth(i)  ("M" / "F")
 *   Document Type                                   → combobox, nth(i)  (always "Passport")
 *   Document Number, Country of Issuance            → textbox, nth(i*2)  (two doc slots; use slot 0)
 *
 *   Date fields — per block there are 2 date rows (DOB then Expiration):
 *     Date of Birth MM/DD/YYYY  → nth(i*2),   nth(i*2),   nth(i*2)
 *     Expiration Date MM/DD/YYYY → nth(i*2+1), nth(i*2+1), nth(i*2+1)
 *
 * @param {object}  page     - Playwright page
 * @param {Array}   paxRows  - Array of passenger objects (max 5)
 * @param {boolean} isLast   - true → click "Review Manifest"; false → leave for "Add Passengers"
 */
async function enterPassengerInfo(page, paxRows, isLast) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForSelector('input[type="text"]');

  const batch = paxRows.slice(0, 5);

  function splitDate(str) {
    const [mm = "", dd = "", yyyy = ""] = String(str || "").trim().split("/");
    return { mm, dd, yyyy };
  }

  function get(pax, col) {
    return String(pax[col] ?? "").trim();
  }

  for (let i = 0; i < batch.length; i++) {
    const pax = batch[i];

    const dob = splitDate(get(pax, "Date of Birth"));
    const exp = splitDate(get(pax, "Expiration Date"));

    // ── Text fields (one per passenger, simple nth) ────────────────
    await page.getByRole("textbox", { name: /last name/i }).nth(i)
      .fill(get(pax, "Last Name"));

    await page.getByRole("textbox", { name: /first name/i }).nth(i)
      .fill(get(pax, "First Name"));

    await page.getByRole("textbox", { name: /country of residence/i }).nth(i)
      .fill(get(pax, "Country of Residence"));

    await page.getByRole("textbox", { name: /citizenship/i }).nth(i)
      .fill(get(pax, "Citizenship"));

    await page.getByRole("textbox", { name: /street address/i }).nth(i)
      .fill(get(pax, "Street Address"));

    await page.getByRole("textbox", { name: /^city/i }).nth(i)
      .fill(get(pax, "City"));

    await page.getByRole("textbox", { name: /^state/i }).nth(i)
      .fill(get(pax, "State"));

    await page.getByRole("textbox", { name: /zip/i }).nth(i)
      .fill(get(pax, "ZIP"));

    // ── Sex combobox ───────────────────────────────────────────────
    await page.getByRole("combobox", { name: /sex/i }).nth(i)
      .selectOption(get(pax, "Sex"));

    // ── Document Type combobox (always Passport) ───────────────────
    await page.getByRole("combobox", { name: /document type/i }).nth(i)
      .selectOption("Passport");

    // ── Document Number and Country of Issuance (2 doc slots per pax) ─
    await page.getByRole("textbox", { name: /document number/i }).nth(i * 2)
      .fill(get(pax, "Document Number"));

    await page.getByRole("textbox", { name: /country of issuance/i }).nth(i * 2)
      .fill(get(pax, "Country of Issuance"));

    // ── Date of Birth (2 date rows per passenger: DOB=even, Exp=odd) ──
    await page.getByRole("textbox", { name: /^MM$/i }).nth(i * 2).fill(dob.mm);
    await page.getByRole("textbox", { name: /^DD$/i }).nth(i * 2).fill(dob.dd);
    await page.getByRole("textbox", { name: /^YYYY$/i }).nth(i * 2).fill(dob.yyyy);

    // ── Expiration Date ────────────────────────────────────────────
    await page.getByRole("textbox", { name: /^MM$/i }).nth(i * 2 + 1).fill(exp.mm);
    await page.getByRole("textbox", { name: /^DD$/i }).nth(i * 2 + 1).fill(exp.dd);
    await page.getByRole("textbox", { name: /^YYYY$/i }).nth(i * 2 + 1).fill(exp.yyyy);
  }

  // ── Review Manifest (only on the last chunk) ──────────────────────
  if (isLast) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}),
      page.getByRole("button", { name: "Review Manifest" }).click(),
    ]);
  }
}

module.exports = { enterPassengerInfo };
