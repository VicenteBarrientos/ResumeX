import TalentAppShell from "@/components/talent/TalentAppShell";

/**
 * Talent tool routes (Mapper, Assess, Saved searches, ATS) share the
 * Ashby-like sidebar shell. Marketing `/talent` lives in `(marketing)` and
 * keeps the floating Career chrome via AppChrome.
 */
export default function TalentAppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <TalentAppShell>{children}</TalentAppShell>;
}
