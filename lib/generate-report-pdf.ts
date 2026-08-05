import { jsPDF } from "jspdf";
import type { CareerAnalysis } from "@/lib/types";

const FILENAME = "ResumeX_Career_Report.pdf";
const MARGIN = 20;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const LINE_HEIGHT = 6;
const SECTION_GAP = 10;

const COLORS = {
  primary: [29, 53, 89] as [number, number, number],
  muted: [82, 82, 91] as [number, number, number],
  body: [24, 24, 27] as [number, number, number],
};

/** Career-owned PDF: improvement report for the candidate, not a recruiter sendout. */
export function generateReportPdf(result: CareerAnalysis): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  function ensureSpace(height: number): void {
    if (y + height > PAGE_HEIGHT - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  }

  function addSectionTitle(title: string): void {
    ensureSpace(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.primary);
    doc.text(title, MARGIN, y);
    y += 8;
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += SECTION_GAP;
  }

  function addParagraph(text: string): void {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.body);
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH);

    for (const line of lines) {
      ensureSpace(LINE_HEIGHT);
      doc.text(line, MARGIN, y);
      y += LINE_HEIGHT;
    }

    y += 4;
  }

  function addLabelValue(label: string, value: string): void {
    ensureSpace(LINE_HEIGHT * 2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.muted);
    doc.text(`${label}:`, MARGIN, y);
    y += LINE_HEIGHT;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.body);
    const lines = doc.splitTextToSize(value, CONTENT_WIDTH);
    for (const line of lines) {
      ensureSpace(LINE_HEIGHT);
      doc.text(line, MARGIN, y);
      y += LINE_HEIGHT;
    }

    y += 4;
  }

  function addBulletList(items: string[], emptyMessage: string): void {
    if (items.length === 0) {
      addParagraph(emptyMessage);
      return;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.body);

    for (const item of items) {
      const lines = doc.splitTextToSize(`• ${item}`, CONTENT_WIDTH - 4);

      for (let index = 0; index < lines.length; index++) {
        ensureSpace(LINE_HEIGHT);
        doc.text(lines[index], MARGIN + (index === 0 ? 0 : 4), y);
        y += LINE_HEIGHT;
      }

      y += 2;
    }

    y += 2;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...COLORS.primary);
  doc.text("ResumeX Career", MARGIN, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.muted);
  doc.text("Candidate Improvement Report", MARGIN, y);
  y += 6;

  doc.setFontSize(9);
  doc.text(
    `Generated ${new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`,
    MARGIN,
    y,
  );
  y += SECTION_GAP + 4;

  addSectionTitle("Match Score");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(...COLORS.primary);
  ensureSpace(16);
  doc.text(`${result.matchScore}/100`, MARGIN, y);
  y += 14;

  addSectionTitle("Summary");
  addParagraph(result.summary);

  addSectionTitle("Strengths");
  addBulletList(result.strengths, "No standout strengths identified.");

  addSectionTitle("Gaps");
  addBulletList(result.gaps, "No major gaps identified.");

  addSectionTitle("Keywords");
  addLabelValue(
    "Matched",
    result.matchedKeywords.length > 0
      ? result.matchedKeywords.join(", ")
      : "None identified.",
  );
  addLabelValue(
    "Missing",
    result.missingKeywords.length > 0
      ? result.missingKeywords.join(", ")
      : "None identified.",
  );

  addSectionTitle("Suggestions");
  if (result.suggestions.length === 0) {
    addParagraph("No suggestions available.");
  } else {
    for (const suggestion of result.suggestions) {
      ensureSpace(LINE_HEIGHT * 3);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.body);
      const titleLines = doc.splitTextToSize(suggestion.title, CONTENT_WIDTH);
      for (const line of titleLines) {
        ensureSpace(LINE_HEIGHT);
        doc.text(line, MARGIN, y);
        y += LINE_HEIGHT;
      }

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.muted);
      const detailLines = doc.splitTextToSize(suggestion.detail, CONTENT_WIDTH);
      for (const line of detailLines) {
        ensureSpace(LINE_HEIGHT);
        doc.text(line, MARGIN, y);
        y += LINE_HEIGHT;
      }

      y += 4;
    }
  }

  doc.save(FILENAME);
}
