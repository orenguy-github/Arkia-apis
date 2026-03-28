"use strict";

const { chromium }              = require("playwright");
const config                    = require("../config");
const { setStatus }             = require("../jobs/jobStore");
const { login }                 = require("./steps/login");
const { acceptTerms }           = require("./steps/termsAndConditions");
const { selectInboundFlight }   = require("./steps/manifestOptions");
const { enterFlightInfo }       = require("./steps/flightInfo");

/**
 * Run the automation flow in the background.
 * Flow: Login → Accept T&C → Select Inbound Flight → Fill Flight Info → Next
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

    // ── Step 3: Select Inbound Flight ──────────────────────────
    setStatus(jobId, "running", "בוחר טיסה נכנסת...");
    await selectInboundFlight(page);

    // ── Step 4: Fill Flight Information ────────────────────────
    setStatus(jobId, "running", "ממלא פרטי טיסה...");
    await enterFlightInfo(page, rows.flight);

    // ── Done ───────────────────────────────────────────────────
    setStatus(jobId, "done", "פרטי הטיסה הוזנו בהצלחה — ממתין להמשך");

  } catch (err) {
    setStatus(jobId, "error", `שגיאה: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { runAutomation };
