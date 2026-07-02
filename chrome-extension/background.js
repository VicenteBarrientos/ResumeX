const API = "https://resumex.talentxrecruiting.com";

chrome.runtime.onInstalled.addListener(() => {
  console.log("ResumeX extension installed.");
});

// Proxy fetch requests from content scripts (they can't do cross-origin fetches)
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "FETCH_PROFILE") {
    Promise.all([
      fetch(`${API}/api/profile`, { headers: { Authorization: `Bearer ${msg.token}` } }).then((r) => r.json()),
      chrome.storage.local.get(["rxResumeB64", "rxResumeName"]),
    ])
      .then(([profile, { rxResumeB64, rxResumeName }]) =>
        sendResponse({ ok: true, data: profile, resumeB64: rxResumeB64 ?? null, resumeName: rxResumeName ?? null })
      )
      .catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
});
