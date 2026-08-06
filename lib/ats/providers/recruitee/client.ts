import "server-only";

import { atsFetch } from "@/lib/ats/http";
import type { AtsProvider } from "@/lib/ats/types";

const PROVIDER: AtsProvider = "recruitee";
const BASE = "https://api.recruitee.com";

export function recruiteeCompanyPath(companyIdOrSubdomain: string, suffix: string): string {
  const company = encodeURIComponent(companyIdOrSubdomain.trim());
  const path = suffix.startsWith("/") ? suffix : `/${suffix}`;
  return `/c/${company}${path}`;
}

export async function recruiteeRequest<T>(input: {
  companyIdOrSubdomain: string;
  token: string;
  path: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  retrySafe?: boolean;
  rawBody?: Buffer | string;
  headers?: Record<string, string>;
  rawResponse?: boolean;
}): Promise<T> {
  const result = await atsFetch<T>({
    provider: PROVIDER,
    baseUrl: BASE,
    path: recruiteeCompanyPath(input.companyIdOrSubdomain, input.path),
    method: input.method,
    body: input.body,
    rawBody: input.rawBody,
    query: input.query,
    retrySafe: input.retrySafe ?? (input.method === undefined || input.method === "GET"),
    rawResponse: input.rawResponse,
    headers: {
      Authorization: `Bearer ${input.token}`,
      ...input.headers,
    },
  });
  return result.data;
}
