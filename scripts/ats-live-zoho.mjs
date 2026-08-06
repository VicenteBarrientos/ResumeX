if (process.env.ALLOW_LIVE_ATS_TESTS !== "true") {
  console.error("Set ALLOW_LIVE_ATS_TESTS=true to run.");
  process.exit(1);
}
console.log("Live Zoho smoke: complete OAuth in UI, then Send to ATS with [ResumeX Test] data.");
console.log("Connection:", process.env.ZOHO_LIVE_TEST_CONNECTION_ID || "(unset)");
process.exit(0);
