import type { CandidateProfile } from "@/lib/autoapply-types";
import { getBackendSecret, getBackendUrl } from "@/lib/job-api";

export { getBackendSecret, getBackendUrl, saveBackendSettings } from "@/lib/job-api";

function backendErrorMessage(status: number, error: string | undefined): string {
  if (status === 401 || error === "Unauthorized") {
    return "API secret incorrect — open C:\\Users\\hp\\.autoapply-secret.txt, copy the full value, paste here, and try again.";
  }
  return error ?? `Backend error (${status})`;
}

/** Extract text from a PDF via ResumeX (no OpenAI key needed). */
export async function extractResumeFromPdf(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("resumePdf", file);
  const res = await fetch("/api/autoapply/extract-resume", { method: "POST", body: formData });
  const data: { resume?: string; error?: string } = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Could not extract PDF text.");
  if (!data.resume?.trim()) throw new Error("No text found in PDF.");
  return data.resume;
}

/** Parse resume text via AutoApply backend (Claude). */
export async function parseProfileViaBackend(
  resume: string,
  secretOverride?: string
): Promise<CandidateProfile> {
  const secret = (secretOverride ?? getBackendSecret()).trim();
  if (!secret) {
    throw new Error("AutoApply API secret is required. Enter it below (same as the extension).");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Autoapply-Key": secret,
  };

  const res = await fetch(`${getBackendUrl()}/api/profile/parse`, {
    method: "POST",
    headers,
    body: JSON.stringify({ resume }),
  });

  const data: { profile?: CandidateProfile; error?: string } = await res.json();
  if (!res.ok) throw new Error(backendErrorMessage(res.status, data.error));
  if (!data.profile) throw new Error("No profile data returned from backend.");
  return data.profile;
}

/** Parse via ResumeX OpenAI route (fallback when backend secret unavailable). */
export async function parseProfileViaOpenAI(resume: string): Promise<CandidateProfile> {
  const res = await fetch("/api/autoapply/parse-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume }),
  });
  const data: { profile?: CandidateProfile; error?: string } = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Could not parse resume.");
  if (!data.profile) throw new Error("No profile data returned.");
  return data.profile;
}

/** Prefer AutoApply backend (Claude); fall back to ResumeX OpenAI if no secret. */
export async function parseProfileFromResumeText(
  resume: string,
  secretOverride?: string
): Promise<CandidateProfile> {
  const secret = (secretOverride ?? getBackendSecret()).trim();
  if (secret) {
    return parseProfileViaBackend(resume, secret);
  }
  return parseProfileViaOpenAI(resume);
}
