"use client";

import { useCallback, useEffect, useState } from "react";
import type { AtsConnectionSummary, AtsProvider } from "@/lib/ats/types";

const PROVIDER_META: Record<
  AtsProvider,
  { name: string; description: string; connectHint: string }
> = {
  recruitee: {
    name: "Recruitee",
    description: "Personal API token + company ID or subdomain.",
    connectHint:
      "Recruitee personal API tokens inherit the permissions of the user who created them. Create the token from a dedicated test or integration user whenever possible.",
  },
  "zoho-recruit": {
    name: "Zoho Recruit",
    description: "OAuth 2.0 connect (multi-data-center).",
    connectHint: "You will be redirected to Zoho to authorize ResumeX.",
  },
  ashby: {
    name: "Ashby",
    description: "API key (live) or Demo Mode without credentials.",
    connectHint:
      "Required permissions: jobsRead, candidatesRead, candidatesWrite. Optional: hiringProcessMetadataRead, organizationRead.",
  },
};

function statusLabel(c: AtsConnectionSummary): string {
  if (c.mode === "demo") return "Demo Mode";
  switch (c.status) {
    case "connected":
      return "Connected";
    case "needs_reauthentication":
      return "Needs reauthentication";
    case "permission_error":
      return "Missing permission";
    case "configuration_error":
      return "Configuration incomplete";
    case "temporarily_unavailable":
      return "Temporarily unavailable";
    case "disconnected":
      return "Disconnected";
  }
}

export default function AtsIntegrationsClient() {
  const [connections, setConnections] = useState<AtsConnectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const zoho = new URLSearchParams(window.location.search).get("zoho");
    if (zoho === "connected") return "Zoho Recruit connected.";
    if (zoho === "denied") return "Zoho authorization was denied.";
    if (zoho === "error") return "Zoho connection failed. Try again.";
    return null;
  });
  const [history, setHistory] = useState<
    { id: string; candidateName: string; status: string; createdAt: string; externalJobId: string }[]
  >([]);
  const [historyConnectionId, setHistoryConnectionId] = useState<string | null>(null);

  // Recruitee form
  const [rtName, setRtName] = useState("Recruitee");
  const [rtCompany, setRtCompany] = useState("");
  const [rtToken, setRtToken] = useState("");
  const [rtWebhook, setRtWebhook] = useState("");

  // Ashby form
  const [ashName, setAshName] = useState("Ashby");
  const [ashKey, setAshKey] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/talent/integrations/ats");
      if (!res.ok) {
        setError("Could not load ATS connections. Sign in and try again.");
        return;
      }
      const data = await res.json();
      setConnections(data.connections || []);
    } catch {
      setError("Network error loading integrations.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load connections on mount.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/talent/integrations/ats");
        if (cancelled) return;
        if (!res.ok) {
          setError("Could not load ATS connections. Sign in and try again.");
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setConnections(data.connections || []);
      } catch {
        if (!cancelled) setError("Network error loading integrations.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function connectRecruitee(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/talent/integrations/ats/recruitee/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: rtName,
        companyIdOrSubdomain: rtCompany,
        token: rtToken,
        webhookSecret: rtWebhook || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error?.message || "Recruitee connect failed.");
      return;
    }
    setRtToken("");
    setRtWebhook("");
    setMessage(`Connected to Recruitee (${data.tokenHint || "token saved"}).`);
    await refresh();
  }

  async function connectAshbyLive(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/talent/integrations/ats/ashby/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: ashName,
        apiKey: ashKey,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error?.message || "Ashby connect failed.");
      return;
    }
    setAshKey("");
    setMessage(`Connected to Ashby (${data.apiKeyHint || "key saved"}).`);
    await refresh();
  }

  async function enableAshbyDemo() {
    setError(null);
    const res = await fetch("/api/talent/integrations/ats/ashby/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ demo: true, displayName: "Ashby Demo Mode" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error?.message || "Could not enable Demo Mode.");
      return;
    }
    setMessage("Ashby Demo Mode enabled — no external ATS data will be modified.");
    await refresh();
  }

  async function testConnection(id: string) {
    setError(null);
    const res = await fetch(`/api/talent/integrations/ats/${id}/test`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error?.message || "Connection test failed.");
      return;
    }
    setMessage(
      data.test?.ok
        ? `Test OK: ${data.test.accountName || "connected"}`
        : "Connection test returned warnings."
    );
    await refresh();
  }

  async function disconnect(id: string) {
    if (!confirm("Disconnect this ATS and remove local credentials?")) return;
    const res = await fetch(`/api/talent/integrations/ats/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError("Disconnect failed.");
      return;
    }
    setMessage("Disconnected. Local credentials removed.");
    await refresh();
  }

  async function loadHistory(id: string) {
    setHistoryConnectionId(id);
    const res = await fetch(`/api/talent/integrations/ats/${id}/transfers`);
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error?.message || "Could not load transfer history.");
      return;
    }
    setHistory(data.transfers || []);
  }

  const byProvider = (p: AtsProvider) =>
    connections.filter((c) => c.provider === p && c.status !== "disconnected");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
        ATS Integrations
      </h1>
      <p className="mt-2 max-w-2xl text-zinc-600">
        Send recruiter-reviewed candidates and evidence into your existing hiring
        system. ResumeX discovers and evaluates talent outside the ATS — the ATS
        remains the system of record.
      </p>

      {message && (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-zinc-500">Loading connections…</p>
      ) : (
        <div className="mt-8 space-y-8">
          {(Object.keys(PROVIDER_META) as AtsProvider[]).map((provider) => {
            const meta = PROVIDER_META[provider];
            const existing = byProvider(provider);
            return (
              <section
                key={provider}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                aria-labelledby={`ats-${provider}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 id={`ats-${provider}`} className="text-xl font-semibold text-zinc-900">
                      {meta.name}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-600">{meta.description}</p>
                    <p className="mt-2 text-xs text-zinc-500">{meta.connectHint}</p>
                  </div>
                </div>

                {existing.length > 0 && (
                  <ul className="mt-4 space-y-3">
                    {existing.map((c) => (
                      <li
                        key={c.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-3"
                      >
                        <div>
                          <p className="font-medium text-zinc-900">{c.displayName}</p>
                          <p className="text-xs text-zinc-600">
                            {statusLabel(c)}
                            {c.lastTestedAt
                              ? ` · last test ${new Date(c.lastTestedAt).toLocaleString()}`
                              : ""}
                          </p>
                          {c.configurationWarnings[0] && (
                            <p className="mt-1 text-xs text-amber-800">
                              {c.configurationWarnings[0]}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-zinc-500">
                            Capabilities: {c.capabilities.slice(0, 6).join(", ")}
                            {c.capabilities.length > 6 ? "…" : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-white"
                            onClick={() => void testConnection(c.id)}
                          >
                            Test
                          </button>
                          <button
                            type="button"
                            className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-white"
                            onClick={() => void loadHistory(c.id)}
                          >
                            Transfer history
                          </button>
                          <button
                            type="button"
                            className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                            onClick={() => void disconnect(c.id)}
                          >
                            Disconnect
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {provider === "recruitee" && (
                  <form
                    className="mt-4 space-y-3"
                    autoComplete="off"
                    onSubmit={(e) => void connectRecruitee(e)}
                  >
                    <label className="block text-sm">
                      <span className="text-zinc-700">Connection name</span>
                      <input
                        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                        value={rtName}
                        onChange={(e) => setRtName(e.target.value)}
                        autoComplete="off"
                        name="ats-recruitee-connection-name"
                        required
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-zinc-700">Company ID or subdomain</span>
                      <input
                        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                        value={rtCompany}
                        onChange={(e) => setRtCompany(e.target.value)}
                        autoComplete="off"
                        name="ats-recruitee-company"
                        required
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-zinc-700">Personal API token</span>
                      <input
                        type="password"
                        autoComplete="new-password"
                        name="ats-recruitee-token"
                        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                        value={rtToken}
                        onChange={(e) => setRtToken(e.target.value)}
                        required
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-zinc-700">Webhook secret (optional)</span>
                      <input
                        type="password"
                        autoComplete="new-password"
                        name="ats-recruitee-webhook-secret"
                        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                        value={rtWebhook}
                        onChange={(e) => setRtWebhook(e.target.value)}
                      />
                    </label>
                    <button
                      type="submit"
                      className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
                    >
                      Connect Recruitee
                    </button>
                  </form>
                )}

                {provider === "zoho-recruit" && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        window.location.assign(
                          "/api/talent/integrations/ats/zoho/connect"
                        );
                      }}
                      className="inline-flex rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
                    >
                      Connect Zoho Recruit
                    </button>
                  </div>
                )}

                {provider === "ashby" && (
                  <div className="mt-4 space-y-4">
                    <button
                      type="button"
                      onClick={() => void enableAshbyDemo()}
                      className="rounded-full border border-emerald-700 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
                    >
                      Try Demo Mode
                    </button>
                    <form
                      className="space-y-3"
                      autoComplete="off"
                      onSubmit={(e) => void connectAshbyLive(e)}
                    >
                      <label className="block text-sm">
                        <span className="text-zinc-700">Connection name</span>
                        <input
                          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                          value={ashName}
                          onChange={(e) => setAshName(e.target.value)}
                          autoComplete="off"
                          name="ats-ashby-connection-name"
                          required
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="text-zinc-700">API key</span>
                        <input
                          type="password"
                          autoComplete="new-password"
                          name="ats-ashby-api-key"
                          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                          value={ashKey}
                          onChange={(e) => setAshKey(e.target.value)}
                          required
                        />
                      </label>
                      <button
                        type="submit"
                        className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
                      >
                        Connect Ashby API key
                      </button>
                    </form>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {historyConnectionId && (
        <section className="mt-10" aria-labelledby="transfer-history">
          <h2 id="transfer-history" className="text-lg font-semibold text-zinc-900">
            Transfer history
          </h2>
          {history.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">No transfers yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
              {history.map((t) => (
                <li key={t.id} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-zinc-900">{t.candidateName}</p>
                    <p className="text-xs text-zinc-500">
                      Job {t.externalJobId} · {new Date(t.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-600">
                    {t.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
