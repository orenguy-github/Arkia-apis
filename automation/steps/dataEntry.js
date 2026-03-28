"use strict";

/**
 * Step: Enter data rows into the external website's form.
 *
 * TODO: Once the target form is known:
 *   1. Map each Excel column to the form field selector
 *   2. Handle dropdowns, date pickers, file uploads as needed
 *   3. Add wait conditions between submissions
 *
 * @param {object[]} rows       - Array of row objects (keys = Excel column names)
 * @param {Function} onProgress - Called with (currentRowNumber) after each row
 */
async function enterData(page, rows, onProgress) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // TODO: fill and submit form for each row
    // Example:
    // await page.fill("#field-name",    row["שם נוסע"]     ?? "");
    // await page.fill("#field-date",    row["תאריך טיסה"]  ?? "");
    // await page.click("#submit-btn");
    // await page.waitForSelector(".confirmation-message");

    onProgress(i + 1);
  }
}

module.exports = { enterData };
