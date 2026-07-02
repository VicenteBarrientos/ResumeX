const API = "https://resumex.talentxrecruiting.com";

chrome.runtime.onInstalled.addListener(() => {
  console.log("ResumeX extension installed.");
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  // Fetch profile + stored resume for content script
  if (msg.type === "FETCH_PROFILE") {
    Promise.all([
      fetch(`${API}/api/profile`, { headers: { Authorization: `Bearer ${msg.token}` } }).then((r) => r.json()),
      fetch(`${API}/api/answers`, { headers: { Authorization: `Bearer ${msg.token}` } }).then((r) => r.json()).catch(() => []),
      chrome.storage.local.get(["rxResumeB64", "rxResumeName"]),
    ])
      .then(([profile, answers, { rxResumeB64, rxResumeName }]) =>
        sendResponse({ ok: true, data: profile, answers: answers ?? [], resumeB64: rxResumeB64 ?? null, resumeName: rxResumeName ?? null })
      )
      .catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }

  // Save a learned answer to the API
  if (msg.type === "SAVE_ANSWER") {
    fetch(`${API}/api/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${msg.token}` },
      body: JSON.stringify({ question: msg.question, answer: msg.answer }),
    }).catch(() => {});
    return false;
  }
});
