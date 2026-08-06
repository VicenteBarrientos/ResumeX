"use client";

import { useEffect, useMemo, useState } from "react";
import type { ResearcherCandidate } from "@/lib/talent-mapper/types";
import { researcherToAtsCandidateDraft } from "@/lib/ats/from-researcher";
import type {
  AtsCandidateMatch,
  AtsConnectionSummary,
  AtsJob,
  AtsTransferPreview,
  AtsTransferResult,
} from "@/lib/ats/types";

type Step =
  | "choose_ats"
  | "choose_job"
  | "duplicates"
  | "preview"
  | "confirm"
  | "result";

export default function SendToAtsModal({
  candidate,
  roleTitle,
  searchProjectId,
  onClose,
}: {
  candidate: ResearcherCandidate;
  roleTitle: string;
  searchProjectId?: string;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("choose_ats");
  const [connections, setConnections] = useState<AtsConnectionSummary[]>([]);
  const [connection, setConnection] = useState<AtsConnectionSummary | null>(null);
  const [jobs, setJobs] = useState<AtsJob[]>([]);
  const [jobQuery, setJobQuery] = useState("");
  const [job, setJob] = useState<AtsJob | null>(null);
  const [duplicates, setDuplicates] = useState<AtsCandidateMatch[]>([]);
  const [reuseId, setReuseId] = useState<string | null>(null);
  const [createDespiteNameOnly, setCreateDespiteNameOnly] = useState(false);
  const [preview, setPreview] = useState<AtsTransferPreview | null>(null);
  const [result, setResult] = useState<AtsTransferResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmBasis, setConfirmBasis] = useState(false);

  const draft = useMemo(
    () =>
      researcherToAtsCandidateDraft({
        candidate,
        searchProjectId,
        searchProjectTitle: roleTitle,
        sourceProduct: "ResumeX Talent Mapper",
      }),
    [candidate, searchProjectId, roleTitle]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/talent/integrations/ats");
      if (!res.ok) {
        setError("Sign in to use ATS integrations.");
        return;
      }
      const data = await res.json();
      setConnections(
        (data.connections || []).filter(
          (c: AtsConnectionSummary) => c.status === "connected" || c.mode === "demo"
        )
      );
    })();
  }, []);

  async function selectConnection(c: AtsConnectionSummary) {
    setConnection(c);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/talent/integrations/ats/${c.id}/jobs`);
      const data = await res.json();
      if (!res.ok) throw new Error((typeof data?.error === "string" ? data.error : undefined) || "Could not load jobs.");
      setJobs(data.jobs || []);
      setStep("choose_job");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load jobs.");
    } finally {
      setBusy(false);
    }
  }

  async function selectJob(j: AtsJob) {
    if (!connection) return;
    setJob(j);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/talent/integrations/ats/${connection.id}/candidates/search`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: draft.name,
            email: draft.email,
            alternateEmails: draft.alternateEmails,
            orcidUrl: draft.orcidUrl,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error((typeof data?.error === "string" ? data.error : undefined) || "Duplicate check failed.");
      setDuplicates(data.matches || []);
      setStep("duplicates");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Duplicate check failed.");
    } finally {
      setBusy(false);
    }
  }

  async function runPreview() {
    if (!connection || !job) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/talent/integrations/ats/${connection.id}/transfers/preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidate: draft,
            externalJobId: job.id,
            searchProjectId,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error((typeof data?.error === "string" ? data.error : undefined) || "Preview failed.");
      setPreview(data.preview);
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview failed.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmTransfer() {
    if (!connection || !job || !confirmBasis) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/talent/integrations/ats/${connection.id}/transfers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidate: draft,
            externalJobId: job.id,
            searchProjectId,
            reuseExternalCandidateId: reuseId || undefined,
            createDespiteNameOnly:
              createDespiteNameOnly || (!draft.email && !reuseId),
            confirmed: true,
            confirmProcessingBasis: true,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error((typeof data?.error === "string" ? data.error : undefined) || "Transfer failed.");
      setResult(data.result);
      setStep("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transfer failed.");
    } finally {
      setBusy(false);
    }
  }

  const filteredJobs = jobs.filter((j) =>
    jobQuery ? j.title.toLowerCase().includes(jobQuery.toLowerCase()) : true
  );

  const confirmLabel =
    connection?.mode === "demo"
      ? "Run simulated Ashby transfer"
      : connection?.provider === "recruitee"
        ? "Create or update this candidate in Recruitee"
        : connection?.provider === "zoho-recruit"
          ? "Create or update this candidate in Zoho Recruit"
          : "Create or update this candidate in Ashby";

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Send to ATS"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-lg border border-zinc-200 bg-white shadow-2xl sm:rounded-lg">
        <header className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Send to ATS</h2>
            <p className="mt-1 text-sm text-zinc-600">{candidate.name}</p>
          </div>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100"
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {error}
            </p>
          )}

          {step === "choose_ats" && (
            <div className="space-y-3">
              <p className="text-sm text-zinc-600">Choose a connected ATS account.</p>
              {connections.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  No connected ATS yet.{" "}
                  <a href="/talent/integrations" className="text-brand-700 underline">
                    Open integration settings
                  </a>
                </p>
              ) : (
                connections.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={busy}
                    onClick={() => void selectConnection(c)}
                    className="flex w-full flex-col rounded-xl border border-zinc-200 px-3 py-3 text-left hover:border-brand-500"
                  >
                    <span className="font-medium text-zinc-900">{c.displayName}</span>
                    <span className="text-xs text-zinc-500">
                      {c.provider}
                      {c.mode === "demo" ? " · Demo Mode" : ""}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}

          {step === "choose_job" && (
            <div className="space-y-3">
              <button type="button" className="text-xs text-zinc-500 underline" onClick={() => setStep("choose_ats")}>
                ← Back
              </button>
              <input
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                placeholder="Search jobs by title"
                value={jobQuery}
                onChange={(e) => setJobQuery(e.target.value)}
              />
              <ul className="max-h-72 space-y-2 overflow-y-auto">
                {filteredJobs.map((j) => (
                  <li key={j.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void selectJob(j)}
                      className="w-full rounded-xl border border-zinc-200 px-3 py-3 text-left hover:border-brand-500"
                    >
                      <span className="font-medium text-zinc-900">{j.title}</span>
                      <span className="mt-1 block text-xs text-zinc-500">
                        {[j.location, j.status].filter(Boolean).join(" · ")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {filteredJobs.length === 0 && (
                <p className="text-sm text-zinc-500">No open jobs found.</p>
              )}
            </div>
          )}

          {step === "duplicates" && (
            <div className="space-y-3">
              <button type="button" className="text-xs text-zinc-500 underline" onClick={() => setStep("choose_job")}>
                ← Back
              </button>
              <p className="text-sm text-zinc-600">
                Possible duplicates in {connection?.displayName}. Name-only matches
                are never reused automatically.
              </p>
              {!draft.email && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  This researcher has no email — duplicate confidence is limited.
                  Current employment and identity still require validation.
                </p>
              )}
              {duplicates.length === 0 ? (
                <p className="text-sm text-zinc-500">No matches found.</p>
              ) : (
                <ul className="space-y-2">
                  {duplicates.map((d) => (
                    <li key={d.externalCandidateId}>
                      <label className="flex cursor-pointer gap-3 rounded-xl border border-zinc-200 px-3 py-3">
                        <input
                          type="radio"
                          name="reuse"
                          checked={reuseId === d.externalCandidateId}
                          onChange={() => setReuseId(d.externalCandidateId)}
                        />
                        <span>
                          <span className="font-medium text-zinc-900">{d.name}</span>
                          <span className="mt-1 block text-xs text-zinc-500">
                            {d.confidence} · {d.reasons.join("; ")}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              <label className="flex items-start gap-2 text-sm text-zinc-700">
                <input
                  type="radio"
                  name="reuse"
                  checked={reuseId === null}
                  onChange={() => setReuseId(null)}
                />
                Create a separate candidate
              </label>
              {!draft.email && reuseId === null && (
                <label className="flex items-start gap-2 text-xs text-zinc-600">
                  <input
                    type="checkbox"
                    checked={createDespiteNameOnly}
                    onChange={(e) => setCreateDespiteNameOnly(e.target.checked)}
                  />
                  I confirm creating a name-only ATS lead (no email invented)
                </label>
              )}
              <button
                type="button"
                disabled={busy || (!draft.email && !reuseId && !createDespiteNameOnly)}
                onClick={() => void runPreview()}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Continue to preview
              </button>
            </div>
          )}

          {step === "preview" && preview && (
            <div className="space-y-3">
              <button type="button" className="text-xs text-zinc-500 underline" onClick={() => setStep("duplicates")}>
                ← Back
              </button>
              <p className="text-sm text-zinc-600">
                Preview only — no ATS records will be written until you confirm.
              </p>
              <dl className="space-y-2 text-sm">
                {preview.providerPayloadPreview.map((row) => (
                  <div key={row.label}>
                    <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      {row.label}
                    </dt>
                    <dd className="mt-0.5 whitespace-pre-wrap text-zinc-800">{row.value}</dd>
                  </div>
                ))}
              </dl>
              <ul className="space-y-1 text-sm">
                {preview.plannedOperations.map((op) => (
                  <li key={op.operation} className="text-zinc-700">
                    {op.supported ? "✓" : "✗"} {op.description}
                    {op.warning ? (
                      <span className="block text-xs text-amber-800">{op.warning}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
              {preview.warnings.map((w) => (
                <p key={w} className="text-xs text-amber-900">
                  {w}
                </p>
              ))}
              <button
                type="button"
                onClick={() => setStep("confirm")}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white"
              >
                Review confirmation
              </button>
            </div>
          )}

          {step === "confirm" && (
            <div className="space-y-4">
              <button type="button" className="text-xs text-zinc-500 underline" onClick={() => setStep("preview")}>
                ← Back
              </button>
              <p className="text-sm text-zinc-700">
                ResumeX will transfer the selected professional information and
                recruiter-reviewed evidence to your ATS. Confirm that your
                organization has an appropriate basis for processing this
                candidate’s data.
              </p>
              <label className="flex items-start gap-2 text-sm text-zinc-800">
                <input
                  type="checkbox"
                  checked={confirmBasis}
                  onChange={(e) => setConfirmBasis(e.target.checked)}
                />
                I confirm the processing basis and want to proceed
              </label>
              <button
                type="button"
                disabled={!confirmBasis || busy}
                onClick={() => void confirmTransfer()}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {confirmLabel}
              </button>
            </div>
          )}

          {step === "result" && result && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-zinc-900">
                Status: {result.status}
              </p>
              <ul className="text-sm text-zinc-700">
                <li>Candidate: {result.externalCandidateId || "—"}</li>
                <li>Application: {result.externalApplicationId || "—"}</li>
                <li>Completed: {result.completedOperations.join(", ") || "—"}</li>
              </ul>
              {result.warnings.map((w) => (
                <p key={w} className="text-xs text-amber-900">
                  {w}
                </p>
              ))}
              {result.candidateUrl && (
                <a
                  href={result.candidateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand-700 underline"
                >
                  Open candidate in ATS
                </a>
              )}
              {result.retryable && (
                <button
                  type="button"
                  className="block text-sm text-brand-800 underline"
                  onClick={() => {
                    setStep("confirm");
                  }}
                >
                  Retry incomplete operation
                </button>
              )}
              <a
                href="/talent/integrations"
                className="block text-sm text-zinc-600 underline"
              >
                View transfer history
              </a>
            </div>
          )}

          {busy && (
            <p className="mt-3 text-xs text-zinc-500" role="status">
              Working…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
