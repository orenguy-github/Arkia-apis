"use strict";

const { chromium }  = require("playwright");
const config        = require("../config");
const { setStatus } = require("../jobs/jobStore");
const { login }     = require("./steps/login");
const { enterData } = require("./steps/dataEntry");

/**
 * Run the full automation flow in the background.
 * Called without await so the HTTP response is returned immediately.
 *
 * @param {string}   jobId - Job ID from jobStore
 * @param {object[]} rows  - Parsed Excel rows
 */
async function runAutomation(jobId, rows) {
  let browser;
  try {
    setStatus(jobId, "running", "מאתחל דפדפן...");
    browser = await chromium.launch({ headless: config.HEADLESS });
    const page = await browser.newPage();

    setStatus(jobId, "running", "מתחבר לאתר...");
    await login(page, config);

    setStatus(jobId, "running", `מתחיל הזנת נתונים (0 מתוך ${rows.length})...`);
    await enterData(page, rows, (current) => {
      setStatus(jobId, "running", `מעבד שורה ${current} מתוך ${rows.length}...`);
    });

    setStatus(jobId, "done", "הושלם בהצלחה!");
  } catch (err) {
    setStatus(jobId, "error", `שגיאה: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { runAutomation };
