import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";
import { requireSession } from "@/lib/require-auth";

interface JobResult {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  salary?: string;
  source: string;
  postedAt?: string;
}

async function fetchAdzuna(query: string, country: string, page: string): Promise<JobResult[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];

  try {
    const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?app_id=${appId}&app_key=${appKey}&results_per_page=10&what=${encodeURIComponent(query)}&content-type=application/json`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results ?? []).map((j: Record<string, unknown>) => ({
      id: `adzuna-${j.id}`,
      title: j.title as string,
      company: (j.company as Record<string, string>)?.display_name ?? "Unknown",
      location: (j.location as Record<string, string>)?.display_name ?? "",
      description: ((j.description as string) ?? "").replace(/<[^>]+>/g, ""),
      url: j.redirect_url as string,
      salary: j.salary_min
        ? `$${Math.round((j.salary_min as number) / 1000)}k${j.salary_max ? ` – $${Math.round((j.salary_max as number) / 1000)}k` : "+"}`
        : undefined,
      source: "Adzuna",
      postedAt: j.created as string,
    }));
  } catch {
    return [];
  }
}

async function fetchJSearch(query: string): Promise<JobResult[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch(
      `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&num_pages=1&page=1`,
      {
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        },
        next: { revalidate: 300 },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data ?? []).slice(0, 10).map((j: Record<string, unknown>) => ({
      id: `jsearch-${j.job_id}`,
      title: j.job_title as string,
      company: j.employer_name as string,
      location: [j.job_city, j.job_state, j.job_country].filter(Boolean).join(", "),
      description: ((j.job_description as string) ?? "").slice(0, 300),
      url: (j.job_apply_link ?? j.job_google_link) as string,
      salary: j.job_min_salary
        ? `$${Math.round((j.job_min_salary as number) / 1000)}k${j.job_max_salary ? ` – $${Math.round((j.job_max_salary as number) / 1000)}k` : "+"}`
        : undefined,
      source: j.job_publisher as string || "Indeed",
      postedAt: j.job_posted_at_datetime_utc as string,
    }));
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const { error: authError } = await requireSession();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "software engineer";
  const country = searchParams.get("country") || "us";
  const page = searchParams.get("page") || "1";

  const [adzuna, jsearch] = await Promise.all([
    fetchAdzuna(query, country, page),
    fetchJSearch(query),
  ]);

  if (adzuna.length === 0 && jsearch.length === 0) {
    return apiError("Job search not configured.", { status: 503 });
  }

  // Interleave results: adzuna, jsearch, adzuna, jsearch...
  const results: JobResult[] = [];
  const maxLen = Math.max(adzuna.length, jsearch.length);
  for (let i = 0; i < maxLen; i++) {
    if (adzuna[i]) results.push(adzuna[i]);
    if (jsearch[i]) results.push(jsearch[i]);
  }

  return NextResponse.json({ results });
}
