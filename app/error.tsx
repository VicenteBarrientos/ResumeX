"use client";

import { useEffect } from "react";
import ErrorPageLayout from "@/components/ErrorPageLayout";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ResumeX] Application error:", error);
  }, [error]);

  return (
    <ErrorPageLayout
      title="Something went wrong"
      message="An unexpected error occurred while loading this page. Please try again."
      action={{ label: "Try again", onClick: reset }}
    />
  );
}
