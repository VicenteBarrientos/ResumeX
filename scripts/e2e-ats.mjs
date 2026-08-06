/**
 * ATS integrations smoke (Playwright).
 * Requires: npm run dev, signed-in session is NOT automated — hits public landing + login gate.
 *
 *   npm run test:ats:e2e
 */
import { chromium } from "playwright";

const BASE = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(`${BASE}/talent/integrations`);
  // Unauthenticated users should be redirected to login (proxy protects /talent/*).
  await page.waitForURL(/\/(login|talent\/integrations)/, { timeout: 15_000 });

  if (page.url().includes("/login")) {
    console.log("OK: /talent/integrations requires login");
  } else {
    // Already signed in — check page chrome.
    const title = await page.getByRole("heading", { name: "ATS Integrations" }).count();
    if (title < 1) throw new Error("ATS Integrations heading missing");
    console.log("OK: ATS Integrations page rendered while signed in");
  }

  await page.goto(`${BASE}/talent`);
  await page.waitForLoadState("domcontentloaded");

  if (errors.length) {
    console.error("Console/page errors:", errors);
    process.exit(1);
  }

  console.log("ATS e2e smoke passed");
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
