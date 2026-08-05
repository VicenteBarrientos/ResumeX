"use client";

import ErrorPageLayout from "@/components/ErrorPageLayout";

export default function TalentMapperError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorPageLayout
      title="Talent Mapper hit a snag"
      message={
        error.message ||
        "Something went wrong loading Talent Mapper. You can retry or return home."
      }
      action={{ label: "Try again", onClick: reset }}
    />
  );
}
