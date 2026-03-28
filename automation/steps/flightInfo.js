"use strict";

/**
 * Step: Fill in the US Flight Information form and click Next.
 *
 * Field layout (from live snapshot):
 *   Carrier Code         → textbox /carrier code/i
 *   Flight Number        → textbox /flight number/i
 *   Departure Airport    → textbox /departure airport/i
 *   Departure Date       → MM[0] / DD[0] / YYYY[0]
 *   Departure Time       → HH[0]  MM[1]
 *   Destination Airport  → textbox /destination airport/i
 *   Destination Date     → MM[2] / DD[1] / YYYY[1]
 *   Destination Time     → HH[1]  MM[3]
 *   Crew                 → textbox /crew/i
 *   Passengers           → textbox /^passengers/i
 *   In-transit Passengers→ textbox /in-transit/i
 */
async function enterFlightInfo(page, flight, paxCount) {
  await page.waitForSelector('input[type="text"]');

  function splitDate(str) {
    const [mm = "", dd = "", yyyy = ""] = String(str || "").trim().split("/");
    return { mm, dd, yyyy };
  }

  function splitTime(str) {
    const [hh = "", mm = ""] = String(str || "").trim().split(":");
    return { hh, mm: mm.padStart(2, "0") };
  }

  const dep  = splitDate(flight["Departure Date"]);
  const depT = splitTime(flight["Departure Time"]);
  const dest = splitDate(flight["Destination Date"]);
  const desT = splitTime(flight["Destination Time"]);

  // ── Flight Information ──────────────────────────────────────────────
  await page.getByRole("textbox", { name: /carrier code/i })
    .fill(String(flight["Carrier Code"] || ""));

  await page.getByRole("textbox", { name: /flight number/i })
    .fill(String(flight["Flight Number"] || ""));

  // ── Departure ───────────────────────────────────────────────────────
  await page.getByRole("textbox", { name: /departure airport/i })
    .fill(String(flight["Departure Airport"] || ""));

  await page.getByRole("textbox", { name: "MM" }).nth(0).fill(dep.mm);
  await page.getByRole("textbox", { name: "DD" }).nth(0).fill(dep.dd);
  await page.getByRole("textbox", { name: "YYYY" }).nth(0).fill(dep.yyyy);

  await page.getByRole("textbox", { name: "HH" }).nth(0).fill(depT.hh);
  await page.getByRole("textbox", { name: "MM" }).nth(1).fill(depT.mm);

  // ── Destination ─────────────────────────────────────────────────────
  await page.getByRole("textbox", { name: /destination airport/i })
    .fill(String(flight["Destination Airport"] || ""));

  await page.getByRole("textbox", { name: "MM" }).nth(2).fill(dest.mm);
  await page.getByRole("textbox", { name: "DD" }).nth(1).fill(dest.dd);
  await page.getByRole("textbox", { name: "YYYY" }).nth(1).fill(dest.yyyy);

  await page.getByRole("textbox", { name: "HH" }).nth(1).fill(desT.hh);
  await page.getByRole("textbox", { name: "MM" }).nth(3).fill(desT.mm);

  // ── Traveler Counts ─────────────────────────────────────────────────
  await page.getByRole("textbox", { name: /crew/i })
    .fill(String(flight["Crew"] || "0"));

  await page.getByRole("textbox", { name: /^passengers/i })
    .fill(String(paxCount));

  await page.getByRole("textbox", { name: /in-transit/i })
    .fill(String(flight["In-transit Passengers"] || "0"));

  // ── Next ────────────────────────────────────────────────────────────
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}),
    page.getByRole("button", { name: "Submit" }).click(),
  ]);
}

module.exports = { enterFlightInfo };
