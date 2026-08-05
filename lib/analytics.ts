/**
 * Minimal product analytics (T-6.1). Events are recorded server-side without PII.
 * Prefer this over inventing a third-party dependency before Talent has traffic.
 */

export type AnalyticsEventName =
  | "home_talent_cta_click"
  | "talent_landing_mapper_cta"
  | "talent_landing_assess_cta"
  | "talent_search_saved";

export function trackEvent(
  name: AnalyticsEventName,
  props?: Record<string, string | number | boolean>,
): void {
  if (typeof window === "undefined") {
    return;
  }

  const body = JSON.stringify({
    name,
    props: props ?? {},
    path: window.location.pathname,
    ts: Date.now(),
  });

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics", new Blob([body], { type: "application/json" }));
      return;
    }
  } catch {
    // fall through
  }

  void fetch("/api/analytics", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}
