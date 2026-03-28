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

  // Click Next/Submit and wait for navigation
  // The button may appear as "Next" (text) or "Submit" (value attr)
  const submitBtn = page
    .getByRole("button", { name: /^(next|submit)$/i })
    .or(page.locator('input[type="submit"]'))
    .first();

  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}),
    submitBtn.click(),
  ]);
}

module.exports = { acceptTerms };
