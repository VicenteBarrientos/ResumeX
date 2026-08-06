import { describe, expect, it } from "vitest";
import { getCapabilityMatrix, providerSupports } from "../capabilities";
import {
  buildAtsEvidenceFields,
  buildAtsEvidenceHtml,
  buildAtsEvidencePlainText,
  escapeAtsHtml,
} from "../evidence";
import { buildAtsTransferIdempotencyKey } from "../idempotency";
import {
  canAutoReuseMatch,
  resolveDuplicateDecision,
  sortCandidateMatches,
} from "../duplicates";
import type { AtsCandidateMatch, AtsEvidencePayload } from "../types";
import { assertAllowedBaseUrl } from "../http";
import {
  assertZohoApiDomain,
  zohoApiDomainForLocation,
  zohoScopeString,
} from "../providers/zoho/domains";
import { escapeZohoCriteriaValue } from "../providers/zoho/domains";
import { splitCandidateName } from "../providers/zoho/normalize";
import { verifyRecruiteeSignature } from "../providers/recruitee/webhook";
import { verifyAshbySignature } from "../providers/ashby/webhook";
import { createHmac } from "crypto";
import { createDemoAshbyAdapter } from "../providers/ashby/demo-adapter";
import { normalizeRecruiteeOffer } from "../providers/recruitee/normalize";
import { ashbyBasicAuthHeader } from "../providers/ashby/client";
import { runAdapterTransferSaga } from "../transfer";
import type { AtsCandidateDraft } from "../types";

const evidence: AtsEvidencePayload = {
  generatedAt: "2026-08-05T12:00:00.000Z",
  sourceProduct: "ResumeX Talent Mapper",
  relevanceLabel: "strong research overlap",
  relevanceScore: 86,
  directEvidence: [
    {
      criterion: "Viral rescue",
      explanation: "Coauthored a 2025 publication describing a viral-rescue workflow.",
      sourceTitle: "Rescue of X",
      sourceYear: 2025,
    },
  ],
  adjacentEvidence: [],
  unknowns: ["Current employment", "Work authorization"],
  publicProfileUrls: ["https://openalex.org/A1"],
  likelyInstitution: "Harvard Medical School",
};

describe("capability matrix", () => {
  it("does not claim Recruitee add_note", () => {
    expect(providerSupports("recruitee", "add_note")).toBe(false);
    expect(providerSupports("recruitee", "write_custom_fields")).toBe(true);
  });

  it("does not claim Zoho webhooks yet", () => {
    expect(providerSupports("zoho-recruit", "receive_webhooks")).toBe(false);
  });

  it("exposes ashby incremental sync", () => {
    expect(getCapabilityMatrix().ashby.incremental_sync).toBe(true);
  });
});

describe("evidence builder", () => {
  it("builds plain text without claiming score as quality", () => {
    const text = buildAtsEvidencePlainText(evidence);
    expect(text).toContain("Research relevance: 86/100");
    expect(text).toContain("not hiring fitness");
    expect(text).toContain("Viral rescue");
    expect(text).not.toContain("candidate quality score");
  });

  it("escapes HTML", () => {
    expect(escapeAtsHtml(`<script>alert("x")</script>`)).toContain("&lt;script&gt;");
    const html = buildAtsEvidenceHtml({
      ...evidence,
      unknowns: ['<img src=x onerror=alert(1)>'],
    });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("truncates with a visible note", () => {
    const long = buildAtsEvidencePlainText(evidence, { maxLength: 80 });
    expect(long).toContain("Truncated by ResumeX");
  });

  it("builds field map", () => {
    const fields = buildAtsEvidenceFields(evidence);
    expect(fields.source).toBe("ResumeX Talent Mapper");
    expect(fields.relevanceScore).toBe(86);
  });
});

describe("duplicates", () => {
  const exact: AtsCandidateMatch = {
    externalCandidateId: "1",
    name: "Dr. Maya Testwell",
    emails: ["maya.testwell@example.invalid"],
    confidence: "exact_email",
    reasons: ["Exact email match"],
    existingJobAssociations: [],
  };
  const nameOnly: AtsCandidateMatch = {
    externalCandidateId: "2",
    name: "Maya Testwell",
    emails: [],
    confidence: "name_only",
    reasons: ["Name only"],
    existingJobAssociations: [],
  };

  it("never auto-reuses name-only", () => {
    expect(canAutoReuseMatch(nameOnly)).toBe(false);
    expect(canAutoReuseMatch(exact)).toBe(true);
  });

  it("sorts exact before name-only", () => {
    const sorted = sortCandidateMatches([nameOnly, exact]);
    expect(sorted[0].confidence).toBe("exact_email");
  });

  it("requires choice when no email", () => {
    const d = resolveDuplicateDecision([], false);
    expect(d.requiresRecruiterChoice).toBe(true);
  });
});

describe("idempotency", () => {
  it("is stable for the same inputs", () => {
    const a = buildAtsTransferIdempotencyKey({
      connectionId: "c1",
      localCandidateKey: "A1",
      externalJobId: "j1",
    });
    const b = buildAtsTransferIdempotencyKey({
      connectionId: "c1",
      localCandidateKey: "A1",
      externalJobId: "j1",
    });
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });
});

describe("HTTP allowlist", () => {
  it("blocks arbitrary base URLs", () => {
    expect(() => assertAllowedBaseUrl("ashby", "https://evil.example")).toThrow(
      /allowlisted/
    );
  });
});

describe("Zoho domains and criteria", () => {
  it("maps EU location", () => {
    expect(zohoApiDomainForLocation("eu")).toBe("https://www.zohoapis.eu");
  });

  it("rejects non-allowlisted API domain", () => {
    expect(() => assertZohoApiDomain("https://evil.example")).toThrow();
  });

  it("escapes criteria values", () => {
    expect(escapeZohoCriteriaValue('a"b')).toContain('\\"');
  });

  it("splits names with Last_Name fallback", () => {
    expect(splitCandidateName("Madonna")).toEqual({
      firstName: "Madonna",
      lastName: "Unknown",
    });
  });

  it("lists minimum scopes without delete", () => {
    const scopes = zohoScopeString();
    expect(scopes).toContain("ZohoRecruit.modules.CREATE");
    expect(scopes).toContain("ZohoRecruit.settings.READ");
    expect(scopes).not.toContain("DELETE");
    expect(scopes).not.toContain("candidates.");
  });
});

describe("webhook signatures", () => {
  it("verifies Recruitee HMAC", () => {
    const body = '{"event":"candidate_moved"}';
    const secret = "whsec-test";
    const sig = createHmac("sha256", secret).update(body, "utf8").digest("hex");
    expect(
      verifyRecruiteeSignature({
        rawBody: body,
        signatureHeader: sig,
        secret,
      })
    ).toBe(true);
    expect(
      verifyRecruiteeSignature({
        rawBody: body,
        signatureHeader: "deadbeef",
        secret,
      })
    ).toBe(false);
  });

  it("verifies Ashby sha256= header", () => {
    const body = '{"action":"ping"}';
    const secret = "ashby-secret";
    const digest = createHmac("sha256", secret).update(body, "utf8").digest("hex");
    expect(
      verifyAshbySignature({
        rawBody: body,
        signatureHeader: `sha256=${digest}`,
        secret,
      })
    ).toBe(true);
  });
});

describe("Recruitee normalize", () => {
  it("excludes talent pools", () => {
    expect(
      normalizeRecruiteeOffer({
        id: 1,
        title: "Pool",
        kind: "talent_pool",
        status: "published",
      })
    ).toBeNull();
  });

  it("maps published jobs to open", () => {
    const job = normalizeRecruiteeOffer({
      id: 2,
      title: "Scientist",
      kind: "job",
      status: "published",
    });
    expect(job?.status).toBe("open");
  });
});

describe("Ashby auth header", () => {
  it("uses basic auth with empty password", () => {
    const header = ashbyBasicAuthHeader("key123");
    expect(header.startsWith("Basic ")).toBe(true);
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    expect(decoded).toBe("key123:");
  });
});

describe("DemoAshbyAdapter contract", () => {
  it("performs transfer without network and lists demo jobs", async () => {
    const adapter = createDemoAshbyAdapter();
    const jobs = await adapter.listJobs();
    expect(jobs.jobs.length).toBeGreaterThan(0);

    const draft: AtsCandidateDraft = {
      localCandidateKey: "demo-A1",
      name: "Dr. Maya Testwell",
      email: "other@example.invalid",
      sourceLabel: "ResumeX Talent Mapper",
      evidence,
    };

    const result = await runAdapterTransferSaga(adapter, {
      candidate: draft,
      externalJobId: jobs.jobs[0].id,
    });
    expect(result.externalCandidateId).toMatch(/^demo-cand-/);
    expect(result.completedOperations).toContain("add_evidence");
  });

  it("finds exact email duplicate fixture", async () => {
    const adapter = createDemoAshbyAdapter();
    const matches = await adapter.searchCandidates({
      name: "Maya",
      email: "maya.testwell@example.invalid",
    });
    expect(matches[0]?.confidence).toBe("exact_email");
  });
});
