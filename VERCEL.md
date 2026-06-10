# Deploying ResumeX on Vercel

This guide covers deploying ResumeX to [Vercel](https://vercel.com) with PDF uploads, server-side text extraction, and OpenAI analysis.

## Prerequisites

- A [Vercel account](https://vercel.com/signup)
- A [GitHub](https://github.com) repository containing this project
- An [OpenAI API key](https://platform.openai.com/api-keys)

## 1. Push to GitHub

Ensure your code is committed and pushed to a GitHub repository. Do **not** commit `.env.local` — it is ignored by git.

```bash
git add .
git commit -m "Prepare ResumeX for Vercel deployment"
git push origin main
```

## 2. Import the project on Vercel

1. Go to [vercel.com/new](https://vercel.com/new).
2. Import your GitHub repository.
3. Vercel auto-detects Next.js — keep the default settings:
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next` (default)
   - **Install Command:** `npm install`

## 3. Configure environment variables

In the Vercel project dashboard, open **Settings → Environment Variables** and add:

| Name | Value | Environments |
|------|-------|--------------|
| `OPENAI_API_KEY` | Your OpenAI API key (`sk-...`) | Production, Preview, Development |

ResumeX reads **only** `OPENAI_API_KEY` on the server. The key never reaches the browser.

For local development, copy the example file:

```bash
cp .env.local.example .env.local
```

Then paste your real key into `.env.local`.

## 4. Deploy

Click **Deploy**. Vercel runs `npm run build` and publishes the app.

After deployment, open your production URL and run a test analysis with both:

- A pasted resume + job description
- A text-based PDF upload

## Production architecture

| Feature | Implementation |
|---------|----------------|
| API route | `app/api/analyze/route.ts` |
| Runtime | `nodejs` (required for PDF parsing and OpenAI) |
| PDF parsing | `unpdf` with inlined PDF.js worker (no separate worker file) |
| File uploads | `multipart/form-data` via `FormData` |
| Max upload size | 4 MB (within Vercel's 4.5 MB serverless body limit) |
| Function timeout | 60 seconds (`maxDuration` on the analyze route) |

## Vercel plan notes

- **Hobby:** Serverless functions have a **10 second** timeout by default. OpenAI analysis may exceed this. Upgrade to **Pro** or enable longer function durations if requests time out.
- **Pro:** Supports `maxDuration` up to 300 seconds. ResumeX sets `maxDuration = 60` on `/api/analyze`.

## Troubleshooting

### "OpenAI API key is not configured on the server"

- Confirm `OPENAI_API_KEY` is set in Vercel **Environment Variables**.
- Redeploy after adding or changing variables.

### PDF upload fails or returns a generic extraction error

- Use a **text-based PDF** (not a scanned image).
- Keep files under **4 MB**.
- Check **Vercel → Logs** for `[ResumeX] PDF extraction` entries.

### Request times out

- Analysis typically takes 10–30 seconds. On Hobby, increase plan or reduce input size.
- Check Vercel function logs for OpenAI errors (quota, rate limits, invalid key).

### Build fails

Run locally first:

```bash
npm install
npm run build
```

Fix any TypeScript or dependency errors before redeploying.

## Security checklist

- [ ] `OPENAI_API_KEY` is set only in Vercel env vars, not in source code
- [ ] `.env.local` is not committed
- [ ] `.env.local.example` contains a placeholder, not a real key

## Useful links

- [Vercel environment variables](https://vercel.com/docs/projects/environment-variables)
- [Vercel function duration limits](https://vercel.com/docs/functions/runtimes#max-duration)
- [Next.js deployment on Vercel](https://nextjs.org/docs/app/building-your-application/deploying)
