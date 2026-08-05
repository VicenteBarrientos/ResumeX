import CopyButton from "@/components/CopyButton";

interface SectionHeaderProps {
  title: string;
  copyText: string;
  copyLabel?: string;
  copiedLabel?: string;
}

export default function SectionHeader({
  title,
  copyText,
  copyLabel = "Copy",
  copiedLabel = "Copied!",
}: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
        {title}
      </h3>
      <CopyButton
        text={copyText}
        label={copyLabel}
        copiedLabel={copiedLabel}
      />
    </div>
  );
}
