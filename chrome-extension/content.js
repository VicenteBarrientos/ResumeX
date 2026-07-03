const API = "https://resumex.talentxrecruiting.com";

// Job detectors per site
const DETECTORS = [
  {
    match: () => location.hostname.includes("lever.co"),
    extract: () => {
      const tp = document.title.split(/ at | - /);
      const companySlug = location.pathname.split("/")[1] ?? "";
      const title = document.querySelector("[data-qa='posting-name']")?.textContent?.trim()
        || document.querySelector(".posting-headline h2")?.textContent?.trim()
        || document.querySelector("h2")?.textContent?.trim()
        || document.querySelector("h1")?.textContent?.trim()
        || tp[0]?.trim()
        || "Job Posting";
      const company = companySlug
        || document.querySelector(".main-header-text .company-name")?.textContent?.trim()
        || tp[1]?.trim();
      const loc = document.querySelector(".posting-categories .location, [data-qa='posting-location'], .location")?.textContent?.trim();
      const description = document.querySelector(".posting-requirements, .section-wrapper, .posting-description, main")?.textContent?.trim();
      return { title, company: company || "Unknown", location: loc, description, url: window.location.href };
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
    match: () => location.hostname.includes("workday.com") || location.hostname.includes("myworkdayjobs.com"),
    extract: () => {
      const title = document.querySelector("[data-automation-id='jobPostingHeader'] h2,[data-automation-id='jobPostingHeader'] h1,h1")?.textContent?.trim();
      const company = document.querySelector("[data-automation-id='company-name'],.css-1r3zy5o")?.textContent?.trim()
        || document.title.split(" - ").pop()?.trim()
        || location.hostname.split(".")[0];
      const loc = document.querySelector("[data-automation-id='locations'] dd,[data-automation-id='location']")?.textContent?.trim();
      const description = document.querySelector("[data-automation-id='job-posting-details'],main")?.textContent?.trim();
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
  if (!job?.title && !location.hostname.includes("lever.co") && !location.hostname.includes("greenhouse.io")) return null;
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

// Get a human-readable label for any form element
function getFieldLabel(el) {
  const hints = [
    el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent : null,
    el.closest("label")?.textContent,
    el.getAttribute("aria-label"),
    el.getAttribute("placeholder"),
    el.previousElementSibling?.textContent,
    el.closest('[class*="field"],[class*="form-group"],[class*="application"]')?.querySelector("label,legend,.label")?.textContent,
  ];
  return hints.filter(Boolean).map(s => cleanHint(s)).find(s => s.length > 1) ?? "";
}

async function autoFillForms(profile, savedAnswers = []) {
  const { first, last } = splitName(profile.fullName);
  const profileValues = {
    fullName: profile.fullName,
    firstName: first,
    lastName: last,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    linkedinUrl: profile.linkedinUrl,
  };

  // Build answer lookup: normalized question → answer text
  const answerMap = {};
  for (const { question, answer } of savedAnswers) {
    answerMap[question.toLowerCase().trim()] = answer;
  }

  let filled = 0;

  // 1. Fill text/email/tel/textarea inputs from profile
  const textInputs = Array.from(document.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea'
  ));
  for (const input of textInputs) {
    const hints = getHints(input);

    // Try profile fields first
    let profileFilled = false;
    for (const { key, patterns, type } of FIELD_MAP) {
      if (type && input.type !== type && input.type !== "text") continue;
      if (hints.some(h => patterns.some(p => p.test(h))) && profileValues[key]) {
        if (fillField(input, profileValues[key])) { filled++; profileFilled = true; }
        break;
      }
    }
    if (profileFilled) continue;

    // Try saved answers
    const label = getFieldLabel(input).toLowerCase();
    if (label && answerMap[label] && !input.value) {
      if (fillField(input, answerMap[label])) filled++;
    }
  }

  // 2. Fill selects from saved answers
  for (const select of document.querySelectorAll("select")) {
    const label = getFieldLabel(select).toLowerCase();
    const answer = label && answerMap[label];
    if (!answer || select.value) continue;
    const option = Array.from(select.options).find(o => cleanHint(o.textContent).toLowerCase() === answer.toLowerCase());
    if (option) {
      select.value = option.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      filled++;
    }
  }

  // 3. Fill radio groups from saved answers
  const radioGroups = {};
  for (const radio of document.querySelectorAll('input[type="radio"]')) {
    const name = radio.getAttribute("name") ?? getFieldLabel(radio);
    if (!radioGroups[name]) radioGroups[name] = [];
    radioGroups[name].push(radio);
  }
  for (const [, radios] of Object.entries(radioGroups)) {
    if (radios.some(r => r.checked)) continue; // already selected
    const groupLabel = getFieldLabel(radios[0]).toLowerCase() || cleanHint(
      radios[0].closest('fieldset, [role="group"], [class*="field"]')?.querySelector("legend,label")?.textContent ?? ""
    ).toLowerCase();
    const answer = groupLabel && answerMap[groupLabel];
    if (!answer) continue;
    const match = radios.find(r => {
      const rLabel = cleanHint(
        document.querySelector(`label[for="${CSS.escape(r.id)}"]`)?.textContent ??
        r.closest("label")?.textContent ??
        r.nextElementSibling?.textContent ?? ""
      ).toLowerCase();
      return rLabel === answer.toLowerCase();
    });
    if (match) {
      match.checked = true;
      match.dispatchEvent(new Event("change", { bubbles: true }));
      match.click();
      filled++;
    }
  }

  return filled;
}

// Capture what the user answered on the form before submitting
async function captureAnswers(token) {
  const captured = [];

  // Text inputs & textareas
  for (const input of document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea')) {
    if (!input.value.trim()) continue;
    const label = getFieldLabel(input);
    if (!label || label.length < 3) continue;
    // Skip profile fields (we already know those)
    const isProfile = FIELD_MAP.some(({ patterns }) => getHints(input).some(h => patterns.some(p => p.test(h))));
    if (isProfile) continue;
    captured.push({ question: label, answer: input.value.trim() });
  }

  // Selects
  for (const select of document.querySelectorAll("select")) {
    const selected = select.options[select.selectedIndex];
    if (!selected || !selected.value) continue;
    const label = getFieldLabel(select);
    if (!label || label.length < 3) continue;
    captured.push({ question: label, answer: cleanHint(selected.textContent) });
  }

  // Radio groups
  for (const radio of document.querySelectorAll('input[type="radio"]:checked')) {
    const groupLabel = cleanHint(
      radio.closest('fieldset,[role="group"],[class*="field"]')?.querySelector("legend,label")?.textContent ?? ""
    );
    const optionLabel = cleanHint(
      document.querySelector(`label[for="${CSS.escape(radio.id)}"]`)?.textContent ??
      radio.closest("label")?.textContent ??
      radio.nextElementSibling?.textContent ?? ""
    );
    if (!groupLabel || groupLabel.length < 3 || !optionLabel) continue;
    captured.push({ question: groupLabel, answer: optionLabel });
  }

  // Send each novel answer to the API
  for (const { question, answer } of captured) {
    chrome.runtime.sendMessage({ type: "SAVE_ANSWER", token, question, answer });
  }
}

function attachResume(base64, filename) {
  const fileInput = document.querySelector('input[type="file"][accept*="pdf"], input[type="file"][name*="resume"], input[type="file"][name*="cv"], input[type="file"]');
  if (!fileInput) return false;
  try {
    const byteString = atob(base64.split(",")[1] ?? base64);
    const bytes = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i);
    const file = new File([bytes], filename ?? "resume.pdf", { type: "application/pdf" });
    const dt = new DataTransfer();
    dt.items.add(file);
    fileInput.files = dt.files;
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    fileInput.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  } catch { return false; }
}

async function runAutoApply() {
  const { rxToken, autoApply } = await chrome.storage.local.get({ rxToken: null, autoApply: false });
  if (!rxToken || !autoApply) return 0;

  try {
    const result = await chrome.runtime.sendMessage({ type: "FETCH_PROFILE", token: rxToken });
    if (!result?.ok) {
      showToast("ResumeX: could not load profile — are you signed in?");
      return 0;
    }
    const profile = result.data;
    let filled = await autoFillForms(profile, result.answers ?? []);

    // Attach resume PDF if stored in extension
    if (result.resumeB64) {
      const attached = attachResume(result.resumeB64, result.resumeName);
      if (attached) filled++;
    }

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
  if (msg.type === "RESUMEX_PING") {
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === "GET_JOB") {
    // Try immediately, then retry after a short wait for React pages
    const job = getJobInfo();
    if (job) { sendResponse(job); return true; }
    setTimeout(() => sendResponse(getJobInfo()), 1500);
    return true;
  }
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

    if (autoApply) {
      await captureAnswers(rxToken); // learn what the user answered
      runAutoApply();
    }

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
