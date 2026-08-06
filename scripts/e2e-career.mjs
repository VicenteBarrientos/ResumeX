/**
 * End-to-end smoke for ResumeX Career demo flow.
 *
 * Prerequisites: `npm run dev` and `npx playwright install chromium` once.
 *
 *   set CAREER_E2E_USER=career_e2e_demo
 *   set CAREER_E2E_PASS=DemoE2ePass123!
 *   npm run test:e2e:career
 */
import { chromium } from "playwright";

const BASE = process.env.CAREER_E2E_BASE || "http://localhost:3000";
const USER = process.env.CAREER_E2E_USER || "career_e2e_demo";
const PASS = process.env.CAREER_E2E_PASS || "DemoE2ePass123!";

const COMPANY = `E2E Acme ${Date.now()}`;
const ROLE = "Senior Full-Stack Engineer";

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
    const url = res.url();
    if (
      res.status() >= 400 &&
      (url.includes("/api/analyze") ||
        url.includes("/api/tracker") ||
        url.includes("/api/cover-letter") ||
        url.includes("/api/auth"))
    ) {
      failedRequests.push(`${res.status()} ${res.request().method()} ${url}`);
    }
  });

  await page.goto(`${BASE}/login?callbackUrl=${encodeURIComponent("/career/analyzer")}`);
  await page.locator("#username, input[name='username'], input[autocomplete='username']").first().fill(USER);
  await page.locator("input[type='password']").first().fill(PASS);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 25000 });

  // --- Analyzer (deterministic demo) ---
  await page.goto(`${BASE}/career/analyzer`);
  await page.getByRole("button", { name: /try demo|probar demo/i }).waitFor({ timeout: 15000 });
  await page.getByRole("button", { name: /try demo|probar demo/i }).click();
  await page.getByRole("button", { name: /analyze match|analizar match/i }).click();
  await page.getByText(/must-have criteria|criterios imprescindibles/i).waitFor({ timeout: 30000 });
  await page.getByText(/^86$/).first().waitFor({ timeout: 10000 });
  await page.getByRole("link", { name: /save to tracker/i }).waitFor();

  // --- Tracker: create application ---
  await page.goto(`${BASE}/career/tracker/add`);
  await page.getByRole("heading", { name: /add application/i }).waitFor({ timeout: 15000 });
  await page.locator("form input[type='text']").nth(0).fill(COMPANY);
  await page.locator("form input[type='text']").nth(1).fill(ROLE);
  await page.getByRole("button", { name: /save application/i }).click();
  await page.waitForURL(/\/career\/tracker\/?$/, { timeout: 20000 });
  await page.getByText(COMPANY).waitFor({ timeout: 15000 });
  await page.getByText(ROLE).first().waitFor();

  // --- Cover letter (deterministic demo JD) ---
  await page.goto(`${BASE}/career/cover-letter`);
  await page.getByRole("heading", { name: /cover letter/i }).waitFor({ timeout: 15000 });
  await page.getByRole("button", { name: /try demo/i }).click();
  await page.getByRole("button", { name: /generate cover letter/i }).click();
  await page.waitForFunction(
    () => {
      const areas = Array.from(document.querySelectorAll("textarea"));
      return areas.some((el) => /Dear Hiring Team/i.test(el.value));
    },
    { timeout: 20000 },
  );

  const criticalConsole = consoleErrors.filter(
    (e) => !/Download the React DevTools|favicon|hydration|DevTools/i.test(e),
  );

  const summary = {
    ok: failedRequests.length === 0 && criticalConsole.length === 0,
    user: USER,
    company: COMPANY,
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
