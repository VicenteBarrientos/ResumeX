import type { ConcernLevel, RecommendedNextStep } from "@/lib/types";
import type { Locale } from "@/lib/locale-sync";

const en = {
  nav: {
    language: {
      switchToSpanish: "Switch to Spanish",
      switchToEnglish: "Switch to English",
      english: "EN",
      spanish: "ES",
    },
    siteLinksAria: "External links",
    talentX: "TalentX",
    talentXLinkedIn: "TalentX LinkedIn",
    talentXLinkedInAria: "TalentX on LinkedIn",
  },
  header: {
    eyebrow: "AI Resume Coach",
    title: "ResumeX",
    description:
      "Upload a PDF or paste your resume, then add a target job description. Get an instant match score, keyword gaps, and actionable suggestions — processed securely on the server.",
  },
  form: {
    yourResume: "Your resume",
    dragDrop: "Drag & drop your PDF resume",
    browseHint: "or click to browse — PDF only, up to {size}",
    choosePdf: "Choose PDF file",
    remove: "Remove",
    or: "or",
    pasteResume: "Paste resume text",
    pasteResumePlaceholder: "Paste your resume text here...",
    removePdfHint: "Remove the PDF to paste resume text instead.",
    jobDescription: "Job description",
    jobDescriptionPlaceholder: "Paste the job posting here...",
    privacyNote: "PDFs are parsed on the server. Your API key never reaches the browser.",
    demoNote: "Demo uses synthetic sample data only.",
    tryDemo: "Try demo",
    analyze: "Analyze match",
    analyzing: "Analyzing...",
  },
  errors: {
    pdfOnly: "Only PDF files are supported for resume upload.",
    pdfSize: "PDF must be {size} or smaller.",
    generic: "Something went wrong. Please try again.",
    noResult: "No analysis was returned. Please try again.",
    network: "Network error. Please check your connection and try again.",
  },
  results: {
    title: "Analysis results",
    overallFit: "Overall fit",
    match: "Match",
    concern: "Concern",
    recommendation: "Recommendation",
    copyFullSummary: "Copy full summary",
    downloadReport: "Download Report",
    copied: "Copied!",
    copy: "Copy",
    mustHave: "Must-have criteria",
    niceToHave: "Nice-to-have criteria",
    strongMatches: "Strong matches with evidence",
    strengths: "Strengths",
    gaps: "Gaps",
    matchedKeywords: "Matched keywords",
    missingKeywords: "Missing keywords",
    suggestions: "Suggestions",
    interviewQuestions: "Suggested Interview Questions",
    assessmentHighlights: "AI Assessment Highlights",
    noCriteria: "No criteria identified.",
    noStrongMatches: "No strong matches identified.",
    noStrengths: "No standout strengths identified.",
    noGaps: "No major gaps identified.",
    noMatchedKeywords: "No clear keyword overlap found.",
    noMissingKeywords: "No major gaps detected.",
    noSuggestions: "No suggestions available.",
    missingEvidence: "Not found in resume.",
  },
  concernLevels: {
    Low: "Low",
    Medium: "Medium",
    High: "High",
  } satisfies Record<ConcernLevel, string>,
  nextSteps: {
    Reject: "Reject",
    Screen: "Screen",
    Interview: "Interview",
    "Strongly recommend": "Strongly recommend",
  } satisfies Record<RecommendedNextStep, string>,
  footer: {
    builtBy: "Built by Vicente Barrientos",
    talentX: "TalentX Recruiting",
    copyright: "© 2026 Vicente Barrientos",
    github: "GitHub",
    linkedin: "LinkedIn",
    vicenteLinkedIn: "Vicente's LinkedIn",
    benjaminLinkedIn: "Benjamin's LinkedIn",
    vicenteLinkedInAria: "Vicente Barrientos on LinkedIn",
    benjaminLinkedInAria: "Benjamín Mahave Cornejo on LinkedIn",
    partnerLinksAria: "Partner LinkedIn profiles",
  },
} as const;

const es = {
  nav: {
    language: {
      switchToSpanish: "Cambiar a español",
      switchToEnglish: "Cambiar a inglés",
      english: "EN",
      spanish: "ES",
    },
    siteLinksAria: "Enlaces externos",
    talentX: "TalentX",
    talentXLinkedIn: "LinkedIn de TalentX",
    talentXLinkedInAria: "TalentX en LinkedIn",
  },
  header: {
    eyebrow: "Coach de CV con IA",
    title: "ResumeX",
    description:
      "Sube un PDF o pega tu currículum, luego agrega la descripción del cargo. Obtén un puntaje de match, brechas de keywords y sugerencias accionables — procesado de forma segura en el servidor.",
  },
  form: {
    yourResume: "Tu currículum",
    dragDrop: "Arrastra y suelta tu CV en PDF",
    browseHint: "o haz clic para buscar — solo PDF, hasta {size}",
    choosePdf: "Elegir archivo PDF",
    remove: "Quitar",
    or: "o",
    pasteResume: "Pegar texto del currículum",
    pasteResumePlaceholder: "Pega aquí el texto de tu currículum...",
    removePdfHint: "Quita el PDF para pegar el texto del currículum.",
    jobDescription: "Descripción del cargo",
    jobDescriptionPlaceholder: "Pega aquí la publicación del empleo...",
    privacyNote:
      "Los PDF se procesan en el servidor. Tu API key nunca llega al navegador.",
    demoNote: "El demo usa datos de muestra sintéticos únicamente.",
    tryDemo: "Probar demo",
    analyze: "Analizar match",
    analyzing: "Analizando...",
  },
  errors: {
    pdfOnly: "Solo se admiten archivos PDF para subir el currículum.",
    pdfSize: "El PDF debe ser de {size} o menos.",
    generic: "Algo salió mal. Por favor, inténtalo de nuevo.",
    noResult: "No se devolvió ningún análisis. Por favor, inténtalo de nuevo.",
    network: "Error de red. Verifica tu conexión e inténtalo de nuevo.",
  },
  results: {
    title: "Resultados del análisis",
    overallFit: "Encaje general",
    match: "Match",
    concern: "Preocupación",
    recommendation: "Recomendación",
    copyFullSummary: "Copiar resumen completo",
    downloadReport: "Descargar reporte",
    copied: "¡Copiado!",
    copy: "Copiar",
    mustHave: "Criterios imprescindibles",
    niceToHave: "Criterios deseables",
    strongMatches: "Coincidencias fuertes con evidencia",
    strengths: "Fortalezas",
    gaps: "Brechas",
    matchedKeywords: "Keywords coincidentes",
    missingKeywords: "Keywords faltantes",
    suggestions: "Sugerencias",
    interviewQuestions: "Preguntas sugeridas para entrevista",
    assessmentHighlights: "Destacados del análisis con IA",
    noCriteria: "No se identificaron criterios.",
    noStrongMatches: "No se identificaron coincidencias fuertes.",
    noStrengths: "No se identificaron fortalezas destacadas.",
    noGaps: "No se identificaron brechas importantes.",
    noMatchedKeywords: "No se encontró coincidencia clara de keywords.",
    noMissingKeywords: "No se detectaron brechas importantes.",
    noSuggestions: "No hay sugerencias disponibles.",
    missingEvidence: "No encontrado en el currículum.",
  },
  concernLevels: {
    Low: "Baja",
    Medium: "Media",
    High: "Alta",
  } satisfies Record<ConcernLevel, string>,
  nextSteps: {
    Reject: "Rechazar",
    Screen: "Screening",
    Interview: "Entrevista",
    "Strongly recommend": "Recomendar firmemente",
  } satisfies Record<RecommendedNextStep, string>,
  footer: {
    builtBy: "Creado por Vicente Barrientos",
    talentX: "TalentX Recruiting",
    copyright: "© 2026 Vicente Barrientos",
    github: "GitHub",
    linkedin: "LinkedIn",
    vicenteLinkedIn: "LinkedIn de Vicente",
    benjaminLinkedIn: "LinkedIn de Benjamín",
    vicenteLinkedInAria: "Vicente Barrientos en LinkedIn",
    benjaminLinkedInAria: "Benjamín Mahave Cornejo en LinkedIn",
    partnerLinksAria: "Perfiles de LinkedIn de los socios",
  },
} as const;

export const resumexMessages = { en, es } as const;

export type ResumeXMessages = (typeof resumexMessages)[Locale];

export function getResumeXMessages(locale: Locale): ResumeXMessages {
  return resumexMessages[locale];
}

export function formatMessage(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, value),
    template,
  );
}
