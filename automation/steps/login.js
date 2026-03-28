"use strict";

/**
 * Step: Log in to the external website.
 *
 * TODO: Once the target site URL and login form are known:
 *   1. Set AUTOMATION_URL in .env
 *   2. Replace selector placeholders below with real CSS selectors
 *   3. Remove the throw at the bottom
 *   4. Add any 2FA / CAPTCHA handling if needed
 */
async function login(page, config) {
  await page.goto(config.AUTOMATION_URL);

  // await page.fill("#username",  config.AUTOMATION_USER);
  // await page.fill("#password",  config.AUTOMATION_PASS);
  // await page.click("#login-btn");
  // await page.waitForNavigation({ waitUntil: "networkidle" });

  throw new Error("שלב ההתחברות טרם הוגדר — יש להגדיר סלקטורים ב-automation/steps/login.js");
}

module.exports = { login };
