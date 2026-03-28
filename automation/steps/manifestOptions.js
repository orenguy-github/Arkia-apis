"use strict";

/**
 * Step: Navigate from post-T&C page to the Inbound Flight form.
 *
 * Two possible pages after T&C:
 *   1. Manifest Options  → normal flow, click "Inbound Flight"
 *   2. Saved Manifest    → open form exists; throw so the job reports an error
 */
async function selectInboundFlight(page) {
  // Wait for whichever page loads first
  await page.waitForLoadState("domcontentloaded");

  const hasSavedManifest = await page
    .locator("text=You currently have a Saved Manifest")
    .isVisible()
    .catch(() => false);

  if (hasSavedManifest) {
    throw new Error(
      "התהליך הופסק — קיים טופס פתוח במערכת eAPIS. " +
      "יש להיכנס לאתר ולסיים או לבטל את הטופס לפני שניתן להמשיך."
    );
  }

  await page.waitForSelector('a[href*="flightInfo.do"]');
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}),
    page.getByRole("link", { name: "Inbound Flight" }).click(),
  ]);
}

module.exports = { selectInboundFlight };
