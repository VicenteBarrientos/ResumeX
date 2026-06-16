import { jsPDF } from "jspdf";
import type { FormattedResume } from "@/lib/types";

const MARGIN = 18;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const RIGHT_EDGE = PAGE_WIDTH - MARGIN;

const COLORS = {
  heading: [17, 24, 39] as [number, number, number],
  body: [31, 41, 55] as [number, number, number],
  muted: [82, 82, 91] as [number, number, number],
  divider: [180, 184, 193] as [number, number, number],
};

function sanitizeFileName(name: string): string {
  const cleaned = name.trim().replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
  return cleaned.length > 0 ? cleaned : "Resume";
}

export function generateResumePdf(resume: FormattedResume): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  function ensureSpace(height: number): void {
    if (y + height > PAGE_HEIGHT - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  }

  function sectionTitle(title: string): void {
    ensureSpace(12);
    y += 2;
    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.heading);
    doc.text(title.toUpperCase(), MARGIN, y);
    y += 2.5;
    doc.setDrawColor(...COLORS.divider);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, RIGHT_EDGE, y);
    y += 5;
  }

  // Left text + right-aligned text on the same baseline.
  function leftRight(
    left: string,
    right: string,
    options: { bold?: boolean; size?: number; color?: [number, number, number] } = {},
  ): void {
    const size = options.size ?? 11;
    const color = options.color ?? COLORS.body;
    ensureSpace(6);
    doc.setFont("times", options.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);

    const rightWidth = right ? doc.getTextWidth(right) : 0;
    const leftMaxWidth = CONTENT_WIDTH - rightWidth - (right ? 4 : 0);
    const leftLines = doc.splitTextToSize(left, leftMaxWidth);

    doc.text(leftLines[0] ?? "", MARGIN, y);
    if (right) {
      doc.text(right, RIGHT_EDGE, y, { align: "right" });
    }
    y += 5;

    for (let i = 1; i < leftLines.length; i++) {
      ensureSpace(5);
      doc.text(leftLines[i], MARGIN, y);
      y += 5;
    }
  }

  function paragraph(
    text: string,
    options: { size?: number; color?: [number, number, number]; justify?: boolean } = {},
  ): void {
    const size = options.size ?? 11;
    doc.setFont("times", "normal");
    doc.setFontSize(size);
    doc.setTextColor(...(options.color ?? COLORS.body));
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH);

    for (const line of lines) {
      ensureSpace(5);
      doc.text(line, MARGIN, y, options.justify ? { maxWidth: CONTENT_WIDTH, align: "justify" } : undefined);
      y += 5;
    }
  }

  function bullets(items: string[]): void {
    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.body);
    const indent = 5;

    for (const item of items) {
      if (!item.trim()) continue;
      const lines = doc.splitTextToSize(item, CONTENT_WIDTH - indent);
      ensureSpace(5);
      doc.text("•", MARGIN + 1, y);
      doc.text(lines[0] ?? "", MARGIN + indent, y);
      y += 5;
      for (let i = 1; i < lines.length; i++) {
        ensureSpace(5);
        doc.text(lines[i], MARGIN + indent, y);
        y += 5;
      }
    }
  }

  // ---------- Header ----------
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...COLORS.heading);
  doc.text(resume.contact.name || "Your Name", PAGE_WIDTH / 2, y + 4, { align: "center" });
  y += 9;

  if (resume.contact.title) {
    doc.setFont("times", "normal");
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.muted);
    doc.text(resume.contact.title, PAGE_WIDTH / 2, y, { align: "center" });
    y += 6;
  }

  const contactParts = [
    resume.contact.location,
    resume.contact.phone,
    resume.contact.email,
    resume.contact.linkedin,
    resume.contact.website,
  ].filter((part) => part && part.trim().length > 0);

  if (contactParts.length > 0) {
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.muted);
    const contactLine = contactParts.join("  |  ");
    const lines = doc.splitTextToSize(contactLine, CONTENT_WIDTH);
    for (const line of lines) {
      doc.text(line, PAGE_WIDTH / 2, y, { align: "center" });
      y += 5;
    }
  }

  y += 1;
  doc.setDrawColor(...COLORS.heading);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, RIGHT_EDGE, y);
  y += 4;

  // ---------- Summary ----------
  if (resume.summary.trim()) {
    sectionTitle("Professional Summary");
    paragraph(resume.summary, { justify: true });
  }

  // ---------- Experience ----------
  if (resume.experience.length > 0) {
    sectionTitle("Experience");
    resume.experience.forEach((entry, index) => {
      if (index > 0) y += 2;
      leftRight(entry.role || entry.company, entry.dates, { bold: true });
      const sub = [entry.company, entry.location].filter(Boolean).join(" — ");
      if (sub) {
        leftRight(sub, "", { size: 10.5, color: COLORS.muted });
      }
      if (entry.bullets.length > 0) {
        y += 0.5;
        bullets(entry.bullets);
      }
    });
  }

  // ---------- Education ----------
  if (resume.education.length > 0) {
    sectionTitle("Education");
    resume.education.forEach((entry, index) => {
      if (index > 0) y += 2;
      leftRight(entry.institution, entry.dates, { bold: true });
      const sub = [entry.degree, entry.location].filter(Boolean).join(" — ");
      if (sub) {
        leftRight(sub, "", { size: 10.5, color: COLORS.muted });
      }
      if (entry.details.length > 0) {
        bullets(entry.details);
      }
    });
  }

  // ---------- Skills ----------
  if (resume.skills.length > 0) {
    sectionTitle("Skills");
    paragraph(resume.skills.join("  •  "));
  }

  // ---------- Projects ----------
  if (resume.projects.length > 0) {
    sectionTitle("Projects");
    resume.projects.forEach((entry, index) => {
      if (index > 0) y += 2;
      leftRight(entry.name, "", { bold: true });
      if (entry.description.trim()) {
        paragraph(entry.description, { size: 10.5, color: COLORS.muted });
      }
      if (entry.bullets.length > 0) {
        bullets(entry.bullets);
      }
    });
  }

  // ---------- Certifications ----------
  if (resume.certifications.length > 0) {
    sectionTitle("Certifications");
    resume.certifications.forEach((entry) => {
      const issuer = entry.issuer ? ` — ${entry.issuer}` : "";
      leftRight(`${entry.name}${issuer}`, entry.date);
    });
  }

  // ---------- Languages ----------
  if (resume.languages.length > 0) {
    sectionTitle("Languages");
    paragraph(resume.languages.join("  •  "));
  }

  doc.save(`${sanitizeFileName(resume.contact.name)}_Resume.pdf`);
}
