"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import CandidateCard from "@/components/talent-mapper/CandidateCard";
import CandidateDetail from "@/components/talent-mapper/CandidateDetail";
import {
  DemoTalkingPoints,
  Disclaimer,
  HowItWorks,
  WhyTalentMapper,
} from "@/components/talent-mapper/Disclaimer";
import {
  SCIENTIFIC_DEMO_JD,
  SCIENTIFIC_DEMO_LABEL,
  getDemoCriteria,
} from "@/lib/talent-mapper/criteria";
import {
  createTalentSearch,
  getTalentSearch,
  toggleTalentShortlist,
  updateTalentSearch,
  upsertTalentNote,
} from "@/lib/talent-mapper/client-searches";
import { trackEvent } from "@/lib/analytics";
import { exportShortlistCsv } from "@/lib/talent-mapper/export-csv";
import { buildSearchQueries, hashQueryId } from "@/lib/talent-mapper/query-builder";
import type {
  ResearcherCandidate,
  SearchMode,
  SearchQuery,
  SourcingCriteria,
  TalentSearchResult,
} from "@/lib/talent-mapper/types";

const STORAGE_KEY = "resumex-talent-mapper-v1";
const IMPORT_FLAG_KEY = "resumex-talent-mapper-imported";

type Step = "role" | "criteria" | "strategy" | "results";

type CriterionGroup =
  | "requiredTechniques"
  | "preferredTechniques"
  | "researchAreas"
  | "organismsOrSystems"
  | "adjacentTerms"
  | "senioritySignals"
  | "exclusions";

type PersistedState = {
  step: Step;
  roleTitle: string;
  jobDescription: string;
  criteria: SourcingCriteria | null;
  extractedCriteria: SourcingCriteria | null;
  queries: SearchQuery[];
  mode: SearchMode;
  result: TalentSearchResult | null;
  shortlist: string[];
  notes: Record<string, string>;
};

const GROUP_LABELS: Record<CriterionGroup, string> = {
  requiredTechniques: "Required techniques",
  preferredTechniques: "Preferred techniques",
  researchAreas: "Research areas",
  organismsOrSystems: "Organisms or biological systems",
  adjacentTerms: "Adjacent terminology",
  senioritySignals: "Seniority signals",
  exclusions: "Exclusions",
};

function loadState(): Partial<PersistedState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<PersistedState>;
  } catch {
    return null;
  }
}

export default function TalentMapperWorkspace() {
  const searchParams = useSearchParams();
  const urlSearchId = searchParams.get("searchId");

  const [step, setStep] = useState<Step>("role");
  const [roleTitle, setRoleTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [criteria, setCriteria] = useState<SourcingCriteria | null>(null);
  const [extractedCriteria, setExtractedCriteria] = useState<SourcingCriteria | null>(null);
  const [queries, setQueries] = useState<SearchQuery[]>([]);
  const [mode, setMode] = useState<SearchMode>("demo");
  const [openAlexConfigured, setOpenAlexConfigured] = useState(false);
  const [result, setResult] = useState<TalentSearchResult | null>(null);
  const [shortlist, setShortlist] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusOutreach, setFocusOutreach] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionHint, setActionHint] = useState<string | null>(null);
  const [whyOpen, setWhyOpen] = useState(false);
  const [talkingOpen, setTalkingOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [newCriterion, setNewCriterion] = useState<Record<string, string>>({});
  const [searchId, setSearchId] = useState<string | null>(null);
  const [importOffer, setImportOffer] = useState<PersistedState | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const noteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Filters
  const [minScore, setMinScore] = useState(0);
  const [filterTechnique, setFilterTechnique] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const [filterInstitution, setFilterInstitution] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterYear, setFilterYear] = useState(0);
  const [filterWorks, setFilterWorks] = useState(0);
  const [filterOrcid, setFilterOrcid] = useState(false);
  const [filterShortlisted, setFilterShortlisted] = useState(false);
  const [sortBy, setSortBy] = useState<
    "score" | "recent" | "works" | "name" | "institution"
  >("score");

  const applyPersisted = useCallback((saved: Partial<PersistedState>) => {
    if (saved.step) setStep(saved.step);
    if (saved.roleTitle) setRoleTitle(saved.roleTitle);
    if (saved.jobDescription) setJobDescription(saved.jobDescription);
    if (saved.criteria) setCriteria(saved.criteria);
    if (saved.extractedCriteria) setExtractedCriteria(saved.extractedCriteria);
    if (saved.queries) setQueries(saved.queries);
    if (saved.mode) setMode(saved.mode);
    if (saved.result) setResult(saved.result);
    if (saved.shortlist) setShortlist(new Set(saved.shortlist));
    if (saved.notes) setNotes(saved.notes);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const saved = loadState();
      const alreadyImported = localStorage.getItem(IMPORT_FLAG_KEY) === "1";

      if (urlSearchId) {
        try {
          const detail = await getTalentSearch(urlSearchId);
          if (cancelled) return;
          setSearchId(detail.id);
          applyPersisted({
            step: detail.step ?? "results",
            roleTitle: detail.roleTitle,
            jobDescription: detail.jobDescription,
            criteria: detail.criteria,
            extractedCriteria: detail.extractedCriteria,
            queries: detail.queries,
            mode: detail.mode,
            result: detail.result,
            shortlist: detail.shortlist,
            notes: detail.notes,
          });
          setHydrated(true);
        } catch {
          if (!cancelled) {
            setError("Could not load the saved search.");
            setHydrated(true);
          }
        }
      } else {
        if (saved && (saved.result || (saved.shortlist && saved.shortlist.length > 0)) && !alreadyImported) {
          setImportOffer({
            step: saved.step || "role",
            roleTitle: saved.roleTitle || "",
            jobDescription: saved.jobDescription || "",
            criteria: saved.criteria || null,
            extractedCriteria: saved.extractedCriteria || null,
            queries: saved.queries || [],
            mode: saved.mode || "demo",
            result: saved.result || null,
            shortlist: saved.shortlist || [],
            notes: saved.notes || {},
          });
        } else if (saved) {
          applyPersisted(saved);
        }
        setHydrated(true);
      }

      fetch("/api/talent-mapper/status")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data || cancelled) return;
          startTransition(() => {
            setOpenAlexConfigured(Boolean(data.openAlexConfigured));
          });
        })
        .catch(() => undefined);
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [urlSearchId, applyPersisted]);

  useEffect(() => {
    if (!hydrated) return;
    const payload: PersistedState = {
      step,
      roleTitle,
      jobDescription,
      criteria,
      extractedCriteria,
      queries,
      mode,
      result,
      shortlist: [...shortlist],
      notes,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore quota
    }
  }, [
    hydrated,
    step,
    roleTitle,
    jobDescription,
    criteria,
    extractedCriteria,
    queries,
    mode,
    result,
    shortlist,
    notes,
  ]);

  async function persistSnapshot(nextResult?: TalentSearchResult | null) {
    const snapshotResult = nextResult === undefined ? result : nextResult;
    const payload = {
      roleTitle: roleTitle || criteria?.roleTitle || "Untitled search",
      jobDescription,
      criteria,
      extractedCriteria,
      queries,
      mode,
      result: snapshotResult,
      uiStep: step,
      shortlist: [...shortlist],
      notes,
    };

    setSaveBusy(true);
    try {
      if (searchId) {
        await updateTalentSearch(searchId, payload);
        setActionHint("Search saved on the server.");
      } else {
        const created = await createTalentSearch(payload);
        setSearchId(created.id);
        window.history.replaceState(
          null,
          "",
          `/talent/mapper?searchId=${created.id}`,
        );
        trackEvent("talent_search_saved");
        setActionHint("Search saved. Shortlist and notes will sync to this search.");
        localStorage.setItem(IMPORT_FLAG_KEY, "1");
        setImportOffer(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save search.");
    } finally {
      setSaveBusy(false);
    }
  }

  async function importBrowserDraft() {
    if (!importOffer) return;
    setSaveBusy(true);
    setError(null);
    try {
      applyPersisted(importOffer);
      const created = await createTalentSearch({
        roleTitle: importOffer.roleTitle || "Imported browser draft",
        jobDescription: importOffer.jobDescription,
        criteria: importOffer.criteria,
        extractedCriteria: importOffer.extractedCriteria,
        queries: importOffer.queries,
        mode: importOffer.mode,
        result: importOffer.result,
        uiStep: importOffer.step,
        shortlist: importOffer.shortlist,
        notes: importOffer.notes,
      });
      setSearchId(created.id);
      localStorage.setItem(IMPORT_FLAG_KEY, "1");
      setImportOffer(null);
      window.history.replaceState(null, "", `/talent/mapper?searchId=${created.id}`);
      setActionHint("Browser draft imported as a saved search.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setSaveBusy(false);
    }
  }

  function dismissImportOffer() {
    localStorage.setItem(IMPORT_FLAG_KEY, "1");
    if (importOffer) applyPersisted(importOffer);
    setImportOffer(null);
  }

  const selected = useMemo(
    () => result?.candidates.find((c) => c.authorId === selectedId) ?? null,
    [result, selectedId]
  );

  const filteredCandidates = useMemo(() => {
    if (!result) return [];
    let list = [...result.candidates];
    list = list.filter((c) => c.score >= minScore);
    if (filterTechnique) {
      const t = filterTechnique.toLowerCase();
      list = list.filter((c) =>
        c.matchedRequiredCriteria.some((m) => m.criterion.toLowerCase().includes(t))
      );
    }
    if (filterArea) {
      const t = filterArea.toLowerCase();
      list = list.filter((c) =>
        [...c.matchedResearchAreas, ...c.matchedOrganismsOrSystems].some((m) =>
          m.criterion.toLowerCase().includes(t)
        )
      );
    }
    if (filterInstitution) {
      const t = filterInstitution.toLowerCase();
      list = list.filter((c) =>
        (c.likelyInstitution?.name || "").toLowerCase().includes(t)
      );
    }
    if (filterCountry) {
      const t = filterCountry.toLowerCase();
      list = list.filter((c) =>
        (c.likelyInstitution?.countryCode || "").toLowerCase().includes(t)
      );
    }
    if (filterYear > 0) {
      list = list.filter(
        (c) => (c.mostRecentRelevantYear || 0) >= filterYear
      );
    }
    if (filterWorks > 0) {
      list = list.filter((c) => c.relevantWorkCount >= filterWorks);
    }
    if (filterOrcid) list = list.filter((c) => Boolean(c.orcid));
    if (filterShortlisted) list = list.filter((c) => shortlist.has(c.authorId));

    list.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "institution")
        return (a.likelyInstitution?.name || "").localeCompare(
          b.likelyInstitution?.name || ""
        );
      if (sortBy === "works") return b.relevantWorkCount - a.relevantWorkCount;
      if (sortBy === "recent")
        return (b.mostRecentRelevantYear || 0) - (a.mostRecentRelevantYear || 0);
      return b.score - a.score;
    });
    return list;
  }, [
    result,
    minScore,
    filterTechnique,
    filterArea,
    filterInstitution,
    filterCountry,
    filterYear,
    filterWorks,
    filterOrcid,
    filterShortlisted,
    shortlist,
    sortBy,
  ]);

  const loadDemo = useCallback(() => {
    const demo = getDemoCriteria();
    setRoleTitle(demo.roleTitle);
    setJobDescription(SCIENTIFIC_DEMO_JD);
    setCriteria(demo);
    setExtractedCriteria(demo);
    setQueries(buildSearchQueries(demo));
    setMode("demo");
    setError(null);
    setActionHint("Demo criteria loaded. Review them, then continue to search strategy.");
    setTalkingOpen(true);
    setStep("criteria");
  }, []);

  const resetDemo = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSearchId(null);
    setImportOffer(null);
    setStep("role");
    setRoleTitle("");
    setJobDescription("");
    setCriteria(null);
    setExtractedCriteria(null);
    setQueries([]);
    setResult(null);
    setShortlist(new Set());
    setNotes({});
    setSelectedId(null);
    setError(null);
    setActionHint(null);
    setMinScore(0);
    window.history.replaceState(null, "", "/talent/mapper");
  }, []);

  async function extractCriteria() {
    if (!jobDescription.trim()) {
      setError("Empty job description.");
      setActionHint("Paste a role description, or load the scientific sourcing demo.");
      return;
    }
    setBusy(true);
    setError(null);
    setActionHint(null);
    try {
      const res = await fetch("/api/talent-mapper/extract-criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, roleTitle }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Extraction failed.");
        setActionHint(data.action || null);
        return;
      }
      setCriteria(data.criteria);
      setExtractedCriteria(data.criteria);
      setQueries(data.queries || buildSearchQueries(data.criteria));
      if (data.warning) setActionHint(data.warning);
      setStep("criteria");
    } catch {
      setError("Could not extract criteria.");
      setActionHint("Check your connection, or load the scientific sourcing demo.");
    } finally {
      setBusy(false);
    }
  }

  async function runSearch() {
    if (!criteria) return;
    const enabled = queries.filter((q) => q.enabled);
    if (enabled.length === 0) {
      setError("No enabled queries.");
      setActionHint("Enable or add at least one search query.");
      return;
    }
    setBusy(true);
    setError(null);
    setActionHint(null);
    try {
      const res = await fetch("/api/talent-mapper/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ criteria, queries, mode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Search failed.");
        setActionHint(data.action || null);
        return;
      }
      setResult(data as TalentSearchResult);
      setStep("results");
      void persistSnapshot(data as TalentSearchResult);
    } catch {
      setError("Search request failed.");
      setActionHint("Retry, or switch to Demo snapshot.");
    } finally {
      setBusy(false);
    }
  }

  function updateList(
    group: CriterionGroup,
    updater: (items: string[]) => string[]
  ) {
    setCriteria((prev) => {
      if (!prev) return prev;
      return { ...prev, [group]: updater(prev[group]) };
    });
  }

  function moveCriterion(
    from: "requiredTechniques" | "preferredTechniques",
    to: "requiredTechniques" | "preferredTechniques",
    value: string
  ) {
    setCriteria((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [from]: prev[from].filter((x) => x !== value),
        [to]: prev[to].includes(value) ? prev[to] : [...prev[to], value],
      };
    });
  }

  function toggleShortlist(id: string) {
    setShortlist((prev) => {
      const next = new Set(prev);
      const willAdd = !next.has(id);
      if (willAdd) next.add(id);
      else next.delete(id);

      if (searchId) {
        void toggleTalentShortlist(searchId, id, willAdd).catch(() => {
          setError("Could not sync shortlist to the server.");
        });
      }

      return next;
    });
  }

  function handleNotesChange(authorId: string, value: string) {
    setNotes((prev) => ({ ...prev, [authorId]: value }));
    if (!searchId) return;
    if (noteTimers.current[authorId]) {
      clearTimeout(noteTimers.current[authorId]);
    }
    noteTimers.current[authorId] = setTimeout(() => {
      void upsertTalentNote(searchId, authorId, value).catch(() => {
        setError("Could not sync note to the server.");
      });
    }, 600);
  }

  function exportCsv() {
    if (!result) return;
    const selectedCandidates = result.candidates.filter((c) =>
      shortlist.has(c.authorId)
    );
    if (selectedCandidates.length === 0) {
      setError("CSV export with no shortlisted candidates.");
      setActionHint("Shortlist at least one potential researcher, then export.");
      return;
    }
    const withNotes: ResearcherCandidate[] = selectedCandidates.map((c) => ({
      ...c,
      recruiterNotes: notes[c.authorId] || "",
    }));
    const csv = exportShortlistCsv(withNotes, {
      searchMode: result.meta.mode,
      roleTitle: result.meta.roleTitle,
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `talent-mapper-shortlist-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setError(null);
    setActionHint(null);
  }

  const chip = (
    label: string,
    onRemove: () => void,
    onMove?: () => void,
    moveLabel?: string,
    key?: string,
  ) => (
    <span
      key={key ?? label}
      className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700"
    >
      {label}
      {onMove && (
        <button type="button" onClick={onMove} className="text-[10px] text-brand-600">
          {moveLabel}
        </button>
      )}
      <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="text-zinc-400 hover:text-rose-500">
        ×
      </button>
    </span>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <header className="mb-8 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          ResumeX module
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          ResumeX Talent Mapper
        </h1>
        <p className="max-w-2xl text-base text-zinc-600">
          Find potential candidates through public evidence of their work.
        </p>
        <p className="text-sm text-zinc-500">
          Built for research-intensive and hard-to-fill searches.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={loadDemo}
            className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500"
          >
            Load scientific sourcing demo
          </button>
          <button
            type="button"
            onClick={() => void persistSnapshot()}
            disabled={saveBusy || (!roleTitle.trim() && !criteria)}
            className="rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800 disabled:opacity-50"
          >
            {saveBusy ? "Saving…" : searchId ? "Save updates" : "Save search"}
          </button>
          <Link
            href="/talent/searches"
            className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-600"
          >
            Saved searches
          </Link>
          <button
            type="button"
            onClick={resetDemo}
            className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-600"
          >
            Reset demo
          </button>
        </div>
        {searchId ? (
          <p className="text-xs text-zinc-500">
            Server search active · shortlist and notes sync automatically
          </p>
        ) : null}
      </header>

      {importOffer ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
          <p className="font-medium">Import browser draft as a saved search?</p>
          <p className="mt-1 text-amber-900/80">
            This browser has a Talent Mapper draft
            {importOffer.shortlist.length
              ? ` with ${importOffer.shortlist.length} shortlisted`
              : ""}
            . Importing moves it to the server (recommended). Skipping keeps it as
            local cache only.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saveBusy}
              onClick={() => void importBrowserDraft()}
              className="rounded-full bg-amber-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              Import as saved search
            </button>
            <button
              type="button"
              onClick={dismissImportOffer}
              className="rounded-full border border-amber-300 px-4 py-2 text-xs font-medium"
            >
              Keep local only
            </button>
          </div>
        </div>
      ) : null}

      <div className="mb-6 space-y-3">
        <HowItWorks />
        <WhyTalentMapper open={whyOpen} onToggle={() => setWhyOpen((v) => !v)} />
        <DemoTalkingPoints open={talkingOpen} onToggle={() => setTalkingOpen((v) => !v)} />
      </div>

      <nav className="mb-6 flex flex-wrap gap-2 text-xs font-medium" aria-label="Talent Mapper steps">
        {(
          [
            ["role", "1. Role"],
            ["criteria", "2. Criteria"],
            ["strategy", "3. Strategy"],
            ["results", "4. Results"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              if (id === "role") setStep("role");
              if (id === "criteria" && criteria) setStep("criteria");
              if (id === "strategy" && criteria) setStep("strategy");
              if (id === "results" && result) setStep("results");
            }}
            className={`rounded-full px-3 py-1.5 ${
              step === id
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <p className="font-medium">{error}</p>
          {actionHint && <p className="mt-1 opacity-90">{actionHint}</p>}
        </div>
      )}
      {!error && actionHint && (
        <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-950">
          <p>{actionHint}</p>
        </div>
      )}

      {step === "role" && (
        <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-zinc-900">Enter a role</h2>
          <p className="text-sm text-zinc-500">{SCIENTIFIC_DEMO_LABEL}</p>
          <div>
            <label htmlFor="role-title" className="text-xs font-medium text-zinc-500">
              Role title
            </label>
            <input
              id="role-title"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
              placeholder="e.g. Scientist — Virology and Experimental Biology"
            />
          </div>
          <div>
            <label htmlFor="jd" className="text-xs font-medium text-zinc-500">
              Job description
            </label>
            <textarea
              id="jd"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={14}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm leading-relaxed"
              placeholder="Paste a complete job description…"
            />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={extractCriteria}
            className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Extracting…" : "Extract sourcing criteria"}
          </button>
        </section>
      )}

      {step === "criteria" && criteria && (
        <section className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">
                Review sourcing criteria
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Review these criteria before searching. Scientific terminology is nuanced, and the
                recruiter remains responsible for the final search strategy.
              </p>
            </div>
            <button
              type="button"
              onClick={() => extractedCriteria && setCriteria(extractedCriteria)}
              className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs"
            >
              Reset to extracted
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-zinc-500" htmlFor="crit-title">
                Role title
              </label>
              <input
                id="crit-title"
                value={criteria.roleTitle}
                onChange={(e) => setCriteria({ ...criteria, roleTitle: e.target.value })}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500" htmlFor="crit-year">
                Publication year from
              </label>
              <input
                id="crit-year"
                type="number"
                value={criteria.publicationYearFrom ?? ""}
                onChange={(e) =>
                  setCriteria({
                    ...criteria,
                    publicationYearFrom: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-500" htmlFor="crit-summary">
              Role summary
            </label>
            <textarea
              id="crit-summary"
              value={criteria.roleSummary}
              onChange={(e) => setCriteria({ ...criteria, roleSummary: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>

          {(Object.keys(GROUP_LABELS) as CriterionGroup[]).map((group) => (
            <div key={group}>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {GROUP_LABELS[group]}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {criteria[group].map((item) =>
                  chip(
                    item,
                    () => updateList(group, (items) => items.filter((x) => x !== item)),
                    group === "requiredTechniques"
                      ? () => moveCriterion("requiredTechniques", "preferredTechniques", item)
                      : group === "preferredTechniques"
                        ? () => moveCriterion("preferredTechniques", "requiredTechniques", item)
                        : undefined,
                    group === "requiredTechniques"
                      ? "→ preferred"
                      : group === "preferredTechniques"
                        ? "→ required"
                        : undefined,
                    `${group}:${item}`,
                  )
                )}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={newCriterion[group] || ""}
                  onChange={(e) =>
                    setNewCriterion((prev) => ({ ...prev, [group]: e.target.value }))
                  }
                  placeholder={`Add ${GROUP_LABELS[group].toLowerCase()}…`}
                  className="flex-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const v = (newCriterion[group] || "").trim();
                      if (!v) return;
                      updateList(group, (items) =>
                        items.includes(v) ? items : [...items, v]
                      );
                      setNewCriterion((prev) => ({ ...prev, [group]: "" }));
                    }
                  }}
                />
                <button
                  type="button"
                  className="rounded-lg border border-zinc-200 px-3 text-xs"
                  onClick={() => {
                    const v = (newCriterion[group] || "").trim();
                    if (!v) return;
                    updateList(group, (items) =>
                      items.includes(v) ? items : [...items, v]
                    );
                    setNewCriterion((prev) => ({ ...prev, [group]: "" }));
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          ))}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Geography
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-4">
              {(["city", "region", "country"] as const).map((field) => (
                <input
                  key={field}
                  aria-label={field}
                  value={criteria.location[field] || ""}
                  onChange={(e) =>
                    setCriteria({
                      ...criteria,
                      location: { ...criteria.location, [field]: e.target.value },
                    })
                  }
                  placeholder={field}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm capitalize"
                />
              ))}
              <label className="flex items-center gap-2 text-sm text-zinc-600">
                <input
                  type="checkbox"
                  checked={Boolean(criteria.location.remoteAllowed)}
                  onChange={(e) =>
                    setCriteria({
                      ...criteria,
                      location: {
                        ...criteria.location,
                        remoteAllowed: e.target.checked,
                      },
                    })
                  }
                />
                Remote allowed
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setQueries(buildSearchQueries(criteria));
                setStep("strategy");
              }}
              className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Continue to search strategy
            </button>
            <button
              type="button"
              onClick={() => setStep("role")}
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm"
            >
              Back
            </button>
          </div>
        </section>
      )}

      {step === "strategy" && criteria && (
        <section className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-zinc-900">
            Search strategy
          </h2>
          <p className="text-sm text-zinc-500">
            Enable 4–8 focused queries. Talent Mapper will not send one enormous query
            containing every term.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-zinc-500">Search mode</span>
            <div className="flex rounded-full border border-zinc-200 p-0.5">
              <button
                type="button"
                onClick={() => setMode("demo")}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  mode === "demo"
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600"
                }`}
              >
                Demo snapshot
              </button>
              <button
                type="button"
                onClick={() => setMode("live")}
                disabled={!openAlexConfigured}
                title={
                  openAlexConfigured
                    ? "Live OpenAlex search"
                    : "Add OPENALEX_API_KEY to enable live search"
                }
                className={`rounded-full px-3 py-1.5 text-xs font-medium disabled:opacity-40 ${
                  mode === "live"
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600"
                }`}
              >
                Live OpenAlex search
              </button>
            </div>
            {!openAlexConfigured && (
              <div className="w-full rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
                Live OpenAlex search needs <code className="font-mono">OPENALEX_API_KEY</code>{" "}
                (free at openalex.org/settings/api). For interviews, use{" "}
                <strong>Demo snapshot</strong> — it is deterministic and does not call the network.
              </div>
            )}
            {openAlexConfigured && (
              <span className="text-xs text-emerald-700">
                Live OpenAlex search is configured. Demo snapshot remains available as a fallback.
              </span>
            )}
          </div>

          <ul className="space-y-3">
            {queries.map((q, idx) => (
              <li
                key={q.id}
                className="flex flex-wrap items-start gap-2 rounded-xl border border-zinc-100 p-3"
              >
                <input
                  type="checkbox"
                  checked={q.enabled}
                  onChange={(e) =>
                    setQueries((prev) =>
                      prev.map((item, i) =>
                        i === idx ? { ...item, enabled: e.target.checked } : item
                      )
                    )
                  }
                  aria-label={`Enable query ${q.label}`}
                  className="mt-2"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                      {q.group === "core" ? "Core technique searches" : "Adjacent searches"}
                    </span>
                    <span className="text-xs text-zinc-500">{q.label}</span>
                  </div>
                  <input
                    value={q.query}
                    onChange={(e) =>
                      setQueries((prev) =>
                        prev.map((item, i) =>
                          i === idx
                            ? {
                                ...item,
                                query: e.target.value,
                                id: hashQueryId(e.target.value),
                              }
                            : item
                        )
                      )
                    }
                    className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 font-mono text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setQueries((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-xs text-zinc-400 hover:text-rose-500"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() =>
              setQueries((prev) => [
                ...prev,
                {
                  id: hashQueryId(`custom-${prev.length}`),
                  label: "Custom query",
                  group: "adjacent",
                  query: "",
                  enabled: true,
                },
              ])
            }
            className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs"
          >
            Add query
          </button>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={runSearch}
              className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Searching…" : mode === "live" ? "Run live search" : "Run demo snapshot"}
            </button>
            <button
              type="button"
              onClick={() => setStep("criteria")}
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm"
            >
              Back
            </button>
          </div>
        </section>
      )}

      {step === "results" && result && (
        <section className="space-y-5">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  {result.meta.roleTitle}
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  {result.meta.uniqueResearchers} potential researchers identified from{" "}
                  {result.meta.worksReviewed} public works
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Mode:{" "}
                  <span className="font-semibold">
                    {result.meta.mode === "live" ? "Live OpenAlex search" : "Demo snapshot"}
                  </span>
                  {" · "}
                  Shortlisted: {shortlist.size}
                  {" · "}
                  {new Date(result.meta.searchedAt).toLocaleString()}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  Queries: {result.meta.queriesUsed.join(" · ") || "—"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={exportCsv}
                  className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium"
                >
                  Export shortlist CSV
                </button>
                <button
                  type="button"
                  onClick={() => setStep("strategy")}
                  className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs"
                >
                  Adjust strategy
                </button>
              </div>
            </div>
            <Disclaimer className="mt-4">{result.meta.disclaimer}</Disclaimer>
            {result.meta.warnings.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-amber-800">
                {result.meta.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs text-zinc-500">
                Min relevance score
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5"
                />
              </label>
              <label className="text-xs text-zinc-500">
                Required technique
                <input
                  value={filterTechnique}
                  onChange={(e) => setFilterTechnique(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5"
                />
              </label>
              <label className="text-xs text-zinc-500">
                Research area
                <input
                  value={filterArea}
                  onChange={(e) => setFilterArea(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5"
                />
              </label>
              <label className="text-xs text-zinc-500">
                Institution
                <input
                  value={filterInstitution}
                  onChange={(e) => setFilterInstitution(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5"
                />
              </label>
              <label className="text-xs text-zinc-500">
                Country
                <input
                  value={filterCountry}
                  onChange={(e) => setFilterCountry(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5"
                />
              </label>
              <label className="text-xs text-zinc-500">
                Most recent year ≥
                <input
                  type="number"
                  value={filterYear || ""}
                  onChange={(e) => setFilterYear(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5"
                />
              </label>
              <label className="text-xs text-zinc-500">
                Min relevant works
                <input
                  type="number"
                  value={filterWorks || ""}
                  onChange={(e) => setFilterWorks(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5"
                />
              </label>
              <label className="text-xs text-zinc-500">
                Sort by
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as typeof sortBy)
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5"
                >
                  <option value="score">Research relevance</option>
                  <option value="recent">Most recent relevant work</option>
                  <option value="works">Number of relevant works</option>
                  <option value="name">Name</option>
                  <option value="institution">Institution</option>
                </select>
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-600">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filterOrcid}
                  onChange={(e) => setFilterOrcid(e.target.checked)}
                />
                Has ORCID
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filterShortlisted}
                  onChange={(e) => setFilterShortlisted(e.target.checked)}
                />
                Shortlisted only
              </label>
            </div>
          </div>

          {busy && (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-48 animate-pulse rounded-2xl bg-zinc-100"
                />
              ))}
            </div>
          )}

          {!busy && filteredCandidates.length === 0 && (
            <div className="rounded-2xl border border-dashed border-zinc-300 px-6 py-12 text-center">
              <p className="font-medium text-zinc-800">
                No potential researchers match these filters.
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Lower the minimum score, clear a filter, or broaden the search strategy.
              </p>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {filteredCandidates.map((c) => (
              <CandidateCard
                key={c.authorId}
                candidate={c}
                shortlisted={shortlist.has(c.authorId)}
                onToggleShortlist={() => toggleShortlist(c.authorId)}
                onView={() => {
                  setFocusOutreach(false);
                  setSelectedId(c.authorId);
                }}
                onOutreach={() => {
                  setFocusOutreach(true);
                  setSelectedId(c.authorId);
                }}
              />
            ))}
          </div>
        </section>
      )}

      {selected && (
        <CandidateDetail
          candidate={selected}
          roleTitle={result?.meta.roleTitle || roleTitle}
          shortlisted={shortlist.has(selected.authorId)}
          notes={notes[selected.authorId] || ""}
          onNotesChange={(v) => handleNotesChange(selected.authorId, v)}
          onToggleShortlist={() => toggleShortlist(selected.authorId)}
          onClose={() => setSelectedId(null)}
          focusOutreach={focusOutreach}
        />
      )}
    </div>
  );
}
