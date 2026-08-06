import "server-only";

import { db } from "@/lib/db";
import type { AtsAdapter } from "@/lib/ats/adapter";
import { providerSupports } from "@/lib/ats/capabilities";
import { resolveDuplicateDecision, sortCandidateMatches } from "@/lib/ats/duplicates";
import { isAtsError } from "@/lib/ats/errors";
import { buildAtsEvidencePlainText } from "@/lib/ats/evidence";
import { buildAtsTransferIdempotencyKey } from "@/lib/ats/idempotency";
import { logAtsEvent } from "@/lib/ats/logging";
import { getAtsAdapter } from "@/lib/ats/registry";
import type {
  AtsCandidateDraft,
  AtsCandidateMatch,
  AtsTransferPreview,
  AtsTransferResult,
} from "@/lib/ats/types";

export async function previewAtsTransfer(input: {
  userId: string;
  connectionId: string;
  candidate: AtsCandidateDraft;
  externalJobId: string;
}): Promise<AtsTransferPreview> {
  const adapter = await getAtsAdapter(input.connectionId, input.userId);
  const connection = await db.atsConnection.findFirst({
    where: { id: input.connectionId, userId: input.userId },
  });
  if (!connection) {
    throw new Error("Connection not found");
  }

  // Existing mapping elevates duplicate confidence.
  const mapping = await db.atsExternalMapping.findFirst({
    where: {
      connectionId: input.connectionId,
      localEntityType: "researcher",
      localEntityId: input.candidate.localCandidateKey,
      externalEntityType: "candidate",
    },
  });

  const jobs = await adapter.listJobs();
  const job = jobs.jobs.find((j) => j.id === input.externalJobId);
  if (!job) {
    // Still allow preview with a stub job if ID was selected earlier.
    throw Object.assign(new Error("Selected job was not found in the ATS."), {
      status: 404,
    });
  }

  let duplicates: AtsCandidateMatch[] = await adapter.searchCandidates({
    name: input.candidate.name,
    email: input.candidate.email,
    alternateEmails: input.candidate.alternateEmails,
    linkedInUrl: input.candidate.linkedInUrl,
    githubUrl: input.candidate.githubUrl,
    websiteUrl: input.candidate.websiteUrl,
    orcidUrl: input.candidate.orcidUrl,
  });

  if (mapping) {
    duplicates = [
      {
        externalCandidateId: mapping.externalEntityId,
        name: input.candidate.name,
        emails: input.candidate.email ? [input.candidate.email] : [],
        externalUrl: mapping.externalUrl || undefined,
        confidence: "existing_mapping",
        reasons: ["Existing ResumeX external mapping"],
        existingJobAssociations: [],
      },
      ...duplicates.filter((d) => d.externalCandidateId !== mapping.externalEntityId),
    ];
  }

  duplicates = sortCandidateMatches(duplicates);
  const decision = resolveDuplicateDecision(
    duplicates,
    Boolean(input.candidate.email)
  );

  const evidencePreview = buildAtsEvidencePlainText(input.candidate.evidence, {
    maxLength: 1200,
  });

  const plannedOperations: AtsTransferPreview["plannedOperations"] = [];

  const willReuse = Boolean(decision.recommendedExternalCandidateId);
  plannedOperations.push({
    operation: willReuse ? "reuse_candidate" : "create_candidate",
    supported: providerSupports(adapter.provider, "create_candidate"),
    required: true,
    description: willReuse
      ? `Reuse existing ATS candidate ${decision.recommendedExternalCandidateId}`
      : "Create a new ATS candidate record",
    warning: decision.warning,
  });

  const assocCap =
    providerSupports(adapter.provider, "associate_candidate_to_job") ||
    providerSupports(adapter.provider, "create_application");
  plannedOperations.push({
    operation:
      adapter.provider === "ashby" ? "create_application" : "associate_candidate_to_job",
    supported: assocCap,
    required: true,
    description: `Associate candidate with job “${job.title}”`,
  });

  const evidenceSupported =
    providerSupports(adapter.provider, "add_note") ||
    providerSupports(adapter.provider, "write_custom_fields");
  plannedOperations.push({
    operation: "add_evidence",
    supported: evidenceSupported,
    required: true,
    description:
      adapter.provider === "recruitee"
        ? "Write ResumeX evidence into candidate profile fields"
        : "Attach ResumeX evidence as an ATS note",
  });

  if (input.candidate.resumeFile) {
    plannedOperations.push({
      operation: "upload_resume",
      supported: providerSupports(adapter.provider, "upload_resume"),
      required: false,
      description: `Upload résumé (${input.candidate.resumeFile.filename})`,
      warning: !providerSupports(adapter.provider, "upload_resume")
        ? "Résumé upload is not supported for this ATS connection."
        : undefined,
    });
  }

  const warnings = [
    ...(decision.warning ? [decision.warning] : []),
    "ResumeX will transfer the selected professional information and recruiter-reviewed evidence to your ATS. Confirm that your organization has an appropriate basis for processing this candidate’s data.",
  ];

  return {
    connectionId: input.connectionId,
    provider: adapter.provider,
    candidate: input.candidate,
    job,
    possibleDuplicates: duplicates,
    plannedOperations,
    providerPayloadPreview: [
      { label: "Name", value: input.candidate.name },
      { label: "Email", value: input.candidate.email || "(none — do not invent)" },
      { label: "Job", value: `${job.title} (${job.id})` },
      { label: "Source", value: input.candidate.sourceLabel },
      { label: "Evidence preview", value: evidencePreview },
    ],
    confirmationRequired: true,
    warnings,
  };
}

export async function executeAtsTransfer(input: {
  userId: string;
  connectionId: string;
  candidate: AtsCandidateDraft;
  externalJobId: string;
  searchProjectId?: string;
  reuseExternalCandidateId?: string;
  createDespiteNameOnly?: boolean;
  uploadResume?: boolean;
  confirmed: true;
}): Promise<AtsTransferResult> {
  const started = Date.now();
  const adapter = await getAtsAdapter(input.connectionId, input.userId);
  const idempotencyKey = buildAtsTransferIdempotencyKey({
    connectionId: input.connectionId,
    localCandidateKey: input.candidate.localCandidateKey,
    externalJobId: input.externalJobId,
  });

  const existing = await db.atsTransfer.findUnique({
    where: {
      connectionId_idempotencyKey: {
        connectionId: input.connectionId,
        idempotencyKey,
      },
    },
  });

  if (existing?.status === "success") {
    return {
      transferId: existing.id,
      status: "success",
      provider: adapter.provider,
      connectionId: input.connectionId,
      externalCandidateId: existing.externalCandidateId || undefined,
      externalApplicationId: existing.externalApplicationId || undefined,
      externalJobId: existing.externalJobId,
      completedOperations: Array.isArray(existing.completedOperations)
        ? (existing.completedOperations as string[])
        : [],
      warnings: ["Reused existing successful transfer (idempotent)."],
      retryable: false,
      ...(existing.resultSummary && typeof existing.resultSummary === "object"
        ? (existing.resultSummary as object)
        : {}),
    };
  }

  let transfer =
    existing ||
    (await db.atsTransfer.create({
      data: {
        connectionId: input.connectionId,
        localCandidateKey: input.candidate.localCandidateKey,
        localSearchProjectId: input.searchProjectId,
        externalJobId: input.externalJobId,
        idempotencyKey,
        status: "in_progress",
        candidateSnapshot: input.candidate as object,
        requestSummary: {
          reuseExternalCandidateId: input.reuseExternalCandidateId,
          createDespiteNameOnly: input.createDespiteNameOnly,
          uploadResume: input.uploadResume,
        },
        completedOperations: [],
        confirmedByUserId: input.userId,
        confirmedAt: new Date(),
      },
    }));

  if (existing && existing.status !== "success") {
    transfer = await db.atsTransfer.update({
      where: { id: existing.id },
      data: {
        status: "in_progress",
        confirmedByUserId: input.userId,
        confirmedAt: new Date(),
        safeErrorMessage: null,
        errorCode: null,
        failedOperation: null,
      },
    });
  }

  const completed: string[] = Array.isArray(transfer.completedOperations)
    ? [...(transfer.completedOperations as string[])]
    : [];
  const warnings: string[] = [];
  let externalCandidateId = transfer.externalCandidateId || undefined;
  let externalApplicationId = transfer.externalApplicationId || undefined;
  let candidateUrl: string | undefined;
  let applicationUrl: string | undefined;

  try {
    // Step 1: resolve or create candidate
    if (!externalCandidateId) {
      if (input.reuseExternalCandidateId) {
        externalCandidateId = input.reuseExternalCandidateId;
        completed.push("reuse_candidate");
      } else {
        if (!input.candidate.email && !input.createDespiteNameOnly) {
          await finalizeTransfer(transfer.id, {
            status: "duplicate_review_required",
            completedOperations: completed,
            safeErrorMessage:
              "Creating a name-only ATS lead requires explicit confirmation.",
          });
          return {
            transferId: transfer.id,
            status: "duplicate_review_required",
            provider: adapter.provider,
            connectionId: input.connectionId,
            externalJobId: input.externalJobId,
            completedOperations: completed,
            warnings: [
              "No email available. Confirm createDespiteNameOnly to proceed.",
            ],
            retryable: true,
          };
        }

        // Block auto-create when exact email duplicate exists and reuse not chosen.
        const dupes = await adapter.searchCandidates({
          name: input.candidate.name,
          email: input.candidate.email,
          alternateEmails: input.candidate.alternateEmails,
        });
        const exact = dupes.find((d) => d.confidence === "exact_email");
        if (exact && !input.reuseExternalCandidateId) {
          await finalizeTransfer(transfer.id, {
            status: "duplicate_review_required",
            completedOperations: completed,
            safeErrorMessage:
              "Exact email duplicate exists. Choose reuse or cancel.",
          });
          return {
            transferId: transfer.id,
            status: "duplicate_review_required",
            provider: adapter.provider,
            connectionId: input.connectionId,
            externalJobId: input.externalJobId,
            externalCandidateId: exact.externalCandidateId,
            completedOperations: completed,
            warnings: [
              "Exact email duplicate exists. Reuse the existing candidate or cancel.",
            ],
            retryable: true,
          };
        }

        const created = await adapter.createCandidate(input.candidate);
        externalCandidateId = created.externalCandidateId;
        candidateUrl = created.externalUrl;
        completed.push("create_candidate");
        await persistProgress(transfer.id, {
          externalCandidateId,
          completedOperations: completed,
        });
        await upsertMapping({
          connectionId: input.connectionId,
          localEntityId: input.candidate.localCandidateKey,
          externalEntityId: externalCandidateId,
          externalUrl: candidateUrl,
        });
      }
    }

    // Step 2: associate / application
    if (!completed.includes("associate_candidate_to_job") &&
        !completed.includes("create_application")) {
      const app = await adapter.attachCandidateToJob({
        externalCandidateId: externalCandidateId!,
        externalJobId: input.externalJobId,
      });
      externalApplicationId = app.externalApplicationId || externalApplicationId;
      candidateUrl = app.candidateUrl || candidateUrl;
      applicationUrl = app.applicationUrl;
      completed.push(
        adapter.provider === "ashby"
          ? "create_application"
          : "associate_candidate_to_job"
      );
      await persistProgress(transfer.id, {
        externalCandidateId,
        externalApplicationId,
        completedOperations: completed,
      });
    }

    // Step 3: evidence
    if (!completed.includes("add_evidence")) {
      const evidenceResult = await adapter.addEvidence({
        externalCandidateId: externalCandidateId!,
        externalApplicationId,
        evidence: input.candidate.evidence,
      });
      completed.push("add_evidence");
      warnings.push(...evidenceResult.warnings);
      if (evidenceResult.writtenAs === "unsupported") {
        warnings.push("Evidence storage is unsupported for this ATS.");
      }
      await persistProgress(transfer.id, {
        externalCandidateId,
        externalApplicationId,
        completedOperations: completed,
      });
    }

    // Step 4: resume (optional, non-fatal)
    if (input.uploadResume && input.candidate.resumeFile && adapter.uploadResume) {
      if (!completed.includes("upload_resume")) {
        try {
          // Resume bytes must be loaded by the caller in a future enhancement;
          // for MVP without file storage, skip with warning.
          warnings.push(
            "Résumé upload was requested but no file bytes were provided in this request. Candidate and evidence were still transferred."
          );
        } catch (error) {
          warnings.push(
            isAtsError(error)
              ? `Résumé upload failed: ${error.message}`
              : "Résumé upload failed; transfer otherwise succeeded."
          );
        }
      }
    }

    const resultSummary = {
      candidateUrl,
      applicationUrl,
      mode: adapter.provider === "ashby" ? undefined : undefined,
    };

    await finalizeTransfer(transfer.id, {
      status: warnings.some((w) => /failed/i.test(w)) ? "partial_success" : "success",
      externalCandidateId,
      externalApplicationId,
      completedOperations: completed,
      resultSummary,
    });

    logAtsEvent({
      connectionId: input.connectionId,
      provider: adapter.provider,
      operation: "transfer.execute",
      durationMs: Date.now() - started,
      outcome: "success",
    });

    const isDemo =
      (await db.atsConnection.findUnique({ where: { id: input.connectionId } }))
        ?.mode === "DEMO";
    if (isDemo) {
      warnings.push("Ashby Demo Mode — No external ATS data was modified.");
    }

    return {
      transferId: transfer.id,
      status: "success",
      provider: adapter.provider,
      connectionId: input.connectionId,
      externalCandidateId,
      externalApplicationId,
      externalJobId: input.externalJobId,
      candidateUrl,
      applicationUrl,
      completedOperations: completed,
      warnings,
      retryable: false,
    };
  } catch (error) {
    const safeMessage = isAtsError(error)
      ? error.message
      : "ATS transfer failed.";
    const failedOperation =
      !externalCandidateId
        ? "create_candidate"
        : !completed.includes("associate_candidate_to_job") &&
            !completed.includes("create_application")
          ? "associate_candidate_to_job"
          : "add_evidence";

    await finalizeTransfer(transfer.id, {
      status: externalCandidateId ? "partial_success" : "failed",
      externalCandidateId,
      externalApplicationId,
      completedOperations: completed,
      failedOperation,
      errorCode: isAtsError(error) ? error.code : "transient",
      safeErrorMessage: safeMessage,
    });

    logAtsEvent({
      connectionId: input.connectionId,
      provider: adapter.provider,
      operation: "transfer.execute",
      durationMs: Date.now() - started,
      outcome: "error",
      safeErrorCode: isAtsError(error) ? error.code : "transient",
    });

    return {
      transferId: transfer.id,
      status: externalCandidateId ? "partial_success" : "failed",
      provider: adapter.provider,
      connectionId: input.connectionId,
      externalCandidateId,
      externalApplicationId,
      externalJobId: input.externalJobId,
      candidateUrl,
      applicationUrl,
      completedOperations: completed,
      failedOperation,
      warnings: [...warnings, safeMessage],
      retryable: isAtsError(error) ? error.retryable : true,
    };
  }
}

export async function resumeAtsTransfer(input: {
  userId: string;
  connectionId: string;
  transferId: string;
}): Promise<AtsTransferResult> {
  const transfer = await db.atsTransfer.findFirst({
    where: {
      id: input.transferId,
      connectionId: input.connectionId,
      connection: { userId: input.userId },
    },
  });
  if (!transfer) {
    throw Object.assign(new Error("Transfer not found."), { status: 404 });
  }

  const candidate = transfer.candidateSnapshot as unknown as AtsCandidateDraft;
  return executeAtsTransfer({
    userId: input.userId,
    connectionId: input.connectionId,
    candidate,
    externalJobId: transfer.externalJobId,
    searchProjectId: transfer.localSearchProjectId || undefined,
    reuseExternalCandidateId: transfer.externalCandidateId || undefined,
    createDespiteNameOnly: true,
    confirmed: true,
  });
}

async function persistProgress(
  transferId: string,
  data: {
    externalCandidateId?: string;
    externalApplicationId?: string;
    completedOperations: string[];
  }
) {
  await db.atsTransfer.update({
    where: { id: transferId },
    data: {
      externalCandidateId: data.externalCandidateId,
      externalApplicationId: data.externalApplicationId,
      completedOperations: data.completedOperations,
    },
  });
}

async function finalizeTransfer(
  transferId: string,
  data: {
    status: string;
    externalCandidateId?: string;
    externalApplicationId?: string;
    completedOperations: string[];
    failedOperation?: string;
    errorCode?: string;
    safeErrorMessage?: string;
    resultSummary?: object;
  }
) {
  await db.atsTransfer.update({
    where: { id: transferId },
    data: {
      status: data.status,
      externalCandidateId: data.externalCandidateId,
      externalApplicationId: data.externalApplicationId,
      completedOperations: data.completedOperations,
      failedOperation: data.failedOperation,
      errorCode: data.errorCode,
      safeErrorMessage: data.safeErrorMessage,
      resultSummary: data.resultSummary,
    },
  });
}

async function upsertMapping(input: {
  connectionId: string;
  localEntityId: string;
  externalEntityId: string;
  externalUrl?: string;
}) {
  await db.atsExternalMapping.upsert({
    where: {
      connectionId_localEntityType_localEntityId_externalEntityType: {
        connectionId: input.connectionId,
        localEntityType: "researcher",
        localEntityId: input.localEntityId,
        externalEntityType: "candidate",
      },
    },
    create: {
      connectionId: input.connectionId,
      localEntityType: "researcher",
      localEntityId: input.localEntityId,
      externalEntityType: "candidate",
      externalEntityId: input.externalEntityId,
      externalUrl: input.externalUrl,
    },
    update: {
      externalEntityId: input.externalEntityId,
      externalUrl: input.externalUrl,
    },
  });
}

/** Exported for contract tests that inject an adapter without DB. */
export async function runAdapterTransferSaga(
  adapter: AtsAdapter,
  input: {
    candidate: AtsCandidateDraft;
    externalJobId: string;
    reuseExternalCandidateId?: string;
  }
): Promise<{
  externalCandidateId: string;
  externalApplicationId?: string;
  completedOperations: string[];
}> {
  const completed: string[] = [];
  let externalCandidateId = input.reuseExternalCandidateId;
  if (!externalCandidateId) {
    const created = await adapter.createCandidate(input.candidate);
    externalCandidateId = created.externalCandidateId;
    completed.push("create_candidate");
  } else {
    completed.push("reuse_candidate");
  }
  const app = await adapter.attachCandidateToJob({
    externalCandidateId,
    externalJobId: input.externalJobId,
  });
  completed.push(
    adapter.provider === "ashby"
      ? "create_application"
      : "associate_candidate_to_job"
  );
  await adapter.addEvidence({
    externalCandidateId,
    externalApplicationId: app.externalApplicationId,
    evidence: input.candidate.evidence,
  });
  completed.push("add_evidence");
  return {
    externalCandidateId,
    externalApplicationId: app.externalApplicationId,
    completedOperations: completed,
  };
}
