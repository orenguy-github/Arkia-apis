"use strict";

/**
 * Step: Fill Passenger Information form (up to 5 passengers per page load).
 *
 * eAPIS wraps each passenger's fields in a container with id="pax1".."pax5".
 * All locators are scoped to that container, so there is no global nth() indexing —
 * each container has exactly one instance of every field.
 *
 * Within each pax container there are two date pairs (DOB and Expiration),
 * so MM/DD/YYYY still use nth(0) for DOB and nth(1) for Expiration.
 *
 * After "Add Passengers" the page reloads with fresh pax1..pax5 containers,
 * so passenger 6 goes into pax1, passenger 7 into pax2, etc.
 *
 * @param {object}  page    - Playwright page
 * @param {Array}   paxRows - Array of passenger objects (max 5)
 * @param {boolean} isLast  - true → click "Review Manifest"; false → caller clicks "Add Passengers"
 */
async function enterPassengerInfo(page, paxRows, isLast) {
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
    const pax = batch[i];
    const box = page.locator(`#pax${i + 1}`); // scope all fills to this passenger's div

    const dob = splitDate(val(pax, "Date of Birth"));
    const exp = splitDate(val(pax, "Expiration Date"));

    // ── Name ───────────────────────────────────────────────────────
    await box.getByRole("textbox", { name: /last name/i }).fill(val(pax, "Last Name"));
    await box.getByRole("textbox", { name: /first name/i }).fill(val(pax, "First Name"));

    // ── Sex combobox ───────────────────────────────────────────────
    await box.getByRole("combobox", { name: /sex/i }).selectOption(val(pax, "Sex"));

    // ── Date of Birth (nth 0 within this container) ────────────────
    await box.getByRole("textbox", { name: /^MM$/i }).nth(0).fill(dob.mm);
    await box.getByRole("textbox", { name: /^DD$/i }).nth(0).fill(dob.dd);
    await box.getByRole("textbox", { name: /^YYYY$/i }).nth(0).fill(dob.yyyy);

    // ── Country of Residence ───────────────────────────────────────
    await box.getByRole("textbox", { name: /country of residence/i })
      .fill(val(pax, "Country of Residence"));

    // ── Citizenship (eAPIS may say "Country of Citizenship") ───────
    await box.getByRole("textbox", { name: /citi?zen/i })
      .fill(val(pax, "Citizenship"));

    // ── Address ────────────────────────────────────────────────────
    await box.getByRole("textbox", { name: /street address/i }).fill(val(pax, "Street Address"));
    await box.getByRole("textbox", { name: /^city/i }).fill(val(pax, "City"));
    await box.getByRole("textbox", { name: /^state/i }).fill(val(pax, "State"));
    await box.getByRole("textbox", { name: /zip/i }).fill(val(pax, "ZIP"));

    // ── Document ───────────────────────────────────────────────────
    await box.getByRole("textbox", { name: /document number/i }).fill(val(pax, "Document Number"));

    // Document Type: try option value "P" first, fall back to text "Passport"
    const docType = box.getByRole("combobox", { name: /document type/i });
    await docType.selectOption("P").catch(async () => {
      await docType.selectOption("Passport");
    });

    await box.getByRole("textbox", { name: /country of issuance/i })
      .fill(val(pax, "Country of Issuance"));

    // ── Expiration Date (nth 1 within this container) ──────────────
    await box.getByRole("textbox", { name: /^MM$/i }).nth(1).fill(exp.mm);
    await box.getByRole("textbox", { name: /^DD$/i }).nth(1).fill(exp.dd);
    await box.getByRole("textbox", { name: /^YYYY$/i }).nth(1).fill(exp.yyyy);
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
