// Job detectors per site
const DETECTORS = [
  {
    match: () => location.hostname.includes("lever.co"),
    extract: () => {
      const title = document.querySelector(".posting-headline h2")?.textContent?.trim()
        ?? document.querySelector("h2")?.textContent?.trim();
      const company = document.querySelector(".main-header-text .company-name")?.textContent?.trim()
        ?? document.title.split(" at ").pop()?.trim();
      const location = document.querySelector(".posting-categories .location")?.textContent?.trim();
      const description = document.querySelector(".posting-requirements, .section-wrapper")?.textContent?.trim();
      return { title, company, location, description, url: location.href };
    },
  },
  {
    match: () => location.hostname.includes("greenhouse.io"),
    extract: () => {
      const title = document.querySelector("h1.app-title, h1")?.textContent?.trim();
      const company = document.querySelector(".company-name, #header .company")?.textContent?.trim()
        ?? document.title.split(" at ").pop()?.trim();
      const location = document.querySelector(".location")?.textContent?.trim();
      const description = document.querySelector("#content")?.textContent?.trim();
      return { title, company, location, description, url: window.location.href };
    },
  },
  {
    match: () => location.hostname.includes("linkedin.com"),
    extract: () => {
      const title = document.querySelector(".job-details-jobs-unified-top-card__job-title, h1")?.textContent?.trim();
      const company = document.querySelector(".job-details-jobs-unified-top-card__company-name, .topcard__org-name-link")?.textContent?.trim();
      const location = document.querySelector(".job-details-jobs-unified-top-card__bullet")?.textContent?.trim();
      const description = document.querySelector(".jobs-description__content, .description__text")?.textContent?.trim();
      return { title, company, location, description, url: window.location.href };
    },
  },
  {
    match: () => location.hostname.includes("indeed.com"),
    extract: () => {
      const title = document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"], h1')?.textContent?.trim();
      const company = document.querySelector('[data-testid="inlineHeader-companyName"], .jobsearch-InlineCompanyRating')?.textContent?.trim();
      const location = document.querySelector('[data-testid="job-location"]')?.textContent?.trim();
      const description = document.querySelector("#jobDescriptionText")?.textContent?.trim();
      return { title, company, location, description, url: window.location.href };
    },
  },
  {
    // Generic fallback
    match: () => true,
    extract: () => {
      const title = document.querySelector("h1")?.textContent?.trim();
      const company = document.querySelector('[class*="company"], [class*="employer"], [class*="org"]')?.textContent?.trim();
      const description = document.querySelector('[class*="description"], [class*="job-detail"], main')?.textContent?.trim();
      return { title, company, description, url: window.location.href };
    },
  },
];

function getJobInfo() {
  const detector = DETECTORS.find((d) => d.match());
  if (!detector) return null;
  const job = detector.extract();
  if (!job?.title) return null;
  return {
    title: job.title,
    company: job.company ?? "Unknown Company",
    location: job.location ?? "",
    description: (job.description ?? "").slice(0, 3000),
    url: job.url ?? window.location.href,
  };
}

// Listen for popup asking for job info
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "GET_JOB") {
    sendResponse(getJobInfo());
  }
  return true;
});

// Watch for Apply button clicks and auto-save (respects autoSave toggle)
function watchForApply() {
  document.addEventListener("click", async (e) => {
    const el = e.target.closest("button, a");
    if (!el) return;
    const text = el.textContent?.toLowerCase() ?? "";
    if (!/apply|submit application/.test(text)) return;

    const { rxToken, autoSave } = await chrome.storage.local.get({ rxToken: null, autoSave: true });
    if (!rxToken || !autoSave) return;

    const job = getJobInfo();
    if (!job) return;

    fetch("https://resumex.talentxrecruiting.com/api/tracker", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${rxToken}` },
      body: JSON.stringify({ company: job.company, role: job.title, jobUrl: job.url, status: "Applied" }),
    }).catch(() => {});
  }, true);
}

watchForApply();
