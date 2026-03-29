"use strict";

const { chromium }              = require("playwright");
const config                    = require("../config");
const db                        = require("../db/database");
const { setStatus, getJob }     = require("../jobs/jobStore");
const { storeContinuation }     = require("../jobs/continuationStore");
const { login }                 = require("./steps/login");
const { acceptTerms }           = require("./steps/termsAndConditions");
const { selectInboundFlight }   = require("./steps/manifestOptions");
const { enterFlightInfo }       = require("./steps/flightInfo");
const { submitCrewInfo }        = require("./steps/crewInfo");
const { enterPassengerInfo, assertNoPageErrors } = require("./steps/passengerInfo");

/**
 * Run the automation flow in the background.
 * Flow: Login → Accept T&C → Select Inbound Flight → Fill Flight Info → Next
 *
 * @param {string}   jobId
 * @param {object}   rows  - { flight: {}, pax: [] }
 */
async function runAutomation(jobId, rows) {
  let browser;
  const { uploadId } = getJob(jobId) || {};
  try {
    setStatus(jobId, "running", "מאתחל דפדפן...");
    browser = await chromium.launch({
      headless: config.HEADLESS,
      args: [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
      ],
    });
    const page = await browser.newPage();
    page.setDefaultTimeout(15_000); // 15s per step — fail fast if stuck

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

    // Determine which passengers to submit in this batch
    const paxOffset  = rows._paxOffset !== undefined ? rows._paxOffset : 0;
    const paxBatch   = (rows.pax || []).slice(paxOffset, paxOffset + batchPax);

    await enterFlightInfo(page, rows.flight, batchPax);

    // ── Step 5: Skip Crew Information ──────────────────────────
    setStatus(jobId, "running", "מדלג על פרטי צוות...");
    await submitCrewInfo(page);

    // ── Step 6: Fill Passenger Information (5 per page) ────────
    let submitted = 0;
    while (submitted < paxBatch.length) {
      const chunk  = paxBatch.slice(submitted, submitted + 5);
      const isLast = submitted + chunk.length >= paxBatch.length;
      setStatus(jobId, "running", `ממלא נוסעים ${submitted + 1}–${submitted + chunk.length} מתוך ${batchPax}...`);

      if (!isLast) {
        await enterPassengerInfo(page, chunk, false);
        submitted += chunk.length;
        await Promise.all([
          page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}),
          page.getByRole("button", { name: "Add Passengers" }).click(),
        ]);
        await assertNoPageErrors(page);
      } else {
        await enterPassengerInfo(page, chunk, true);
        submitted += chunk.length;
      }
    }

    // ── Done ───────────────────────────────────────────────────
    if (remaining > 0) {
      const contToken = storeContinuation(rows, remaining, paxOffset + batchPax, uploadId);
      if (uploadId) db.updateStatus(uploadId, "partial");
      setStatus(jobId, "done",
        `הוזנו ${batchPax} מתוך ${totalPax} נוסעים — נותרו ${remaining}`,
        { remainingPax: remaining, contToken });
    } else {
      if (uploadId) db.updateStatus(uploadId, "done");
      setStatus(jobId, "done", "פרטי הנוסעים הוזנו בהצלחה — ניתן לבצע Submit באתר eAPIS");
    }

  } catch (err) {
    if (uploadId) db.updateStatus(uploadId, "error");
    setStatus(jobId, "error", `שגיאה: ${err.message}`);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

module.exports = { runAutomation };
