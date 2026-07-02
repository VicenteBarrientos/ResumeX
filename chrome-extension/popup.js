const API = "https://resumex.talentxrecruiting.com";
const $ = (id) => document.getElementById(id);

async function init() {
  $("loading").style.display = "block";
  $("login").style.display = "none";
  $("view").style.display = "none";

  const { rxToken, rxUser } = await chrome.storage.local.get(["rxToken", "rxUser"]);

  $("loading").style.display = "none";

  if (!rxToken) {
    $("login").style.display = "block";
    return;
  }

  $("username-display").textContent = rxUser ?? "";
  $("view").style.display = "block";

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) { $("no-job").style.display = "block"; return; }

  try {
    const job = await chrome.tabs.sendMessage(tab.id, { type: "GET_JOB" });
    if (job?.title) {
      showJob(job, rxToken);
    } else {
      $("no-job").style.display = "block";
    }
  } catch {
    $("no-job").style.display = "block";
  }
}

function showJob(job, token) {
  $("no-job").style.display = "none";
  $("job-section").style.display = "block";
  $("job-info").innerHTML = `<strong>${job.title}</strong> at <strong>${job.company}</strong>`;
  fetchScore(job, token);
  $("save-btn").onclick = () => saveJob(job, token);
}

async function fetchScore(job, token) {
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

// Email login
$("login-btn").addEventListener("click", async () => {
  const email = $("email").value.trim();
  const password = $("password").value;
  $("login-error").textContent = "";
  if (!email || !password) { $("login-error").textContent = "Please enter your email and password."; return; }
  $("login-btn").disabled = true;
  $("login-btn").textContent = "Signing in…";
  try {
    const res = await fetch(`${API}/api/extension/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.token) {
      $("login-error").textContent = data.error ?? "Login failed.";
      $("login-btn").textContent = "Sign in";
      $("login-btn").disabled = false;
      return;
    }
    await chrome.storage.local.set({ rxToken: data.token, rxUser: data.name ?? email });
    init();
  } catch {
    $("login-error").textContent = "Could not connect. Try again.";
    $("login-btn").textContent = "Sign in";
    $("login-btn").disabled = false;
  }
});

// Google login — open extension-auth page and listen for token in URL hash
$("google-btn").addEventListener("click", async () => {
  const authUrl = `${API}/extension-auth`;
  const tab = await chrome.tabs.create({ url: authUrl });

  const listener = async (tabId, changeInfo, t) => {
    if (tabId !== tab.id) return;
    if (changeInfo.url && changeInfo.url.includes("rx-token=")) {
      const hash = new URL(changeInfo.url).hash;
      const token = hash.match(/rx-token=([^&]+)/)?.[1];
      if (token) {
        chrome.tabs.onUpdated.removeListener(listener);
        chrome.tabs.remove(tabId).catch(() => {});
        // Get display name
        const payload = JSON.parse(atob(token.split(".")[1]));
        await chrome.storage.local.set({ rxToken: token, rxUser: payload.name ?? "Google user" });
        init();
      }
    }
  };

  chrome.tabs.onUpdated.addListener(listener);
});

$("logout-btn").addEventListener("click", async () => {
  await chrome.storage.local.remove(["rxToken", "rxUser"]);
  init();
});

$("open-tracker").addEventListener("click", () => {
  chrome.tabs.create({ url: `${API}/tracker` });
});

init();
