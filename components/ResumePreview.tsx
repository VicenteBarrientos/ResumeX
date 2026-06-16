"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "@/components/LocaleProvider";
import type {
  CertificationEntry,
  EducationEntry,
  ExperienceEntry,
  FormattedResume,
  ProjectEntry,
  ResumeContact,
} from "@/lib/types";

interface ResumePreviewProps {
  resume: FormattedResume;
  onChange: (resume: FormattedResume) => void;
}

const EMPTY_EXPERIENCE: ExperienceEntry = {
  company: "",
  role: "",
  location: "",
  dates: "",
  bullets: [""],
};

const EMPTY_EDUCATION: EducationEntry = {
  institution: "",
  degree: "",
  location: "",
  dates: "",
  details: [],
};

const EMPTY_PROJECT: ProjectEntry = {
  name: "",
  description: "",
  bullets: [""],
};

const EMPTY_CERTIFICATION: CertificationEntry = {
  name: "",
  issuer: "",
  date: "",
};

const fieldClass =
  "rounded bg-transparent px-1 outline-none transition placeholder:text-zinc-400 hover:bg-zinc-100 focus:bg-indigo-50 focus:ring-1 focus:ring-indigo-300";

function Field({
  value,
  onChange,
  placeholder,
  className = "",
  ariaLabel,
  autoSize = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  autoSize?: boolean;
}) {
  const sizeAttr = autoSize
    ? Math.max(value.length, placeholder?.length ?? 0, 4)
    : undefined;

  return (
    <input
      type="text"
      value={value}
      size={sizeAttr}
      placeholder={placeholder}
      aria-label={ariaLabel ?? placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={`${fieldClass} ${className}`}
    />
  );
}

function AreaField({
  value,
  onChange,
  placeholder,
  className = "",
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel ?? placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={`w-full ${fieldClass} resize-none ${className}`}
    />
  );
}

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-zinc-300 text-zinc-400 transition hover:border-rose-400 hover:bg-rose-50 hover:text-rose-600"
    >
      <span aria-hidden className="-mt-px text-sm leading-none">×</span>
    </button>
  );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1 inline-flex items-center gap-1 rounded-full border border-dashed border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-500 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
    >
      <span aria-hidden>+</span>
      {label}
    </button>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="mb-2 border-b border-zinc-300 pb-1 text-sm font-bold uppercase tracking-[0.12em] text-zinc-800">
      {children}
    </h2>
  );
}

export default function ResumePreview({ resume, onChange }: ResumePreviewProps) {
  const { t } = useLocale();
  const f = t.formatter;

  const setContact = (patch: Partial<ResumeContact>) =>
    onChange({ ...resume, contact: { ...resume.contact, ...patch } });

  const setSummary = (summary: string) => onChange({ ...resume, summary });

  // ---- Experience ----
  const updateExperience = (index: number, patch: Partial<ExperienceEntry>) =>
    onChange({
      ...resume,
      experience: resume.experience.map((entry, i) =>
        i === index ? { ...entry, ...patch } : entry,
      ),
    });

  const setExperienceBullet = (index: number, bulletIndex: number, value: string) =>
    updateExperience(index, {
      bullets: resume.experience[index].bullets.map((b, i) =>
        i === bulletIndex ? value : b,
      ),
    });

  const addExperienceBullet = (index: number) =>
    updateExperience(index, { bullets: [...resume.experience[index].bullets, ""] });

  const removeExperienceBullet = (index: number, bulletIndex: number) =>
    updateExperience(index, {
      bullets: resume.experience[index].bullets.filter((_, i) => i !== bulletIndex),
    });

  // ---- Education ----
  const updateEducation = (index: number, patch: Partial<EducationEntry>) =>
    onChange({
      ...resume,
      education: resume.education.map((entry, i) =>
        i === index ? { ...entry, ...patch } : entry,
      ),
    });

  // ---- Projects ----
  const updateProject = (index: number, patch: Partial<ProjectEntry>) =>
    onChange({
      ...resume,
      projects: resume.projects.map((entry, i) =>
        i === index ? { ...entry, ...patch } : entry,
      ),
    });

  const setProjectBullet = (index: number, bulletIndex: number, value: string) =>
    updateProject(index, {
      bullets: resume.projects[index].bullets.map((b, i) =>
        i === bulletIndex ? value : b,
      ),
    });

  const addProjectBullet = (index: number) =>
    updateProject(index, { bullets: [...resume.projects[index].bullets, ""] });

  const removeProjectBullet = (index: number, bulletIndex: number) =>
    updateProject(index, {
      bullets: resume.projects[index].bullets.filter((_, i) => i !== bulletIndex),
    });

  // ---- Certifications ----
  const updateCertification = (index: number, patch: Partial<CertificationEntry>) =>
    onChange({
      ...resume,
      certifications: resume.certifications.map((entry, i) =>
        i === index ? { ...entry, ...patch } : entry,
      ),
    });

  // ---- Skills / Languages (chips) ----
  const setSkill = (index: number, value: string) =>
    onChange({
      ...resume,
      skills: resume.skills.map((s, i) => (i === index ? value : s)),
    });

  const setLanguage = (index: number, value: string) =>
    onChange({
      ...resume,
      languages: resume.languages.map((l, i) => (i === index ? value : l)),
    });

  return (
    <div className="mx-auto w-full max-w-[820px] rounded-2xl border border-zinc-200 bg-white p-8 font-serif text-[15px] leading-relaxed text-zinc-900 shadow-xl sm:p-12">
      {/* Header */}
      <header className="mb-5 border-b-2 border-zinc-800 pb-4 text-center">
        <Field
          value={resume.contact.name}
          onChange={(v) => setContact({ name: v })}
          placeholder={f.placeholders.name}
          ariaLabel={f.placeholders.name}
          className="w-full text-center text-3xl font-bold tracking-tight"
        />
        <Field
          value={resume.contact.title}
          onChange={(v) => setContact({ title: v })}
          placeholder={f.placeholders.title}
          ariaLabel={f.placeholders.title}
          className="mt-1 w-full text-center text-base text-zinc-600"
        />
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-1 gap-y-1 text-xs text-zinc-600">
          <Field
            value={resume.contact.location}
            onChange={(v) => setContact({ location: v })}
            placeholder={f.placeholders.location}
            className="text-center"
            autoSize
          />
          <Field
            value={resume.contact.phone}
            onChange={(v) => setContact({ phone: v })}
            placeholder={f.placeholders.phone}
            className="text-center"
            autoSize
          />
          <Field
            value={resume.contact.email}
            onChange={(v) => setContact({ email: v })}
            placeholder={f.placeholders.email}
            className="text-center"
            autoSize
          />
          <Field
            value={resume.contact.linkedin}
            onChange={(v) => setContact({ linkedin: v })}
            placeholder={f.placeholders.linkedin}
            className="text-center"
            autoSize
          />
          <Field
            value={resume.contact.website}
            onChange={(v) => setContact({ website: v })}
            placeholder={f.placeholders.website}
            className="text-center"
            autoSize
          />
        </div>
      </header>

      {/* Summary */}
      <section className="mb-5">
        <SectionTitle>{f.sections.summary}</SectionTitle>
        <AreaField
          value={resume.summary}
          onChange={setSummary}
          placeholder={f.placeholders.summary}
          className="text-justify"
        />
      </section>

      {/* Experience */}
      <section className="mb-5">
        <SectionTitle>{f.sections.experience}</SectionTitle>
        <div className="space-y-4">
          {resume.experience.map((entry, index) => (
            <div key={index} className="group/entry relative">
              <div className="absolute -right-2 -top-2 opacity-0 transition group-hover/entry:opacity-100">
                <RemoveButton
                  label={f.removeEntry}
                  onClick={() =>
                    onChange({
                      ...resume,
                      experience: resume.experience.filter((_, i) => i !== index),
                    })
                  }
                />
              </div>
              <div className="flex items-baseline gap-2">
                <Field
                  value={entry.role}
                  onChange={(v) => updateExperience(index, { role: v })}
                  placeholder={f.placeholders.role}
                  className="flex-1 font-semibold"
                />
                <Field
                  value={entry.dates}
                  onChange={(v) => updateExperience(index, { dates: v })}
                  placeholder={f.placeholders.dates}
                  className="w-40 text-right text-sm text-zinc-600"
                />
              </div>
              <div className="flex items-baseline gap-1 text-sm italic text-zinc-600">
                <Field
                  value={entry.company}
                  onChange={(v) => updateExperience(index, { company: v })}
                  placeholder={f.placeholders.company}
                  className="flex-1"
                />
                <Field
                  value={entry.location}
                  onChange={(v) => updateExperience(index, { location: v })}
                  placeholder={f.placeholders.entryLocation}
                  className="w-44 text-right"
                />
              </div>
              <ul className="mt-1 space-y-0.5">
                {entry.bullets.map((bullet, bulletIndex) => (
                  <li key={bulletIndex} className="flex items-start gap-1">
                    <span aria-hidden className="mt-1 select-none leading-none text-zinc-500">•</span>
                    <AreaField
                      value={bullet}
                      onChange={(v) => setExperienceBullet(index, bulletIndex, v)}
                      placeholder={f.placeholders.bullet}
                      className="flex-1 text-[14px]"
                    />
                    <RemoveButton
                      label={f.removeBullet}
                      onClick={() => removeExperienceBullet(index, bulletIndex)}
                    />
                  </li>
                ))}
              </ul>
              <AddButton label={f.addBullet} onClick={() => addExperienceBullet(index)} />
            </div>
          ))}
        </div>
        <AddButton
          label={f.addExperience}
          onClick={() =>
            onChange({
              ...resume,
              experience: [...resume.experience, { ...EMPTY_EXPERIENCE, bullets: [""] }],
            })
          }
        />
      </section>

      {/* Education */}
      <section className="mb-5">
        <SectionTitle>{f.sections.education}</SectionTitle>
        <div className="space-y-3">
          {resume.education.map((entry, index) => (
            <div key={index} className="group/entry relative">
              <div className="absolute -right-2 -top-2 opacity-0 transition group-hover/entry:opacity-100">
                <RemoveButton
                  label={f.removeEntry}
                  onClick={() =>
                    onChange({
                      ...resume,
                      education: resume.education.filter((_, i) => i !== index),
                    })
                  }
                />
              </div>
              <div className="flex items-baseline gap-2">
                <Field
                  value={entry.institution}
                  onChange={(v) => updateEducation(index, { institution: v })}
                  placeholder={f.placeholders.institution}
                  className="flex-1 font-semibold"
                />
                <Field
                  value={entry.dates}
                  onChange={(v) => updateEducation(index, { dates: v })}
                  placeholder={f.placeholders.dates}
                  className="w-40 text-right text-sm text-zinc-600"
                />
              </div>
              <div className="flex items-baseline gap-1 text-sm italic text-zinc-600">
                <Field
                  value={entry.degree}
                  onChange={(v) => updateEducation(index, { degree: v })}
                  placeholder={f.placeholders.degree}
                  className="flex-1"
                />
                <Field
                  value={entry.location}
                  onChange={(v) => updateEducation(index, { location: v })}
                  placeholder={f.placeholders.entryLocation}
                  className="w-44 text-right"
                />
              </div>
            </div>
          ))}
        </div>
        <AddButton
          label={f.addEducation}
          onClick={() =>
            onChange({
              ...resume,
              education: [...resume.education, { ...EMPTY_EDUCATION, details: [] }],
            })
          }
        />
      </section>

      {/* Skills */}
      <section className="mb-5">
        <SectionTitle>{f.sections.skills}</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {resume.skills.map((skill, index) => (
            <span
              key={index}
              className="group/chip inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-sm"
            >
              <Field
                value={skill}
                onChange={(v) => setSkill(index, v)}
                placeholder={f.placeholders.skill}
                autoSize
              />
              <button
                type="button"
                aria-label={f.removeItem}
                title={f.removeItem}
                onClick={() =>
                  onChange({
                    ...resume,
                    skills: resume.skills.filter((_, i) => i !== index),
                  })
                }
                className="text-zinc-400 opacity-0 transition hover:text-rose-600 group-hover/chip:opacity-100"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <AddButton
          label={f.addSkill}
          onClick={() => onChange({ ...resume, skills: [...resume.skills, ""] })}
        />
      </section>

      {/* Projects */}
      <section className="mb-5">
        <SectionTitle>{f.sections.projects}</SectionTitle>
        <div className="space-y-4">
          {resume.projects.map((entry, index) => (
            <div key={index} className="group/entry relative">
              <div className="absolute -right-2 -top-2 opacity-0 transition group-hover/entry:opacity-100">
                <RemoveButton
                  label={f.removeEntry}
                  onClick={() =>
                    onChange({
                      ...resume,
                      projects: resume.projects.filter((_, i) => i !== index),
                    })
                  }
                />
              </div>
              <Field
                value={entry.name}
                onChange={(v) => updateProject(index, { name: v })}
                placeholder={f.placeholders.projectName}
                className="w-full font-semibold"
              />
              <AreaField
                value={entry.description}
                onChange={(v) => updateProject(index, { description: v })}
                placeholder={f.placeholders.projectDescription}
                className="text-sm italic text-zinc-600"
              />
              <ul className="mt-1 space-y-0.5">
                {entry.bullets.map((bullet, bulletIndex) => (
                  <li key={bulletIndex} className="flex items-start gap-1">
                    <span aria-hidden className="mt-1 select-none leading-none text-zinc-500">•</span>
                    <AreaField
                      value={bullet}
                      onChange={(v) => setProjectBullet(index, bulletIndex, v)}
                      placeholder={f.placeholders.bullet}
                      className="flex-1 text-[14px]"
                    />
                    <RemoveButton
                      label={f.removeBullet}
                      onClick={() => removeProjectBullet(index, bulletIndex)}
                    />
                  </li>
                ))}
              </ul>
              <AddButton label={f.addBullet} onClick={() => addProjectBullet(index)} />
            </div>
          ))}
        </div>
        <AddButton
          label={f.addProject}
          onClick={() =>
            onChange({
              ...resume,
              projects: [...resume.projects, { ...EMPTY_PROJECT, bullets: [""] }],
            })
          }
        />
      </section>

      {/* Certifications */}
      <section className="mb-5">
        <SectionTitle>{f.sections.certifications}</SectionTitle>
        <div className="space-y-2">
          {resume.certifications.map((entry, index) => (
            <div key={index} className="group/entry relative flex items-baseline gap-2">
              <Field
                value={entry.name}
                onChange={(v) => updateCertification(index, { name: v })}
                placeholder={f.placeholders.certName}
                className="flex-1 font-medium"
              />
              <Field
                value={entry.issuer}
                onChange={(v) => updateCertification(index, { issuer: v })}
                placeholder={f.placeholders.certIssuer}
                className="w-40 text-sm italic text-zinc-600"
              />
              <Field
                value={entry.date}
                onChange={(v) => updateCertification(index, { date: v })}
                placeholder={f.placeholders.certDate}
                className="w-28 text-right text-sm text-zinc-600"
              />
              <RemoveButton
                label={f.removeEntry}
                onClick={() =>
                  onChange({
                    ...resume,
                    certifications: resume.certifications.filter((_, i) => i !== index),
                  })
                }
              />
            </div>
          ))}
        </div>
        <AddButton
          label={f.addCertification}
          onClick={() =>
            onChange({
              ...resume,
              certifications: [...resume.certifications, { ...EMPTY_CERTIFICATION }],
            })
          }
        />
      </section>

      {/* Languages */}
      <section>
        <SectionTitle>{f.sections.languages}</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {resume.languages.map((language, index) => (
            <span
              key={index}
              className="group/chip inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-sm"
            >
              <Field
                value={language}
                onChange={(v) => setLanguage(index, v)}
                placeholder={f.placeholders.language}
                autoSize
              />
              <button
                type="button"
                aria-label={f.removeItem}
                title={f.removeItem}
                onClick={() =>
                  onChange({
                    ...resume,
                    languages: resume.languages.filter((_, i) => i !== index),
                  })
                }
                className="text-zinc-400 opacity-0 transition hover:text-rose-600 group-hover/chip:opacity-100"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <AddButton
          label={f.addLanguage}
          onClick={() => onChange({ ...resume, languages: [...resume.languages, ""] })}
        />
      </section>
    </div>
  );
}
