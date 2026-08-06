import "server-only";

import type { AtsCapability, AtsProvider } from "@/lib/ats/types";

/**
 * Explicit capability matrix. Unsupported ops must not appear as enabled UI controls.
 * Values reflect what the current public customer APIs support as of 2026-08.
 */
const MATRIX: Record<AtsProvider, Record<AtsCapability, boolean>> = {
  recruitee: {
    list_jobs: true,
    search_candidates: true,
    create_candidate: true,
    associate_candidate_to_job: true,
    create_application: true, // via offer assignment / placement on create
    add_note: false, // no confirmed public Core API note-write endpoint
    write_custom_fields: true, // candidate profile fields
    upload_resume: true,
    list_stages: false, // not claimed until verified for customer Core API
    move_application: false, // not claimed until verified
    receive_webhooks: true,
    incremental_sync: false,
  },
  "zoho-recruit": {
    list_jobs: true,
    search_candidates: true,
    create_candidate: true,
    associate_candidate_to_job: true,
    create_application: true, // Candidates/actions/associate
    add_note: true,
    write_custom_fields: true, // when fields exist
    upload_resume: true, // capability-detected at runtime
    list_stages: false, // capability-detected later
    move_application: false, // capability-detected later
    receive_webhooks: false, // not claimed until implemented
    incremental_sync: false,
  },
  ashby: {
    list_jobs: true,
    search_candidates: true,
    create_candidate: true,
    associate_candidate_to_job: true, // application.create
    create_application: true,
    add_note: true,
    write_custom_fields: true,
    upload_resume: true,
    list_stages: true, // when hiringProcessMetadataRead allows
    move_application: true,
    receive_webhooks: true,
    incremental_sync: true,
  },
};

export function getProviderCapabilities(provider: AtsProvider): AtsCapability[] {
  const row = MATRIX[provider];
  return (Object.keys(row) as AtsCapability[]).filter((key) => row[key]);
}

export function providerSupports(
  provider: AtsProvider,
  capability: AtsCapability
): boolean {
  return MATRIX[provider][capability] === true;
}

export function getCapabilityMatrix(): typeof MATRIX {
  return MATRIX;
}
