import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * T-12.1 / R-023 — the Career/Talent boundary is enforced here, not by discipline.
 *
 * R-005 says the two products share verbs (engines), not nouns (subjects). That
 * held for six phases on vigilance alone; vigilance does not survive agent
 * rotation. These zones turn the convention into a build failure.
 *
 * Note `lib/ats/**` and `lib/talent-mapper/**` are BOTH Talent, so
 * `lib/ats/from-researcher.ts` importing `ResearcherCandidate` is intra-product
 * and stays legal. There is no cross-product bridge to allowlist.
 *
 * Genuinely shared modules (`lib/analyze.ts`, `lib/types.ts`, `lib/db.ts`,
 * `lib/products.ts`, …) are unrestricted on purpose: sharing them is the design.
 */

const TALENT_MODULES = [
  "@/lib/talent-mapper",
  "@/lib/talent-mapper/**",
  "@/lib/ats",
  "@/lib/ats/**",
  "@/components/talent/**",
  "@/components/talent-mapper/**",
];

const CAREER_MODULES = [
  "@/lib/format-resume",
  "@/lib/demo-career",
  "@/lib/job-api",
  "@/lib/job-storage",
  "@/lib/job-types",
  "@/lib/autoapply-types",
  "@/lib/merge-profile",
  "@/lib/parse-profile",
  "@/lib/profile-api",
  "@/lib/generate-resume-pdf",
  "@/lib/generate-resume-docx",
  "@/lib/generate-report-pdf",
  "@/components/autoapply/**",
  "@/components/ResumeAnalyzer",
  "@/components/CvFormatter",
  "@/components/ResumePreview",
  "@/components/JobSearcherDashboard",
  "@/components/AutoApplyDashboard",
  "@/components/DownloadReportButton",
  "@/components/ResultCards",
];

const CAREER_FILES = [
  "app/career/**",
  "app/api/analyze/**",
  "app/api/format/**",
  "app/api/cover-letter/**",
  "app/api/extract-job/**",
  "app/api/jobs/**",
  "app/api/match-score/**",
  "app/api/profile/**",
  "app/api/tracker/**",
  "app/api/answers/**",
  "app/api/autoapply/**",
  "components/autoapply/**",
  "components/ResumeAnalyzer.tsx",
  "components/CvFormatter.tsx",
  "components/ResumePreview.tsx",
  "components/JobSearcherDashboard.tsx",
  "components/AutoApplyDashboard.tsx",
  "components/DownloadReportButton.tsx",
  "components/ResultCards.tsx",
  "lib/format-resume.ts",
  "lib/demo-career.ts",
  "lib/job-api.ts",
  "lib/job-storage.ts",
  "lib/job-types.ts",
  "lib/autoapply-types.ts",
  "lib/merge-profile.ts",
  "lib/parse-profile.ts",
  "lib/profile-api.ts",
  "lib/generate-resume-pdf.ts",
  "lib/generate-resume-docx.ts",
  "lib/generate-report-pdf.ts",
];

const TALENT_FILES = [
  "app/talent/**",
  "app/api/talent/**",
  "app/api/talent-mapper/**",
  "app/api/talent-assess/**",
  "components/talent/**",
  "components/talent-mapper/**",
  "lib/talent-mapper/**",
  "lib/ats/**",
];

const CAREER_IMPORTING_TALENT =
  "R-005/R-023: ResumeX Career must not import ResumeX Talent modules. Career operates on a self-reported CV, Talent on a researcher inferred from publications. If you need shared behaviour, extract the verb into a shared lib module at the second real use (R-009).";

const TALENT_IMPORTING_CAREER =
  "R-005/R-023: ResumeX Talent must not import ResumeX Career modules. Career operates on a self-reported CV, Talent on a researcher inferred from publications. If you need shared behaviour, extract the verb into a shared lib module at the second real use (R-009).";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    name: "resumex/career-must-not-import-talent",
    files: CAREER_FILES,
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: TALENT_MODULES, message: CAREER_IMPORTING_TALENT }] },
      ],
    },
  },
  {
    name: "resumex/talent-must-not-import-career",
    files: TALENT_FILES,
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: CAREER_MODULES, message: TALENT_IMPORTING_CAREER }] },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prisma migrate recovery must stay CommonJS for Vercel build.
    "scripts/**/*.cjs",
  ]),
]);

export default eslintConfig;
