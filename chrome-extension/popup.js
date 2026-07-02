const API = "https://resumex.talentxrecruiting.com";

const $ = (id) => document.getElementById(id);

async function init() {
  $("loading").style.display = "block";
  $("login").style.display = "none";
  $("view").style.display = "none";

  const { rxToken, rxUser } = await chrome.storage.local.get(["rxToken", "rxUser"]);

  if (!rxToken) {
    $("loading").style.display = "none";
    $("login").style.display = "block";
    return;
  }

  $("username-display").textContent = rxUser ?? "";
  $("loading").style.display = "none";
  $("view").style.display = "block";

  // Ask content script for current job info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: "GET_JOB" });
    if (response?.title) {
      showJob(response, rxToken);
    } else {
      $("no-job").style.display = "block";
      $("job-section").style.display = "none";
    }
  } catch {
    $("no-job").style.display = "block";
    $("job-section").style.display = "none";
  }
}

function showJob(job, token) {
  $("no-job").style.display = "none";
  $("job-section").style.display = "block";
  $("job-info").innerHTML = `<strong>${job.title}</strong> at <strong>${job.company}</strong><br>${job.location ?? ""}`;

  fetchScore(job, token);

  $("save-btn").onclick = () => saveJob(job, token);
}

async function fetchScore(job, token) {
  $("score-section").style.display = "none";
  try {
    const res = await fetch(`${API}/api/match-score`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ jobDescription: job.description, jobTitle: job.title, company: job.company }),
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.score == null) return;

    $("score-value").textContent = `${data.score}%`;
    const bar = $("score-bar");
    bar.style.width = `${data.score}%`;
    bar.className = "score-fill " + (data.score >= 70 ? "score-high" : data.score >= 40 ? "score-mid" : "score-low");
    if (data.topGap) $("score-gap").textContent = `Top gap: ${data.topGap}`;
    $("score-section").style.display = "block";
  } catch {}
}

async function saveJob(job, token) {
  $("save-btn").disabled = true;
  $("save-btn").textContent = "Saving…";
  try {
    const res = await fetch(`${API}/api/tracker`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ company: job.company, role: job.title, jobUrl: job.url, status: "Applied" }),
    });
    if (res.ok) {
      $("saved-badge").style.display = "block";
      $("save-btn").style.display = "none";
    } else {
      $("save-btn").textContent = "Save to Tracker";
      $("save-btn").disabled = false;
    }
  } catch {
    $("save-btn").textContent = "Save to Tracker";
    $("save-btn").disabled = false;
  }
}

$("login-btn").addEventListener("click", async () => {
  const username = $("username").value.trim();
  const password = $("password").value;
  $("login-error").textContent = "";

  if (!username || !password) {
    $("login-error").textContent = "Please enter your username and password.";
    return;
  }

  $("login-btn").textContent = "Connecting…";
  $("login-btn").disabled = true;

  try {
    const res = await fetch(`${API}/api/extension/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.token) {
      $("login-error").textContent = data.error ?? "Login failed.";
      $("login-btn").textContent = "Connect to ResumeX";
      $("login-btn").disabled = false;
      return;
    }
    await chrome.storage.local.set({ rxToken: data.token, rxUser: username });
    init();
  } catch {
    $("login-error").textContent = "Could not connect. Try again.";
    $("login-btn").textContent = "Connect to ResumeX";
    $("login-btn").disabled = false;
  }
});

$("logout-btn").addEventListener("click", async () => {
  await chrome.storage.local.remove(["rxToken", "rxUser"]);
  init();
});

$("open-tracker").addEventListener("click", () => {
  chrome.tabs.create({ url: `${API}/tracker` });
});

init();
