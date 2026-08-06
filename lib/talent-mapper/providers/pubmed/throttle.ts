/**
 * Conservative NCBI E-utilities request pacing.
 * Without API key: ~3 req/s → 380ms floor.
 * With API key: below 10 req/s → 140ms floor.
 */

let lastRequestAt = 0;
let chain: Promise<void> = Promise.resolve();

export function getPubmedMinIntervalMs(hasApiKey: boolean): number {
  return hasApiKey ? 140 : 380;
}

export async function schedulePubmedRequest(
  hasApiKey: boolean,
  signal?: AbortSignal,
): Promise<void> {
  const minInterval = getPubmedMinIntervalMs(hasApiKey);

  const run = async () => {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    const now = Date.now();
    const wait = Math.max(0, lastRequestAt + minInterval - now);
    if (wait > 0) {
      await sleep(wait, signal);
    }
    lastRequestAt = Date.now();
  };

  const next = chain.then(run, run);
  chain = next.then(
    () => undefined,
    () => undefined,
  );
  await next;
}

/** Test helper — reset scheduler state between unit tests. */
export function resetPubmedSchedulerForTests(): void {
  lastRequestAt = 0;
  chain = Promise.resolve();
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
