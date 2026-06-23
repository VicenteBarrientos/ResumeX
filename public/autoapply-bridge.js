// Bridge script injected into ResumeX pages by the Chrome extension.
// Allows the extension to read/write autoapply data in ResumeX's localStorage.

(function () {
  const PROFILE_KEY = "autoapply_profile";
  const APPS_KEY = "autoapply_applications";

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const { type, payload } = event.data || {};

    if (type === "AUTOAPPLY_GET_PROFILE") {
      const raw = localStorage.getItem(PROFILE_KEY);
      window.postMessage({ type: "AUTOAPPLY_PROFILE_RESPONSE", profile: raw ? JSON.parse(raw) : null }, "*");
    }

    if (type === "AUTOAPPLY_SET_PROFILE") {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(payload));
      window.postMessage({ type: "AUTOAPPLY_PROFILE_SET_OK" }, "*");
    }

    if (type === "AUTOAPPLY_LOG_APPLICATION") {
      const existing = JSON.parse(localStorage.getItem(APPS_KEY) || "[]");
      // Avoid duplicates by id
      if (!existing.find((a) => a.id === payload.id)) {
        const updated = [payload, ...existing];
        localStorage.setItem(APPS_KEY, JSON.stringify(updated));
      }
      window.postMessage({ type: "AUTOAPPLY_LOG_OK" }, "*");
      // Trigger UI refresh if dashboard is open
      window.dispatchEvent(new CustomEvent("autoapply:new_application", { detail: payload }));
    }
  });
})();
