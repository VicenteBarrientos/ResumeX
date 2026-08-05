import type {
  TalentSearchDetail,
  TalentSearchSummary,
  TalentSearchWriteInput,
} from "@/lib/talent-mapper/search-store";

export async function listTalentSearches(): Promise<TalentSearchSummary[]> {
  const res = await fetch("/api/talent-mapper/searches");
  if (!res.ok) {
    throw new Error("Failed to load saved searches.");
  }
  const data = (await res.json()) as { searches: TalentSearchSummary[] };
  return data.searches;
}

export async function getTalentSearch(id: string): Promise<TalentSearchDetail> {
  const res = await fetch(`/api/talent-mapper/searches/${id}`);
  if (!res.ok) {
    throw new Error("Search not found.");
  }
  const data = (await res.json()) as { search: TalentSearchDetail };
  return data.search;
}

export async function createTalentSearch(
  input: TalentSearchWriteInput,
): Promise<TalentSearchSummary> {
  const res = await fetch("/api/talent-mapper/searches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || "Failed to save search.");
  }
  const data = (await res.json()) as { search: TalentSearchSummary };
  return data.search;
}

export async function updateTalentSearch(
  id: string,
  input: TalentSearchWriteInput,
): Promise<TalentSearchDetail> {
  const res = await fetch(`/api/talent-mapper/searches/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || "Failed to update search.");
  }
  const data = (await res.json()) as { search: TalentSearchDetail };
  return data.search;
}

export async function deleteTalentSearch(id: string): Promise<void> {
  const res = await fetch(`/api/talent-mapper/searches/${id}`, { method: "DELETE" });
  if (!res.ok) {
    throw new Error("Failed to delete search.");
  }
}

export async function toggleTalentShortlist(
  searchId: string,
  authorId: string,
  shortlisted: boolean,
): Promise<string[]> {
  const res = await fetch(`/api/talent-mapper/searches/${searchId}/shortlist`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ authorId, shortlisted }),
  });
  if (!res.ok) {
    throw new Error("Failed to update shortlist.");
  }
  const data = (await res.json()) as { shortlist: string[] };
  return data.shortlist;
}

export async function upsertTalentNote(
  searchId: string,
  authorId: string,
  body: string,
): Promise<void> {
  const res = await fetch(
    `/api/talent-mapper/searches/${searchId}/notes/${encodeURIComponent(authorId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    },
  );
  if (!res.ok) {
    throw new Error("Failed to save note.");
  }
}
