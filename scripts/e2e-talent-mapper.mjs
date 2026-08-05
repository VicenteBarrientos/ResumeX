/**
 * End-to-end smoke for Talent Mapper demo flow.
 *
 * Prerequisites: `npm run dev` and `npx playwright install chromium` once.
 *
 *   set TALENT_MAPPER_E2E_USER=tm_e2e_demo
 *   set TALENT_MAPPER_E2E_PASS=DemoE2ePass123!
 *   npm run test:e2e:talent-mapper
 */
import { chromium } from "playwright";

const BASE = process.env.TALENT_MAPPER_E2E_BASE || "http://localhost:3000";
const USER = process.env.TALENT_MAPPER_E2E_USER || "tm_e2e_demo";
const PASS = process.env.TALENT_MAPPER_E2E_PASS || "DemoE2ePass123!";

async function ensureUser() {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: USER, password: PASS }),
  });
  if (res.status === 201 || res.status === 409) return;
  throw new Error(`register failed ${res.status}: ${await res.text()}`);
}

async function main() {
  const consoleErrors = [];
  const failedRequests = [];

  await ensureUser();
  console.log(`[e2e] user=${USER} base=${BASE}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));
  page.on("response", (res) => {
    if (res.status() >= 400 && res.url().includes("/api/talent-mapper")) {
      failedRequests.push(`${res.status()} ${res.request().method()} ${res.url()}`);
    }
  });

  await page.goto(`${BASE}/login`);
  await page.evaluate(() => localStorage.removeItem("resumex-talent-mapper-v1"));

  await page.locator("#username, input[name='username'], input[autocomplete='username']").first().fill(USER);
  await page.locator("input[type='password']").first().fill(PASS);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 25000 });

  await page.goto(`${BASE}/talent/mapper`);
  await page.getByRole("heading", { name: /talent mapper/i }).waitFor({ timeout: 15000 });

  await page.getByRole("button", { name: /load scientific sourcing demo/i }).click();
  await page.getByText(/required techniques/i).waitFor({ timeout: 15000 });
  await page.getByText(/demo criteria loaded/i).waitFor({ timeout: 5000 });

  await page.getByRole("button", { name: /continue to search strategy/i }).click();
  await page.getByRole("button", { name: /run demo snapshot/i }).waitFor({ timeout: 10000 });

  await page.getByRole("button", { name: /run demo snapshot/i }).click();
  await page.getByText(/potential researchers/i).waitFor({ timeout: 60000 });
  await page.getByText(/affiliation is not confirmed|research relevance|demo snapshot/i).first().waitFor();

  await page.getByRole("button", { name: /view evidence/i }).first().click();
  await page.getByRole("dialog").waitFor({ timeout: 10000 });
  await page.getByText(/publication affiliation is not confirmed/i).waitFor();

  await page.getByRole("button", { name: /add to shortlist/i }).click();
  await page.getByRole("button", { name: /remove from shortlist/i }).waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 5000 });

  const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
  await page.getByRole("button", { name: /export shortlist csv/i }).click();
  const download = await downloadPromise;
  const filename = download.suggestedFilename();

  const criticalConsole = consoleErrors.filter(
    (e) => !/Download the React DevTools|favicon|hydration|DevTools/i.test(e),
  );

  const summary = {
    ok: failedRequests.length === 0 && criticalConsole.length === 0 && Boolean(filename),
    user: USER,
    download: filename,
    failedRequests,
    consoleErrors: criticalConsole.slice(0, 12),
  };
  console.log(JSON.stringify(summary, null, 2));

  await browser.close();
  if (!summary.ok) process.exit(1);
}

main().catch((err) => {
  console.error("[e2e] FAILED", err);
  process.exit(1);
});
