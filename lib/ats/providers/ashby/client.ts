import "server-only";

import { atsFetch } from "@/lib/ats/http";
import type { AtsProvider } from "@/lib/ats/types";

const PROVIDER: AtsProvider = "ashby";
const BASE = "https://api.ashbyhq.com";

export function ashbyBasicAuthHeader(apiKey: string): string {
  const token = Buffer.from(`${apiKey}:`, "utf8").toString("base64");
  return `Basic ${token}`;
}

export async function ashbyRequest<T>(input: {
  apiKey: string;
  path: string;
  body?: unknown;
  actingUserId?: string;
  retrySafe?: boolean;
}): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: ashbyBasicAuthHeader(input.apiKey),
    Accept: "application/json; version=1",
    "Content-Type": "application/json",
  };
  if (input.actingUserId) {
    headers["X-On-Behalf-Of"] = input.actingUserId;
  }

  const result = await atsFetch<{
    success?: boolean;
    results?: T;
    errorCode?: string;
    errorMessage?: string;
  } & T>({
    provider: PROVIDER,
    baseUrl: BASE,
    path: input.path.startsWith("/") ? input.path : `/${input.path}`,
    method: "POST",
    body: input.body ?? {},
    headers,
    retrySafe: input.retrySafe ?? false,
  });

  const data = result.data as {
    success?: boolean;
    results?: T;
    errorCode?: string;
    errorMessage?: string;
  };

  // Ashby wraps many responses as { success, results }.
  if (data && typeof data === "object" && "success" in data) {
    if (data.success === false) {
      const { AtsPermissionError, AtsValidationError, AtsAuthenticationError } = await import(
        "@/lib/ats/errors"
      );
      const code = data.errorCode || "";
      const msg = data.errorMessage || "Ashby request failed.";
      if (code === "missing_endpoint_permission") {
        throw new AtsPermissionError("ashby", msg, { httpStatus: 403 });
      }
      if (code.includes("auth") || code.includes("ApiKey")) {
        throw new AtsAuthenticationError("ashby", msg);
      }
      throw new AtsValidationError("ashby", msg);
    }
    if ("results" in data) return data.results as T;
  }

  return result.data as T;
}
