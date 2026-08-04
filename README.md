# ResumeX

<p align="center">
  <strong>An AI-assisted workspace for the full job-search workflow.</strong><br />
  Format a CV, compare it with a role, draft a cover letter, discover jobs, save applications, and keep one reusable candidate profile.
</p>

<p align="center">
  <a href="https://resumex.talentxrecruiting.com"><strong>Open the live product</strong></a>
  ·
  <a href="#run-locally">Run locally</a>
  ·
  <a href="./VERCEL.md">Deployment guide</a>
</p>

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
- OpenAI for analysis, formatting, profile parsing, and cover-letter drafts
- Stripe for optional billing, Resend for email, and Vercel Blob for stored files
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

## Chrome extension

The `chrome-extension/` directory contains the unpacked extension source. To try it locally:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select `chrome-extension/`.
4. Sign in to ResumeX and pair the extension from the AutoApply workspace.

Review generated answers and any pre-filled form before submitting an application. Job-board markup changes frequently, so selectors can require maintenance.

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
