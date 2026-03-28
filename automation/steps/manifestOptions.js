"use strict";

/**
 * Step: Navigate from post-T&C page to the Inbound Flight form.
 *
 * Two possible pages after T&C:
 *   1. Manifest Options  → normal flow, click "Inbound Flight"
 *   2. Saved Manifest    → open form exists; throw so the job reports an error
 */
async function selectInboundFlight(page) {
  // Wait for page to settle after T&C submission
  await page.waitForLoadState("domcontentloaded");

  // Check page body text for saved manifest indication
  const bodyText = await page.locator("body").innerText().catch(() => "");
  if (/saved manifest/i.test(bodyText)) {
    throw new Error(
      "התהליך הופסק — קיים טופס פתוח במערכת eAPIS. " +
      "יש להיכנס לאתר ולסיים או לבטל את הטופס לפני שניתן להמשיך."
    );
  }

  // Normal flow: click Inbound Flight
  await page.waitForSelector('a[href*="flightInfo.do"]');
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}),
    page.getByRole("link", { name: "Inbound Flight" }).click(),
  ]);
}

module.exports = { selectInboundFlight };
