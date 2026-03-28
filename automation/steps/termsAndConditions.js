"use strict";

/**
 * Step: Accept Terms and Conditions on the eAPIS portal.
 *
 * After login, the site shows a T&C page with:
 *   - radio "I agree"    (ref: e26)
 *   - radio "I disagree" (checked by default)
 *   - button "Next"      (ref: e31, value "Submit")
 */
async function acceptTerms(page) {
  // Wait for the T&C page to be fully loaded
  await page.waitForSelector('input[type="radio"]');

  // Select "I agree"
  await page.getByRole("radio", { name: "I agree" }).click();

  // Click Next and wait for navigation
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}),
    page.getByRole("button", { name: "Next" }).click(),
  ]);
}

module.exports = { acceptTerms };
