"use strict";

/**
 * Step: Click "Inbound Flight" on the Manifest Options page.
 * This page appears after accepting Terms & Conditions.
 */
async function selectInboundFlight(page) {
  await page.waitForSelector('a[href*="flightInfo.do"]');
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}),
    page.getByRole("link", { name: "Inbound Flight" }).click(),
  ]);
}

module.exports = { selectInboundFlight };
