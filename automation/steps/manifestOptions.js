"use strict";

/**
 * Step: Navigate from post-T&C page to the Inbound Flight form.
 *
 * Two possible pages after T&C:
 *   1. Manifest Options  → normal flow, click "Inbound Flight"
 *   2. Saved Manifest    → open form exists; throw so the job reports an error
 */
async function selectInboundFlight(page) {
  const inboundLink     = page.getByRole("link", { name: "Inbound Flight" });
  const savedManifest   = page.locator("h1, h2, strong").filter({ hasText: /saved manifest/i }).first();

  // Wait for whichever element appears first (30s total timeout)
  await Promise.race([
    inboundLink.waitFor({ state: "visible" }),
    savedManifest.waitFor({ state: "visible" }),
  ]);

  if (await savedManifest.isVisible()) {
    throw new Error(
      "התהליך הופסק — קיים טופס פתוח במערכת eAPIS. " +
      "יש להיכנס לאתר ולסיים או לבטל את הטופס לפני שניתן להמשיך."
    );
  }

  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}),
    inboundLink.click(),
  ]);
}

module.exports = { selectInboundFlight };
