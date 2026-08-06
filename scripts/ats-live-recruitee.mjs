/**
 * Opt-in Recruitee live smoke. Requires ALLOW_LIVE_ATS_TESTS=true and a connection id.
 * Creates a synthetic [ResumeX Test] candidate — does not auto-delete.
 */
if (process.env.ALLOW_LIVE_ATS_TESTS !== "true") {
  console.error("Set ALLOW_LIVE_ATS_TESTS=true to run.");
  process.exit(1);
}
if (!process.env.RECRUITEE_LIVE_TEST_CONNECTION_ID) {
  console.error("Set RECRUITEE_LIVE_TEST_CONNECTION_ID to a connected Recruitee connection.");
  process.exit(1);
}
console.log(
  "Live Recruitee smoke is intentionally thin: use the UI Send to ATS flow with synthetic data."
);
console.log("Connection:", process.env.RECRUITEE_LIVE_TEST_CONNECTION_ID);
console.log("Prefix candidates with [ResumeX Test] and use @example.invalid emails.");
process.exit(0);
