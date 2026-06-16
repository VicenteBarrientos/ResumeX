import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  TabStopPosition,
  TabStopType,
  TextRun,
} from "docx";
import type { FormattedResume } from "@/lib/types";

const FONT = "Times New Roman";
const HEADING_COLOR = "111827";
const BODY_COLOR = "1F2937";
const MUTED_COLOR = "525259";
const DIVIDER_COLOR = "B4B8C1";

function sanitizeFileName(name: string): string {
  const cleaned = name.trim().replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
  return cleaned.length > 0 ? cleaned : "Resume";
}

function sectionTitle(title: string): Paragraph {
  return new Paragraph({
    spacing: { before: 220, after: 90 },
    border: {
      bottom: { color: DIVIDER_COLOR, space: 2, style: BorderStyle.SINGLE, size: 6 },
    },
    children: [
      new TextRun({
        text: title.toUpperCase(),
        bold: true,
        size: 24,
        color: HEADING_COLOR,
        font: FONT,
      }),
    ],
  });
}

function leftRight(
  left: string,
  right: string,
  options: { bold?: boolean; size?: number; color?: string } = {},
): Paragraph {
  const size = options.size ?? 22;
  const color = options.color ?? BODY_COLOR;

  const children = [
    new TextRun({ text: left, bold: options.bold, size, color, font: FONT }),
  ];

  if (right) {
    children.push(
      new TextRun({ text: `\t${right}`, bold: options.bold, size, color, font: FONT }),
    );
  }

  return new Paragraph({
    spacing: { after: 40 },
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    children,
  });
}

function paragraph(
  text: string,
  options: { size?: number; color?: string; justify?: boolean; after?: number } = {},
): Paragraph {
  return new Paragraph({
    spacing: { after: options.after ?? 80 },
    alignment: options.justify ? AlignmentType.JUSTIFIED : undefined,
    children: [
      new TextRun({
        text,
        size: options.size ?? 22,
        color: options.color ?? BODY_COLOR,
        font: FONT,
      }),
    ],
  });
}

function bulletParagraph(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 30 },
    children: [new TextRun({ text, size: 22, color: BODY_COLOR, font: FONT })],
  });
}

function buildChildren(resume: FormattedResume): Paragraph[] {
  const children: Paragraph[] = [];

  // Header
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: resume.contact.title ? 40 : 80 },
      children: [
        new TextRun({
          text: resume.contact.name || "Your Name",
          bold: true,
          size: 36,
          color: HEADING_COLOR,
          font: FONT,
        }),
      ],
    }),
  );

  if (resume.contact.title) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: resume.contact.title,
            size: 24,
            color: MUTED_COLOR,
            font: FONT,
          }),
        ],
      }),
    );
  }

  const contactParts = [
    resume.contact.location,
    resume.contact.phone,
    resume.contact.email,
    resume.contact.linkedin,
    resume.contact.website,
  ].filter((part) => part && part.trim().length > 0);

  if (contactParts.length > 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        border: {
          bottom: { color: HEADING_COLOR, space: 4, style: BorderStyle.SINGLE, size: 10 },
        },
        children: [
          new TextRun({
            text: contactParts.join("   |   "),
            size: 20,
            color: MUTED_COLOR,
            font: FONT,
          }),
        ],
      }),
    );
  }

  // Summary
  if (resume.summary.trim()) {
    children.push(sectionTitle("Professional Summary"));
    children.push(paragraph(resume.summary, { justify: true }));
  }

  // Experience
  if (resume.experience.length > 0) {
    children.push(sectionTitle("Experience"));
    resume.experience.forEach((entry) => {
      children.push(leftRight(entry.role || entry.company, entry.dates, { bold: true }));
      const sub = [entry.company, entry.location].filter(Boolean).join(" — ");
      if (sub) {
        children.push(paragraph(sub, { size: 21, color: MUTED_COLOR, after: 40 }));
      }
      entry.bullets
        .filter((bullet) => bullet.trim())
        .forEach((bullet) => children.push(bulletParagraph(bullet)));
    });
  }

  // Education
  if (resume.education.length > 0) {
    children.push(sectionTitle("Education"));
    resume.education.forEach((entry) => {
      children.push(leftRight(entry.institution, entry.dates, { bold: true }));
      const sub = [entry.degree, entry.location].filter(Boolean).join(" — ");
      if (sub) {
        children.push(paragraph(sub, { size: 21, color: MUTED_COLOR, after: 40 }));
      }
      entry.details
        .filter((detail) => detail.trim())
        .forEach((detail) => children.push(bulletParagraph(detail)));
    });
  }

  // Skills
  if (resume.skills.length > 0) {
    children.push(sectionTitle("Skills"));
    children.push(paragraph(resume.skills.join("   •   ")));
  }

  // Projects
  if (resume.projects.length > 0) {
    children.push(sectionTitle("Projects"));
    resume.projects.forEach((entry) => {
      children.push(leftRight(entry.name, "", { bold: true }));
      if (entry.description.trim()) {
        children.push(paragraph(entry.description, { size: 21, color: MUTED_COLOR, after: 40 }));
      }
      entry.bullets
        .filter((bullet) => bullet.trim())
        .forEach((bullet) => children.push(bulletParagraph(bullet)));
    });
  }

  // Certifications
  if (resume.certifications.length > 0) {
    children.push(sectionTitle("Certifications"));
    resume.certifications.forEach((entry) => {
      const issuer = entry.issuer ? ` — ${entry.issuer}` : "";
      children.push(leftRight(`${entry.name}${issuer}`, entry.date));
    });
  }

  // Languages
  if (resume.languages.length > 0) {
    children.push(sectionTitle("Languages"));
    children.push(paragraph(resume.languages.join("   •   ")));
  }

  return children;
}

export async function generateResumeDocx(resume: FormattedResume): Promise<void> {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 22, color: BODY_COLOR },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 },
          },
        },
        children: buildChildren(resume),
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${sanitizeFileName(resume.contact.name)}_Resume.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
