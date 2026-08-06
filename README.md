# ResumeX

<p align="center">
  <strong>Two AI-assisted products on one codebase.</strong><br />
  Help candidates reach the interview, and help recruiting teams find evidence-backed scientific talent.
</p>

<p align="center">
  <a href="https://resumex.talentxrecruiting.com"><strong>Open the live product</strong></a>
  ·
  <a href="#run-locally">Run locally</a>
  ·
  <a href="./VERCEL.md">Deployment guide</a>
</p>

ResumeX ships **two products on one deployment and one database**:

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
npm run test:e2e:career
```

**Talent Mapper** registers a local test user (default `tm_e2e_demo`), signs in, runs the full demo path, shortlists a researcher, and downloads the CSV. Override with `TALENT_MAPPER_E2E_USER` / `TALENT_MAPPER_E2E_PASS` / `TALENT_MAPPER_E2E_BASE` if needed.

**Career** registers `career_e2e_demo`, runs Try-demo analyzer → creates a tracker application → generates a demo cover letter. Override with `CAREER_E2E_USER` / `CAREER_E2E_PASS` / `CAREER_E2E_BASE`. Analyzer and cover-letter demos are deterministic (no OpenAI).

First time only: `npx playwright install chromium`.

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

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-111111?logo=nextdotjs" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-Prisma-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL and Prisma" />
</p>

![ResumeX product preview](./docs/product-preview.png)

> [!NOTE]
> ResumeX is under active development. The landing page is public; the workspace and AI-backed routes require an account. AI output should always be reviewed before it is used in an application.

## What it does

| Workspace | Purpose |
| --- | --- |
| CV formatter | Turns an uploaded resume into a structured CV and exports PDF or DOCX. |
| Resume analyzer | Compares resume content with a job description and returns match insights, gaps, and interview-prep prompts. |
| Cover letters | Produces an editable first draft from the candidate profile and role context. |
| Job search | Queries configured job providers and saves selected roles to the tracker. |
| Application tracker | Stores role, company, status, match score, notes, and dates in one pipeline. |
| AutoApply bridge | Shares the saved profile and application log with the companion Chrome extension. |

The tools use a single authenticated profile so information entered once can support later analysis, documents, and applications.

## Architecture

```mermaid
flowchart LR
  Browser["Next.js workspace"] --> Auth["NextAuth session"]
  Browser --> Routes["App Router API routes"]
  Routes --> AI["OpenAI"]
  Routes --> Jobs["Job-search providers"]
  Routes --> DB["Prisma + PostgreSQL"]
  Routes --> Files["Vercel Blob"]
  Routes --> Billing["Stripe"]
  Extension["Chrome extension"] --> Routes
```

## Stack

- Next.js 16 App Router, React 19, TypeScript, and Tailwind CSS 4
- Prisma with PostgreSQL
- NextAuth credentials with optional Google OAuth
- OpenAI for analysis, formatting, profile parsing, cover-letter drafts, and Talent Mapper synthesis
- OpenAlex for Talent Mapper public research search
- Stripe for optional billing, Resend for email, and Vercel Blob for stored files
- Vercel cron for job digest emails
- Chrome Extension Manifest V3 integration

## Run locally

Prerequisites: Node.js 20+, npm, and a PostgreSQL database.

```bash
git clone https://github.com/VicenteBarrientos/ResumeX.git
cd ResumeX
npm install
```

Copy the example environment file. On Windows PowerShell:

```powershell
Copy-Item .env.local.example .env.local
Copy-Item .env.local.example .env
```

On macOS or Linux:

```bash
cp .env.local.example .env.local
cp .env.local.example .env
```

At minimum, configure:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
OPENAI_API_KEY="replace-with-your-key"
```

Optional for live Talent Mapper search:

```env
OPENALEX_API_KEY="your-openalex-key"
```

Then apply the checked-in migrations and start the app:

```bash
npm run db:migrate
npm run dev
```

Open <http://localhost:3000>.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server. |
| `npm run lint` | Run ESLint. |
| `npm run build` | Generate Prisma Client and create a production build. |
| `npm run db:migrate` | Apply checked-in migrations. |
| `npm run db:migrate:dev` | Create and apply a development migration. |
| `npx prisma validate` | Validate the Prisma schema and database URL. |

`npm run db:push` is retained for deliberate prototyping only; production deploys should use migrations.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Chrome extension

The `chrome-extension/` directory contains the unpacked extension source. To try it locally:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select `chrome-extension/`.
4. Sign in to ResumeX and pair the extension from the AutoApply workspace.

Review generated answers and any pre-filled form before submitting an application. Job-board markup changes frequently, so selectors can require maintenance.

## Roadmap

[`ROADMAP.md`](./ROADMAP.md) breaks the separation plan into takeable tasks — preconditions, steps, definition of done, and the anti-tasks worth *not* doing. [`AGENT_HANDOFF.md`](./AGENT_HANDOFF.md) holds current state and the standing decisions.

## Configuration and deployment

`.env.local.example` documents required and optional variables for authentication, AI, job providers, email, storage, and billing. Never commit real credentials.

For Vercel environment setup, database migrations, and rollout recovery, see [VERCEL.md](./VERCEL.md).

## Related projects

- [TalentX Recruiting](https://talentxrecruiting.com) — recruiting website and portfolio
- [AutoApply](https://github.com/VicenteBarrientos/autoapply) — Chrome extension and backend
- [ResumeX Sourcing Copilot](https://github.com/VicenteBarrientos/resumex-sourcing-copilot) — recruiter sourcing prototype

## Current limitations

- AI output is assistive, not authoritative; candidates should verify every generated claim.
- External job-board and provider integrations depend on third-party APIs and changing page structures.
- A production deployment needs strong secrets, protected webhook endpoints, database backups, and provider-specific rate limits.
