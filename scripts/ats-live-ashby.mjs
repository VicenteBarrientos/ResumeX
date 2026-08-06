if (process.env.ALLOW_LIVE_ATS_TESTS !== "true") {
  console.error("Set ALLOW_LIVE_ATS_TESTS=true to run.");
  process.exit(1);
}
if (!process.env.ASHBY_LIVE_TEST_CONNECTION_ID && !process.env.ASHBY_API_KEY) {
  console.log("SKIP: no Ashby API key or live connection — use Demo Mode instead.");
  process.exit(0);
}
console.log("Live Ashby smoke: use UI with [ResumeX Test] candidates when credentials exist.");
process.exit(0);
