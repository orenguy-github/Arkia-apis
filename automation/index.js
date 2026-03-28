"use strict";

const { chromium }              = require("playwright");
const config                    = require("../config");
const { setStatus }             = require("../jobs/jobStore");
const { storeContinuation }     = require("../jobs/continuationStore");
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
const AUTOMATION_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

async function runAutomation(jobId, rows) {
  let browser;
  const timeout = setTimeout(() => {
    setStatus(jobId, "error", "התהליך נותק — חרגת מהזמן המקסימלי (2 דקות)");
    if (browser) browser.close().catch(() => {});
  }, AUTOMATION_TIMEOUT_MS);

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
    const totalPax   = rows._paxOverride !== undefined
      ? rows._paxOverride
      : Number(rows.flight["Passengers"] || 0);
    const batchPax   = Math.min(totalPax, 50);
    const remaining  = totalPax - batchPax;
    await enterFlightInfo(page, rows.flight, batchPax);

    // ── Done ───────────────────────────────────────────────────
    if (remaining > 0) {
      const contToken = storeContinuation(rows, remaining);
      setStatus(jobId, "done",
        `הוזנו ${batchPax} מתוך ${totalPax} נוסעים — נותרו ${remaining}`,
        { remainingPax: remaining, contToken });
    } else {
      setStatus(jobId, "done", "פרטי הטיסה הוזנו בהצלחה");
    }

  } catch (err) {
    setStatus(jobId, "error", `שגיאה: ${err.message}`);
  } finally {
    clearTimeout(timeout);
    if (browser) await browser.close().catch(() => {});
  }
}

module.exports = { runAutomation };
