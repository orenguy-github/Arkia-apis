"use strict";

/**
 * Step: Fill Passenger Information form (up to 5 passengers per page load).
 *
 * eAPIS passenger form uses a table layout with adjacent <td> labels.
 * Selectors use multiple strategies with fallbacks for robustness.
 *
 * Date fields: each passenger block has 2 date rows — DOB (even) and Expiration (odd).
 * For 5 passengers: 10 MM fields, indexed 0-9 (passenger i: DOB=i*2, Exp=i*2+1).
 *
 * @param {object}  page    - Playwright page
 * @param {Array}   paxRows - Array of passenger objects (max 5)
 * @param {boolean} isLast  - true → click "Review Manifest"; false → caller clicks "Add Passengers"
 */
async function enterPassengerInfo(page, paxRows, isLast) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForSelector('input[type="text"]');

  const batch = paxRows.slice(0, 5);

  function splitDate(str) {
    const [mm = "", dd = "", yyyy = ""] = String(str || "").trim().split("/");
    return { mm, dd, yyyy };
  }

  function val(pax, col) {
    return String(pax[col] ?? "").trim();
  }

  /**
   * Fill a textbox using multiple selector strategies in order:
   * 1. getByRole textbox with name regex
   * 2. getByLabel with name regex
   * Falls through to the first match found.
   */
  async function fillText(nameRe, index, value) {
    const byRole = page.getByRole("textbox", { name: nameRe });
    if (await byRole.count() > index) {
      await byRole.nth(index).fill(value);
      return;
    }
    const byLabel = page.getByLabel(nameRe);
    if (await byLabel.count() > index) {
      await byLabel.nth(index).fill(value);
      return;
    }
    throw new Error(`Could not locate field "${nameRe}" at index ${index}`);
  }

  /**
   * Select combobox by name regex with fallback to getByLabel.
   */
  async function fillSelect(nameRe, index, value) {
    const byRole = page.getByRole("combobox", { name: nameRe });
    if (await byRole.count() > index) {
      await byRole.nth(index).selectOption(value);
      return;
    }
    const byLabel = page.getByLabel(nameRe);
    if (await byLabel.count() > index) {
      await byLabel.nth(index).selectOption(value);
      return;
    }
    throw new Error(`Could not locate combobox "${nameRe}" at index ${index}`);
  }

  for (let i = 0; i < batch.length; i++) {
    const pax = batch[i];

    const dob = splitDate(val(pax, "Date of Birth"));
    const exp = splitDate(val(pax, "Expiration Date"));

    // ── Name ───────────────────────────────────────────────────────
    await fillText(/last name/i,  i, val(pax, "Last Name"));
    await fillText(/first name/i, i, val(pax, "First Name"));

    // ── Sex combobox ───────────────────────────────────────────────
    await fillSelect(/sex/i, i, val(pax, "Sex"));

    // ── Date of Birth (DOB = even index, Exp = odd index) ──────────
    await fillText(/^MM$/i, i * 2,     dob.mm);
    await fillText(/^DD$/i, i * 2,     dob.dd);
    await fillText(/^YYYY$/i, i * 2,   dob.yyyy);

    // ── Country of Residence ───────────────────────────────────────
    await fillText(/country of residence/i, i, val(pax, "Country of Residence"));

    // ── Citizenship — eAPIS may label it "Country of Citizenship" ──
    await fillText(/citi?zen/i, i, val(pax, "Citizenship"));

    // ── Address ────────────────────────────────────────────────────
    await fillText(/street address/i, i, val(pax, "Street Address"));
    await fillText(/^city/i,          i, val(pax, "City"));
    await fillText(/^state/i,         i, val(pax, "State"));
    await fillText(/zip/i,            i, val(pax, "ZIP"));

    // ── Document ───────────────────────────────────────────────────
    await fillText(/document number/i, i * 2, val(pax, "Document Number"));

    // Document Type: try option value "P" first, then visible text "Passport"
    const docTypeRole  = page.getByRole("combobox", { name: /document type/i });
    const docTypeLabel = page.getByLabel(/document type/i);
    const docTypeLoc   = (await docTypeRole.count() > i)  ? docTypeRole.nth(i)
                       : (await docTypeLabel.count() > i) ? docTypeLabel.nth(i)
                       : null;
    if (!docTypeLoc) throw new Error(`Could not locate Document Type combobox at index ${i}`);
    await docTypeLoc.selectOption("P").catch(async () => {
      await docTypeLoc.selectOption("Passport");
    });

    await fillText(/country of issuance/i, i * 2, val(pax, "Country of Issuance"));

    // ── Expiration Date ────────────────────────────────────────────
    await fillText(/^MM$/i,   i * 2 + 1, exp.mm);
    await fillText(/^DD$/i,   i * 2 + 1, exp.dd);
    await fillText(/^YYYY$/i, i * 2 + 1, exp.yyyy);
  }

  // ── Review Manifest (only on the last chunk) ──────────────────────
  if (isLast) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}),
      page.getByRole("button", { name: "Review Manifest" }).click(),
    ]);
    await assertNoPageErrors(page);
  }
}

/**
 * Scan the current page for eAPIS validation errors (lines beginning with "ERROR:").
 * Throws a descriptive Error if any are found so the job reports them to the user.
 */
async function assertNoPageErrors(page) {
  const bodyText = await page.locator("body").innerText().catch(() => "");
  const errors = bodyText
    .split("\n")
    .map(l => l.trim())
    .filter(l => /^ERROR:/i.test(l))
    .map(l => l.replace(/^ERROR:\s*/i, ""));

  if (errors.length > 0) {
    throw new Error("שגיאות בטופס eAPIS:\n" + errors.join("\n"));
  }
}

module.exports = { enterPassengerInfo, assertNoPageErrors };
