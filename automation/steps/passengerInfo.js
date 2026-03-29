"use strict";

/**
 * Step: Fill Passenger Information form (up to 5 passengers per page load).
 *
 * eAPIS wraps each passenger's fields in a container with id="pax1".."pax5".
 * All locators are scoped to that container — no global nth() indexing.
 * Within each container: MM/DD/YYYY nth(0) = DOB, nth(1) = Expiration Date.
 *
 * Speed: all fields for a single passenger are filled simultaneously (Promise.all).
 * Progress: onProgress(absIndex) is called before each passenger fill so the
 *           orchestrator can update the job status per individual passenger.
 *
 * @param {object}   page       - Playwright page
 * @param {Array}    paxRows    - Array of passenger objects (max 5)
 * @param {boolean}  isLast     - true → click "Review Manifest"; false → caller clicks "Add Passengers"
 * @param {Function} onProgress - called with 0-based index within batch before each fill
 */
async function enterPassengerInfo(page, paxRows, isLast, onProgress) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForSelector("#pax1");

  const batch = paxRows.slice(0, 5);

  function splitDate(str) {
    const [mm = "", dd = "", yyyy = ""] = String(str || "").trim().split("/");
    return { mm, dd, yyyy };
  }

  function val(pax, col) {
    return String(pax[col] ?? "").trim();
  }

  for (let i = 0; i < batch.length; i++) {
    if (onProgress) onProgress(i);

    const pax = batch[i];
    const box = page.locator(`#pax${i + 1}`);
    const dob = splitDate(val(pax, "Date of Birth"));
    const exp = splitDate(val(pax, "Expiration Date"));

    // Fill all text fields and the Sex combobox simultaneously
    await Promise.all([
      box.getByRole("textbox", { name: /last name/i }).fill(val(pax, "Last Name")),
      box.getByRole("textbox", { name: /first name/i }).fill(val(pax, "First Name")),
      box.getByRole("combobox", { name: /sex/i }).selectOption(val(pax, "Sex")),
      // Date of Birth
      box.getByRole("textbox", { name: /^MM$/i }).nth(0).fill(dob.mm),
      box.getByRole("textbox", { name: /^DD$/i }).nth(0).fill(dob.dd),
      box.getByRole("textbox", { name: /^YYYY$/i }).nth(0).fill(dob.yyyy),
      // Personal info
      box.getByRole("textbox", { name: /country of residence/i }).fill(val(pax, "Country of Residence")),
      box.getByRole("textbox", { name: /citi?zen/i }).fill(val(pax, "Citizenship")),
      // Address
      box.getByRole("textbox", { name: /street address/i }).fill(val(pax, "Street Address")),
      box.getByRole("textbox", { name: /^city/i }).fill(val(pax, "City")),
      box.getByRole("textbox", { name: /^state/i }).fill(val(pax, "State")),
      box.getByRole("textbox", { name: /zip/i }).fill(val(pax, "ZIP")),
      // Document
      box.getByRole("textbox", { name: /document number/i }).first().fill(val(pax, "Document Number")),
      box.getByRole("textbox", { name: /country of issuance/i }).first().fill(val(pax, "Country of Issuance")),
      // Expiration Date
      box.getByRole("textbox", { name: /^MM$/i }).nth(1).fill(exp.mm),
      box.getByRole("textbox", { name: /^DD$/i }).nth(1).fill(exp.dd),
      box.getByRole("textbox", { name: /^YYYY$/i }).nth(1).fill(exp.yyyy),
    ]);

    // Document Type: try option value "P" first, fall back to visible text "Passport"
    const docType = box.getByRole("combobox", { name: /document type/i }).first();
    await docType.selectOption("P").catch(async () => {
      await docType.selectOption("Passport");
    });
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
