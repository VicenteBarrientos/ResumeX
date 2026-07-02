const API = "https://resumex.talentxrecruiting.com";

chrome.runtime.onInstalled.addListener(() => {
  console.log("ResumeX extension installed.");
});

// Proxy fetch requests from content scripts (they can't do cross-origin fetches)
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "FETCH_PROFILE") {
    fetch(`${API}/api/profile`, {
      headers: { Authorization: `Bearer ${msg.token}` },
    })
      .then((r) => r.json())
      .then((data) => sendResponse({ ok: true, data }))
      .catch((e) => sendResponse({ ok: false, error: e.message }));
    return true; // keep channel open for async response
  }
});
