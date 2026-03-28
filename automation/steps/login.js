"use strict";

/**
 * Step: Log in to the eAPIS portal.
 * URL: https://eapis.cbp.dhs.gov/eapis/auth
 *
 * Selectors discovered via Playwright inspection:
 *   - Sender ID:  textbox[name="Sender ID:"]
 *   - Password:   textbox[name="Password"]
 *   - Login btn:  button[name="Log In"]
 */
async function login(page, config) {
  await page.goto(config.AUTOMATION_URL, { waitUntil: "domcontentloaded" });

  // Fill credentials
  await page.getByRole("textbox", { name: "Sender ID:" }).fill(config.AUTOMATION_USER);
  await page.getByRole("textbox", { name: "Password" }).fill(config.AUTOMATION_PASS);

  // Submit and wait for navigation to Terms & Conditions page
  await Promise.all([
    page.waitForURL(/ecomm\/entry/),
    page.getByRole("button", { name: "Log In" }).click(),
  ]);
}

module.exports = { login };
