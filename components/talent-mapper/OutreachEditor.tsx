"use client";

import { useState } from "react";
import CopyButton from "@/components/CopyButton";
import type { OutreachTone, ResearcherCandidate } from "@/lib/talent-mapper/types";

export default function OutreachEditor({
  candidate,
  roleTitle,
}: {
  candidate: ResearcherCandidate;
  roleTitle: string;
}) {
  const [tone, setTone] = useState<OutreachTone>("concise");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function draft() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/talent-mapper/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tone,
          roleTitle,
          candidate: {
            name: candidate.name,
            authorId: candidate.authorId,
            likelyInstitution: candidate.likelyInstitution,
            evidenceSummary: candidate.evidenceSummary,
            outreachAngle: candidate.outreachAngle,
            matchedRequiredCriteria: candidate.matchedRequiredCriteria.slice(0, 5),
            relevantWorks: candidate.relevantWorks.slice(0, 3).map((w) => ({
              title: w.title,
              year: w.year,
            })),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.action || data.error || "Could not draft outreach.");
        return;
      }
      setSubject(data.subject || "");
      setBody(data.body || "");
    } catch {
      setError("Network error while drafting outreach. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-medium text-zinc-500" htmlFor="outreach-tone">
          Tone
        </label>
        <select
          id="outreach-tone"
          value={tone}
          onChange={(e) => setTone(e.target.value as OutreachTone)}
          className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm"
        >
          <option value="concise">Concise</option>
          <option value="conversational">Conversational</option>
        </select>
        <button
          type="button"
          onClick={draft}
          disabled={loading}
          className="rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-500 disabled:opacity-60"
        >
          {loading ? "Drafting…" : body ? "Regenerate" : "Draft personalized outreach"}
        </button>
        {body && <CopyButton text={`${subject}\n\n${body}`} label="Copy" />}
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {body && (
        <>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            aria-label="Outreach subject"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
            placeholder="Subject"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            aria-label="Outreach body"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm leading-relaxed"
          />
          <p className="text-xs text-zinc-500">{body.length} characters</p>
        </>
      )}
    </div>
  );
}
