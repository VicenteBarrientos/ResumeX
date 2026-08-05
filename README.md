# ResumeX

ResumeX ships **two products on one codebase**, one deployment and one database:

| Product | Users | Lives at | What it does |
|---|---|---|---|
| **ResumeX Career** | Job seekers | `/career/*` | AI resume formatting, resume/job match analysis, cover letters, job search, application tracking, and profile-backed AutoApply with a Chrome extension. |
| **ResumeX Talent** | Recruiters and hiring teams | `/talent/*` | **Talent Mapper**: evidence-based scientific candidate discovery from public scholarly data. |

The names are exact and belong in UI, copy and metadata; Talent Mapper is a feature inside ResumeX Talent, not a brand. `lib/products.ts` is the single source for both. See [`AGENT_HANDOFF.md`](./AGENT_HANDOFF.md) for the decisions behind the split.

**Routing:** `/` is the ResumeX Career landing, `/talent` the ResumeX Talent landing. The old flat routes (`/cv`, `/tracker`, `/talent-mapper`, …) 308-redirect into their segment, so bookmarks, indexed URLs and shipped extension builds keep working.

**Access model:** Both landings, login, and register are public. Every tool (`/career/*`, `/talent/mapper`, `/upgrade`, `/extension-auth`) and their AI APIs require a signed-in account (NextAuth session). The Chrome extension uses a Bearer token from `/api/extension/token`.

## Talent Mapper

**Tagline:** Evidence-based candidate discovery beyond LinkedIn.

Talent Mapper helps recruiters source hard-to-fill scientific roles by:

1. Extracting editable sourcing criteria from a job description
2. Building transparent OpenAlex search queries
3. Aggregating public works into potential researcher profiles
4. Scoring **research relevance** with an explainable breakdown
5. Showing paper-level evidence for every important match
6. Drafting editable outreach (no automated sending)
7. Shortlisting and exporting CSV

**Limitations (important):**

- Publication affiliation is not guaranteed current employment
- Scores measure relevance to search criteria, not hiring quality, availability, or eligibility
- OpenAlex metadata can be incomplete or stale — always validate with candidates
- The MVP does not scrape LinkedIn, Google Scholar, or private contact data
- Demo snapshot mode uses a saved public-data fixture when live search is unavailable

### Environment

```env
OPENAI_API_KEY=...          # criteria extraction + outreach (falls back safely if missing)
OPENALEX_API_KEY=...        # optional; enables Live OpenAlex search (server-side only)
```

Obtain an OpenAlex key (free) from [openalex.org/settings/api](https://openalex.org/settings/api). Set `OPENALEX_API_KEY` in `.env.local` and in Vercel → Environment Variables (Production + Preview). Never expose the key to the browser.

### Demo snapshot (interview-friendly)

1. Sign in and open [/talent/mapper](http://localhost:3000/talent/mapper)
2. Click **Load scientific sourcing demo**
3. Review criteria → continue to strategy → **Run demo snapshot**
4. Inspect a researcher, draft outreach, shortlist, export CSV

No OpenAlex key is required for Demo snapshot.

### E2E smoke (Playwright)

With the dev server running:

```bash
npm run test:e2e:talent-mapper
```

This registers a local test user (default `tm_e2e_demo`), signs in, runs the full demo path, shortlists a researcher, and downloads the CSV. Override with `TALENT_MAPPER_E2E_USER` / `TALENT_MAPPER_E2E_PASS` / `TALENT_MAPPER_E2E_BASE` if needed. First time only: `npx playwright install chromium`.

### Scoring (0–100 research relevance)

| Component | Max |
|-----------|-----|
| Required-technique evidence | 40 |
| Research area / systems | 20 |
| Recency of relevant work | 15 |
| Repeated evidence across works | 10 |
| Geography / institution signal | 10 |
| Seniority / ownership signal | 5 |

### Architecture (high level)

- UI: `app/talent/mapper/` + `components/talent-mapper/`
- APIs: `app/api/talent-mapper/{extract-criteria,search,outreach,status}`
- Core: `lib/talent-mapper/` (OpenAlex client, evidence, scoring, aggregation, CSV)
- Fixture: `data/talent-mapper-demo.json`

## Core Stack

- Next.js 16 App Router
- React 19
- Prisma with PostgreSQL
- NextAuth credentials and optional Google OAuth
- OpenAI for resume analysis, formatting, parsing, match scoring, cover letters, and Talent Mapper synthesis
- OpenAlex for Talent Mapper public research search
- Stripe for the optional Pro plan
- Vercel cron for job digest emails

## Local Setup

Install dependencies:

```bash
npm install
```

Copy the example env file:

```bash
copy .env.local.example .env.local
```

Prisma CLI loads `.env` by default, so keep `DATABASE_URL` available there too when running Prisma commands:

```bash
copy .env.local.example .env
```

At minimum, set:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
OPENAI_API_KEY="sk-your-openai-api-key-here"
```

Optional for live Talent Mapper search:

```env
OPENALEX_API_KEY="your-openalex-key"
```

Run local development:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database Commands

Generate Prisma client and build:

```bash
npm run build
```

Apply checked-in migrations to a configured database:

```bash
npm run db:migrate
```

Create a new development migration after schema edits:

```bash
npm run db:migrate:dev
```

`npm run db:push` is kept for deliberate prototyping only. Do not use it in production deploys.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

For Prisma validation, make sure `DATABASE_URL` is a PostgreSQL URL in `.env`:

```bash
npx prisma validate
```

## Roadmap

[`ROADMAP.md`](./ROADMAP.md) breaks the separation plan into takeable tasks — preconditions, steps, definition of done, and the anti-tasks worth *not* doing. [`AGENT_HANDOFF.md`](./AGENT_HANDOFF.md) holds current state and the standing decisions.

## Deployment

See [VERCEL.md](./VERCEL.md) for the Vercel environment checklist, migration rollout notes, and recovery steps for databases that were previously updated with `prisma db push`.
