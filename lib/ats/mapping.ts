import "server-only";

import type {
  AtsCapability,
  AtsConnectionMode,
  AtsConnectionStatus,
  AtsConnectionSummary,
  AtsProvider,
} from "@/lib/ats/types";
import { getProviderCapabilities } from "@/lib/ats/capabilities";

export type PrismaAtsProvider = "RECRUITEE" | "ZOHO_RECRUIT" | "ASHBY";
export type PrismaAtsMode = "LIVE" | "SANDBOX" | "DEMO";
export type PrismaAtsStatus =
  | "CONNECTED"
  | "NEEDS_REAUTHENTICATION"
  | "PERMISSION_ERROR"
  | "CONFIGURATION_ERROR"
  | "TEMPORARILY_UNAVAILABLE"
  | "DISCONNECTED";

export function toPrismaProvider(provider: AtsProvider): PrismaAtsProvider {
  switch (provider) {
    case "recruitee":
      return "RECRUITEE";
    case "zoho-recruit":
      return "ZOHO_RECRUIT";
    case "ashby":
      return "ASHBY";
  }
}

export function fromPrismaProvider(provider: PrismaAtsProvider): AtsProvider {
  switch (provider) {
    case "RECRUITEE":
      return "recruitee";
    case "ZOHO_RECRUIT":
      return "zoho-recruit";
    case "ASHBY":
      return "ashby";
  }
}

export function toPrismaMode(mode: AtsConnectionMode): PrismaAtsMode {
  return mode.toUpperCase() as PrismaAtsMode;
}

export function fromPrismaMode(mode: PrismaAtsMode): AtsConnectionMode {
  return mode.toLowerCase() as AtsConnectionMode;
}

export function toPrismaStatus(status: AtsConnectionStatus): PrismaAtsStatus {
  switch (status) {
    case "connected":
      return "CONNECTED";
    case "needs_reauthentication":
      return "NEEDS_REAUTHENTICATION";
    case "permission_error":
      return "PERMISSION_ERROR";
    case "configuration_error":
      return "CONFIGURATION_ERROR";
    case "temporarily_unavailable":
      return "TEMPORARILY_UNAVAILABLE";
    case "disconnected":
      return "DISCONNECTED";
  }
}

export function fromPrismaStatus(status: PrismaAtsStatus): AtsConnectionStatus {
  switch (status) {
    case "CONNECTED":
      return "connected";
    case "NEEDS_REAUTHENTICATION":
      return "needs_reauthentication";
    case "PERMISSION_ERROR":
      return "permission_error";
    case "CONFIGURATION_ERROR":
      return "configuration_error";
    case "TEMPORARILY_UNAVAILABLE":
      return "temporarily_unavailable";
    case "DISCONNECTED":
      return "disconnected";
  }
}

export function connectionToSummary(row: {
  id: string;
  provider: PrismaAtsProvider;
  mode: PrismaAtsMode;
  displayName: string;
  status: PrismaAtsStatus;
  capabilities: unknown;
  lastTestedAt: Date | null;
  lastSuccessfulSyncAt: Date | null;
  lastErrorMessage: string | null;
  metadata: unknown;
}): AtsConnectionSummary {
  const provider = fromPrismaProvider(row.provider);
  const caps =
    Array.isArray(row.capabilities) && row.capabilities.every((c) => typeof c === "string")
      ? (row.capabilities as AtsCapability[])
      : getProviderCapabilities(provider);

  const warnings: string[] = [];
  if (row.lastErrorMessage && row.status !== "CONNECTED") {
    warnings.push(row.lastErrorMessage);
  }
  if (row.mode === "DEMO") {
    warnings.push("Demo Mode — no external ATS data is modified.");
  }

  return {
    id: row.id,
    provider,
    mode: fromPrismaMode(row.mode),
    displayName: row.displayName,
    status: fromPrismaStatus(row.status),
    capabilities: caps,
    lastTestedAt: row.lastTestedAt?.toISOString(),
    lastSuccessfulSyncAt: row.lastSuccessfulSyncAt?.toISOString(),
    configurationWarnings: warnings,
  };
}
