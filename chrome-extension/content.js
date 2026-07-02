const API = "https://resumex.talentxrecruiting.com";

// Job detectors per site
const DETECTORS = [
  {
    match: () => location.hostname.includes("lever.co"),
    extract: () => {
      const title = document.querySelector(".posting-headline h2")?.textContent?.trim()
        ?? document.querySelector("h2")?.textContent?.trim();
      const company = document.querySelector(".main-header-text .company-name")?.textContent?.trim()
        ?? document.title.split(" at ").pop()?.trim();
      const loc = document.querySelector(".posting-categories .location")?.textContent?.trim();
      const description = document.querySelector(".posting-requirements, .section-wrapper")?.textContent?.trim();
      return { title, company, location: loc, description, url: window.location.href };
    },
  },
  {
    match: () => location.hostname.includes("greenhouse.io"),
    extract: () => {
      const title = document.querySelector("h1.app-title, h1")?.textContent?.trim();
      const company = document.querySelector(".company-name, #header .company")?.textContent?.trim()
        ?? document.title.split(" at ").pop()?.trim();
      const loc = document.querySelector(".location")?.textContent?.trim();
      const description = document.querySelector("#content")?.textContent?.trim();
      return { title, company, location: loc, description, url: window.location.href };
    },
  },
  {
    match: () => location.hostname.includes("linkedin.com"),
    extract: () => {
      const title = document.querySelector(".job-details-jobs-unified-top-card__job-title, h1")?.textContent?.trim();
      const company = document.querySelector(".job-details-jobs-unified-top-card__company-name, .topcard__org-name-link")?.textContent?.trim();
      const loc = document.querySelector(".job-details-jobs-unified-top-card__bullet")?.textContent?.trim();
      const description = document.querySelector(".jobs-description__content, .description__text")?.textContent?.trim();
      return { title, company, location: loc, description, url: window.location.href };
    },
  },
  {
    match: () => location.hostname.includes("indeed.com"),
    extract: () => {
      const title = document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"], h1')?.textContent?.trim();
      const company = document.querySelector('[data-testid="inlineHeader-companyName"], .jobsearch-InlineCompanyRating')?.textContent?.trim();
      const loc = document.querySelector('[data-testid="job-location"]')?.textContent?.trim();
      const description = document.querySelector("#jobDescriptionText")?.textContent?.trim();
      return { title, company, location: loc, description, url: window.location.href };
    },
  },
  {
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

// ── Auto-Apply: fill form fields with profile data ──────────────────────────

// Maps field patterns to profile keys — ordered: specific before generic
const FIELD_MAP = [
  { key: "firstName",   patterns: [/^first\s*name$|^given\s*name$|^fname$/i] },
  { key: "lastName",    patterns: [/^last\s*name$|^family\s*name$|^surname$|^lname$/i] },
  { key: "fullName",    patterns: [/^name$|^full\s*name$|^your\s*name$|^applicant\s*name$|^candidate\s*name$/i] },
  { key: "email",       patterns: [/^email(s)?$|^e.?mail/i], type: "email" },
  { key: "phone",       patterns: [/^phone$|^mobile$|^cell$|^telephone$|^phone\s*number$/i], type: "tel" },
  { key: "location",    patterns: [/^city$|^location$|^address$|^current\s*location$|^where\s*are\s*you/i] },
  { key: "linkedinUrl", patterns: [/linkedin/i] },
];

// Clean a hint string — strip required markers, extra whitespace
function cleanHint(s) {
  return s.replace(/[✱*✦•◆▪]/g, "").replace(/\s+/g, " ").trim();
}

// Collect all meaningful hints from a single input element
function getHints(input) {
  const raw = [
    input.getAttribute("name"),
    input.getAttribute("id"),
    input.getAttribute("placeholder"),
    input.getAttribute("aria-label"),
    input.getAttribute("autocomplete"),
    input.id ? document.querySelector(`label[for="${CSS.escape(input.id)}"]`)?.textContent : null,
    input.closest("label")?.textContent,
    input.previousElementSibling?.textContent,
    input.closest('[class*="field"],[class*="form-group"],[class*="input-wrap"],[class*="application"]')
      ?.querySelector("label, legend, .label")?.textContent,
  ];
  return raw.filter(Boolean).map(s => cleanHint(s)).filter(s => s.length > 0);
}

function fillField(el, value) {
  if (!value || el.value) return false;
  const proto = el instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.dispatchEvent(new Event("blur", { bubbles: true }));
  return true;
}

function splitName(fullName) {
  const parts = (fullName ?? "").trim().split(/\s+/);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

async function autoFillForms(profile) {
  const inputs = Array.from(document.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea'
  ));
  const { first, last } = splitName(profile.fullName);

  const values = {
    fullName: profile.fullName,
    firstName: first,
    lastName: last,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    linkedinUrl: profile.linkedinUrl,
  };

  let filled = 0;
  for (const input of inputs) {
    const hints = getHints(input);
    for (const { key, patterns, type } of FIELD_MAP) {
      if (type && input.type !== type && input.type !== "text") continue;
      const matched = hints.some(hint => patterns.some(p => p.test(hint)));
      if (matched && values[key]) {
        if (fillField(input, values[key])) filled++;
        break;
      }
    }
  }
  return filled;
}

async function runAutoApply() {
  const { rxToken, autoApply } = await chrome.storage.local.get({ rxToken: null, autoApply: false });
  if (!rxToken || !autoApply) return 0;

  try {
    const res = await fetch(`${API}/api/profile`, {
      headers: { Authorization: `Bearer ${rxToken}` },
    });
    if (!res.ok) {
      showToast("ResumeX: could not load profile — are you signed in?");
      return 0;
    }
    const profile = await res.json();
    const filled = await autoFillForms(profile);
    if (filled > 0) {
      showToast(`ResumeX filled ${filled} field${filled > 1 ? "s" : ""} ✓`);
    } else {
      showToast("ResumeX: no matching fields found on this page");
    }
    return filled;
  } catch (e) {
    showToast("ResumeX: fill failed — " + e.message);
    return 0;
  }
}

function showToast(msg) {
  const el = document.createElement("div");
  el.textContent = msg;
  Object.assign(el.style, {
    position: "fixed", bottom: "24px", right: "24px", zIndex: "999999",
    background: "#0d1117", color: "#22d3ee", border: "1px solid rgba(34,211,238,0.3)",
    borderRadius: "10px", padding: "10px 16px", fontSize: "13px", fontFamily: "system-ui, sans-serif",
    boxShadow: "0 4px 24px rgba(0,0,0,0.4)", pointerEvents: "none",
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// Listen for popup messages
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "GET_JOB") sendResponse(getJobInfo());
  if (msg.type === "AUTO_APPLY") runAutoApply().then((filled) => sendResponse({ ok: true, filled }));
  return true;
});

// Watch for Apply button clicks
function watchForApply() {
  document.addEventListener("click", async (e) => {
    const el = e.target.closest("button, a");
    if (!el) return;
    const text = el.textContent?.toLowerCase() ?? "";
    if (!/apply|submit application/.test(text)) return;

    const { rxToken, autoSave, autoApply } = await chrome.storage.local.get({
      rxToken: null, autoSave: true, autoApply: false,
    });
    if (!rxToken) return;

    if (autoApply) runAutoApply();

    if (autoSave) {
      const job = getJobInfo();
      if (!job) return;
      fetch(`${API}/api/tracker`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${rxToken}` },
        body: JSON.stringify({ company: job.company, role: job.title, jobUrl: job.url, status: "Applied" }),
      }).catch(() => {});
    }
  }, true);
}

// Run auto-fill on page load if on an application page
(async () => {
  const { autoApply } = await chrome.storage.local.get({ autoApply: false });
  if (autoApply && document.readyState !== "loading") {
    setTimeout(runAutoApply, 1500); // wait for dynamic forms to render
  }
})();

watchForApply();
