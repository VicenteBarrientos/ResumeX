# ResumeX

ResumeX is an AI-powered resume match analyzer. Upload a PDF or paste your resume, add a target job description, and get a structured analysis with match score, keyword gaps, strengths, gaps, suggestions, and interview questions.

All processing runs server-side — your OpenAI API key never reaches the browser.

## Features

- PDF upload or pasted resume text
- Match score and recruiter-style recommendation
- Must-have / nice-to-have criteria with evidence
- Matched and missing keywords
- Actionable suggestions and phone-screen questions
- Copy full summary or download a PDF report

## Local development

1. Install dependencies:

```bash
npm install
```

2. Configure your API key:

```bash
cp .env.local.example .env.local
```

Add your OpenAI key to `.env.local`:

```
OPENAI_API_KEY=sk-your-openai-api-key-here
```

3. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production build

```bash
npm run build
npm start
```

## Deploy on Vercel

See [VERCEL.md](./VERCEL.md) for step-by-step deployment instructions, environment variables, and troubleshooting.
