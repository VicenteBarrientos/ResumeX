/**
 * Zoho Recruit multi-DC allowlists.
 * @see https://www.zoho.com/recruit/developer-guide/apiv2/multi-dc.html
 */

export const ZOHO_ACCOUNTS_SERVERS = [
  "https://accounts.zoho.com",
  "https://accounts.zoho.eu",
  "https://accounts.zoho.in",
  "https://accounts.zoho.com.au",
  "https://accounts.zoho.jp",
  "https://accounts.zoho.com.cn",
] as const;

export const ZOHO_API_DOMAINS = [
  "https://www.zohoapis.com",
  "https://www.zohoapis.eu",
  "https://www.zohoapis.in",
  "https://www.zohoapis.com.au",
  "https://www.zohoapis.jp",
  "https://www.zohoapis.com.cn",
  "https://recruit.zoho.com",
  "https://recruit.zoho.eu",
  "https://recruit.zoho.in",
  "https://recruit.zoho.com.au",
  "https://recruit.zoho.jp",
  "https://recruit.zoho.com.cn",
] as const;

const LOCATION_TO_API: Record<string, string> = {
  us: "https://www.zohoapis.com",
  eu: "https://www.zohoapis.eu",
  in: "https://www.zohoapis.in",
  au: "https://www.zohoapis.com.au",
  jp: "https://www.zohoapis.jp",
  cn: "https://www.zohoapis.com.cn",
};

const LOCATION_TO_ACCOUNTS: Record<string, string> = {
  us: "https://accounts.zoho.com",
  eu: "https://accounts.zoho.eu",
  in: "https://accounts.zoho.in",
  au: "https://accounts.zoho.com.au",
  jp: "https://accounts.zoho.jp",
  cn: "https://accounts.zoho.com.cn",
};

export function assertZohoAccountsServer(url: string): string {
  const normalized = url.replace(/\/$/, "");
  if (!(ZOHO_ACCOUNTS_SERVERS as readonly string[]).includes(normalized)) {
    throw new Error("Zoho accounts server is not on the allowlist.");
  }
  return normalized;
}

export function assertZohoApiDomain(url: string): string {
  const normalized = url.replace(/\/$/, "");
  if (!(ZOHO_API_DOMAINS as readonly string[]).includes(normalized)) {
    throw new Error("Zoho API domain is not on the allowlist.");
  }
  return normalized;
}

export function zohoApiDomainForLocation(location: string | undefined): string {
  const key = (location || "us").toLowerCase();
  return LOCATION_TO_API[key] || LOCATION_TO_API.us;
}

export function zohoAccountsServerForLocation(location: string | undefined): string {
  const key = (location || "us").toLowerCase();
  return LOCATION_TO_ACCOUNTS[key] || LOCATION_TO_ACCOUNTS.us;
}

/**
 * Minimum scopes for ResumeX ATS transfer.
 * Documented reasons:
 * - candidates READ/CREATE/UPDATE: search, create, update evidence fields
 * - jobopenings READ: list jobs
 * - notes CREATE: evidence notes
 * - settings.modules / settings.fields READ: mandatory field metadata
 * No DELETE, offers, interviews, reports, clients, contacts.
 */
export const ZOHO_RECRUIT_SCOPES = [
  "ZohoRecruit.modules.candidates.READ",
  "ZohoRecruit.modules.candidates.CREATE",
  "ZohoRecruit.modules.candidates.UPDATE",
  "ZohoRecruit.modules.jobopenings.READ",
  "ZohoRecruit.modules.notes.CREATE",
  "ZohoRecruit.settings.modules.READ",
  "ZohoRecruit.settings.fields.READ",
] as const;

export function zohoScopeString(): string {
  return ZOHO_RECRUIT_SCOPES.join(",");
}

/** Escape Zoho criteria values — prevent criteria injection. */
export function escapeZohoCriteriaValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
