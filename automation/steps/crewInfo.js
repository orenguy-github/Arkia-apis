"use strict";

/**
 * Step: Crew Information page — no data entry needed, just click Next.
 *
 * eAPIS URL after flight info submit: submitFlightInfo.do
 * Next link navigates to: submitCrewInfo.do
 */
async function submitCrewInfo(page) {
  await page.waitForLoadState("domcontentloaded");

  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}),
    page.getByRole("link", { name: "Next" }).click(),
  ]);
}

module.exports = { submitCrewInfo };
