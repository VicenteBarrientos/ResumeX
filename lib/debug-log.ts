export function isResumeXDebugEnabled() {
  return process.env.RESUMEX_DEBUG_LOGS === "true";
}

export function debugLog(...args: unknown[]) {
  if (isResumeXDebugEnabled()) {
    console.log(...args);
  }
}

export function debugError(...args: unknown[]) {
  if (isResumeXDebugEnabled()) {
    console.error(...args);
  }
}
