import "server-only";

import { db } from "@/lib/db";
import { AtsConfigurationError, AtsPermissionError } from "@/lib/ats/errors";
import {
  connectionToSummary,
  fromPrismaProvider,
  type PrismaAtsProvider,
  type PrismaAtsStatus,
} from "@/lib/ats/mapping";
import type { AtsConnectionSummary, AtsProvider } from "@/lib/ats/types";

export type OwnedAtsConnection = {
  id: string;
  userId: string;
  provider: AtsProvider;
  mode: "live" | "sandbox" | "demo";
  displayName: string;
  status: AtsConnectionSummary["status"];
  encryptedCredentials: string | null;
  encryptionKeyVersion: number;
  metadata: unknown;
  capabilities: unknown;
  summary: AtsConnectionSummary;
};

/**
 * Load an ATS connection owned by the authenticated user.
 * Never trust client-provided ownership.
 */
export async function requireOwnedAtsConnection(
  userId: string,
  connectionId: string,
  options?: { allowDisconnected?: boolean }
): Promise<OwnedAtsConnection> {
  const row = await db.atsConnection.findFirst({
    where: { id: connectionId, userId },
  });

  if (!row) {
    throw new AtsPermissionError(
      "ashby",
      "ATS connection not found or not owned by this user."
    );
  }

  const provider = fromPrismaProvider(row.provider as PrismaAtsProvider);
  if (
    !options?.allowDisconnected &&
    (row.status as PrismaAtsStatus) === "DISCONNECTED"
  ) {
    throw new AtsConfigurationError(provider, "This ATS connection is disconnected.");
  }

  const summary = connectionToSummary({
    id: row.id,
    provider: row.provider as PrismaAtsProvider,
    mode: row.mode as "LIVE" | "SANDBOX" | "DEMO",
    displayName: row.displayName,
    status: row.status as PrismaAtsStatus,
    capabilities: row.capabilities,
    lastTestedAt: row.lastTestedAt,
    lastSuccessfulSyncAt: row.lastSuccessfulSyncAt,
    lastErrorMessage: row.lastErrorMessage,
    metadata: row.metadata,
  });

  return {
    id: row.id,
    userId: row.userId,
    provider,
    mode: summary.mode,
    displayName: row.displayName,
    status: summary.status,
    encryptedCredentials: row.encryptedCredentials,
    encryptionKeyVersion: row.encryptionKeyVersion,
    metadata: row.metadata,
    capabilities: row.capabilities,
    summary,
  };
}

/** Verify a Talent Mapper search belongs to the same user. */
export async function requireOwnedTalentSearch(
  userId: string,
  searchId: string
): Promise<{ id: string; roleTitle: string }> {
  const search = await db.talentSearch.findFirst({
    where: { id: searchId, userId },
    select: { id: true, roleTitle: true },
  });
  if (!search) {
    throw new AtsPermissionError(
      "ashby",
      "Search project not found or not owned by this user."
    );
  }
  return search;
}

export async function listOwnedAtsConnections(
  userId: string
): Promise<AtsConnectionSummary[]> {
  const rows = await db.atsConnection.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((row) =>
    connectionToSummary({
      id: row.id,
      provider: row.provider as PrismaAtsProvider,
      mode: row.mode as "LIVE" | "SANDBOX" | "DEMO",
      displayName: row.displayName,
      status: row.status as PrismaAtsStatus,
      capabilities: row.capabilities,
      lastTestedAt: row.lastTestedAt,
      lastSuccessfulSyncAt: row.lastSuccessfulSyncAt,
      lastErrorMessage: row.lastErrorMessage,
      metadata: row.metadata,
    })
  );
}
