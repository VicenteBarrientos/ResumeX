# Deploying ResumeX on Vercel

ResumeX needs more than an OpenAI key now: the deployed app uses PostgreSQL, auth secrets, AI routes, optional Google OAuth, optional Stripe billing, optional job search providers, and a weekly cron.

## Required Vercel Environment Variables

Set these for Production and Preview unless you intentionally disable the feature.

| Name | Required | Notes |
|------|----------|-------|
| `DATABASE_URL` | Yes | PostgreSQL URL. Neon/Vercel Postgres pooled URLs are fine for Prisma Client. |
| `NEXTAUTH_URL` | Yes | Production origin, for example `https://resumex.talentxrecruiting.com`. |
| `NEXTAUTH_SECRET` | Yes | Long random string. Also signs Chrome extension tokens. |
| `OPENAI_API_KEY` | Yes | Required by analyzer, formatter, cover letters, match score, and profile parsing. |
| `GOOGLE_CLIENT_ID` | Optional | Enables Google OAuth when paired with `GOOGLE_CLIENT_SECRET`. |
| `GOOGLE_CLIENT_SECRET` | Optional | Enables Google OAuth when paired with `GOOGLE_CLIENT_ID`. |
| `ADZUNA_APP_ID` | Optional | Enables Adzuna job search and job digest suggestions. |
| `ADZUNA_APP_KEY` | Optional | Enables Adzuna job search and job digest suggestions. |
| `RAPIDAPI_KEY` | Optional | Enables the fallback jobs API route. |
| `RESEND_API_KEY` | Optional | Enables registration/digest email sending. |
| `CRON_SECRET` | Optional | Required if the Vercel cron should call `/api/cron/job-digest`. |
| `STRIPE_SECRET_KEY` | Optional | Required for checkout and billing portal routes. |
| `STRIPE_WEBHOOK_SECRET` | Optional | Required for Stripe webhook verification. |
| `STRIPE_PRO_PRICE_ID` | Optional | Required for Pro subscription checkout. |
| `NEXT_PUBLIC_RESUMEX_URL` | Optional | Public ResumeX URL for cross-site links. |
| `NEXT_PUBLIC_TALENTX_URL` | Optional | Public TalentX marketing site URL for cross-site links. |
| `RESUMEX_DEBUG_LOGS` | Optional | Set to `true` only while diagnosing server issues. |

Do not set blank values in Vercel. Omit optional variables until you have real values.

## Build Command

Use the default build command:

```bash
npm run build
```

The build script intentionally runs only:

```bash
prisma generate && next build
```

It does not run `prisma db push`, because `db push` can mutate production schema during a build and can fail on data-loss warnings.

## Database Migration Rollout

For a new empty PostgreSQL database:

```bash
npm run db:migrate
```

For an existing production database that was previously managed by `prisma db push`, do not blindly run the initial migration. First inspect the database schema, then baseline the initial migration if the existing tables match it:

```bash
npx prisma migrate resolve --applied 20260703000000_init_postgres
npm run db:migrate
```

The second migration, `20260703001000_add_stripe_billing`, adds `User.stripeCustomerId`, `User.isPro`, and the unique index for Stripe customer IDs. If existing data contains duplicate non-null Stripe customer IDs, that migration will fail and the duplicates must be cleaned before retrying.

## Current Vercel Findings

Recent production deployments failed for two separate reasons:

- One project ran `prisma generate && prisma db push && next build`; `db push` stopped on a potential data-loss warning while adding the unique `stripeCustomerId` index.
- Another project had no `DATABASE_URL` in its Vercel environment, so Prisma failed during build.

This repo now removes `db push` from `npm run build`, adds checked-in Postgres migrations, and documents `DATABASE_URL` as required.

The local workspace is linked to Vercel project `resume-x-yixz`, while the Vercel account also has deployments for `resume-x`. Keep only the intended project connected to the GitHub repo, or both projects may continue deploying the same commits.

## Suggested Deployment Sequence

1. Set required Vercel env vars, especially `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, and `OPENAI_API_KEY`.
2. Decide whether the production DB is new or already managed by previous `db push` runs.
3. Run the appropriate migration path above.
4. Deploy from GitHub or trigger a Vercel redeploy.
5. Smoke-test login, formatter, analyzer, tracker create/edit, extension token, and Stripe routes if billing is enabled.

## Troubleshooting

### Prisma says `DATABASE_URL` is missing

Set `DATABASE_URL` in the Vercel project environment for the deployment target and redeploy. Locally, put the PostgreSQL URL in `.env` for Prisma CLI commands.

### Prisma warns about potential data loss

Do not add `--accept-data-loss` during build. Convert the change into a migration, inspect the affected data, then run `npm run db:migrate` intentionally.

### Auth or extension tokens fail

Confirm `NEXTAUTH_SECRET` is non-empty and stable across deployments. Changing it invalidates existing sessions and extension tokens.

### Stripe checkout fails

Confirm `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID`, and `NEXTAUTH_URL` are set. Confirm the webhook endpoint uses the matching `STRIPE_WEBHOOK_SECRET`.
