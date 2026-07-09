# ResumeX

ResumeX is the TalentX resume workspace: AI resume formatting, resume/job match analysis, cover letters, application tracking, job search, profile-backed autoapply data, and a Chrome extension that can score and save jobs from job boards.

**Access model:** The marketing homepage, login, and register are public. All tools (CV, Analyzer, Jobs, Cover Letter, AutoApply, Tracker, Upgrade) and their AI APIs require a signed-in account (NextAuth session). The Chrome extension uses a Bearer token from `/api/extension/token`.

## Core Stack

- Next.js 16 App Router
- React 19
- Prisma with PostgreSQL
- NextAuth credentials and optional Google OAuth
- OpenAI for resume analysis, formatting, parsing, match scoring, and cover letters
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
npm run build
```

For Prisma validation, make sure `DATABASE_URL` is a PostgreSQL URL in `.env`:

```bash
npx prisma validate
```

## Deployment

See [VERCEL.md](./VERCEL.md) for the Vercel environment checklist, migration rollout notes, and recovery steps for databases that were previously updated with `prisma db push`.
