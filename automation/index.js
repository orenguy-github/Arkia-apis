"use strict";

const { chromium }       = require("playwright");
const config             = require("../config");
const { setStatus }      = require("../jobs/jobStore");
const { login }          = require("./steps/login");
const { acceptTerms }    = require("./steps/termsAndConditions");

/**
 * Run the automation flow in the background.
 * Current flow: Login → Accept T&C → Done
 * (Data entry steps will be added in the next phase)
 *
 * @param {string}   jobId
 * @param {object}   rows  - { flight: {}, pax: [] }
 */
async function runAutomation(jobId, rows) {
  let browser;
  try {
    setStatus(jobId, "running", "מאתחל דפדפן...");
    browser = await chromium.launch({ headless: config.HEADLESS });
    const page = await browser.newPage();

    // ── Step 1: Login ──────────────────────────────────────────
    setStatus(jobId, "running", "מתחבר לאתר eAPIS...");
    await login(page, config);

    // ── Step 2: Accept Terms & Conditions ──────────────────────
    setStatus(jobId, "running", "מאשר תנאי שימוש...");
    await acceptTerms(page);

    // ── Done ───────────────────────────────────────────────────
    setStatus(jobId, "done", "התחברות הושלמה בהצלחה — ממתין להמשך פיתוח");

  } catch (err) {
    setStatus(jobId, "error", `שגיאה: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { runAutomation };
