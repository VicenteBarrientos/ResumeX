/**
 * Sanitize a post-auth redirect target. Only same-origin relative paths.
 */
export function safeCallbackUrl(
  raw: string | null | undefined,
  fallback = "/career/tracker",
): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return fallback;
  }
  return raw;
}
