"use client";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export function Disclaimer({ children, className = "" }: Props) {
  return (
    <div
      className={`rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 ${className}`}
      role="note"
    >
      {children}
    </div>
  );
}

export function HowItWorks() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-700">
      <p className="font-semibold text-zinc-900">How Talent Mapper works</p>
      <p className="mt-1 leading-relaxed">
        Talent Mapper searches public scholarly metadata, groups relevant works by
        researcher and highlights the evidence connecting each researcher to the
        role. Results require recruiter validation and do not indicate availability
        or employment eligibility.
      </p>
    </div>
  );
}

export function WhyTalentMapper({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-xl border border-zinc-200">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-zinc-800"
        aria-expanded={open}
      >
        Why Talent Mapper?
        <span className="text-zinc-400">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="border-t border-zinc-100 px-4 py-3 text-sm text-zinc-600">
          <p>
            Hard-to-fill scientific searches often begin outside traditional recruiting
            platforms. Relevant researchers can be discovered through papers,
            laboratories, institutions and collaboration networks. Talent Mapper turns
            that public evidence into an explainable recruiter workflow.
          </p>
        </div>
      )}
    </div>
  );
}

export function DemoTalkingPoints({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-zinc-500"
        aria-expanded={open}
      >
        Demo talking points
        <span>{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <ol className="space-y-1.5 border-t border-zinc-100 px-4 py-3 text-sm text-zinc-600">
          <li>1. Starts from scientific evidence instead of job titles.</li>
          <li>2. Makes every recommendation explainable through public works.</li>
          <li>3. Keeps the recruiter in control of criteria and outreach.</li>
          <li>4. Works without LinkedIn Recruiter.</li>
          <li>5. Uses AI for synthesis, not automatic hiring decisions.</li>
          <li>6. Demo snapshot is deterministic — no OpenAlex key required for the pitch.</li>
          <li>7. Scores are research relevance to criteria, not hireability or employment status.</li>
        </ol>
      )}
    </div>
  );
}
