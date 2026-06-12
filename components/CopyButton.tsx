"use client";

import { useEffect, useState } from "react";

interface CopyButtonProps {
  text: string;
  label?: string;
}

const COPIED_DURATION_MS = 2000;

export default function CopyButton({ text, label = "Copy" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopied(false);
    }, COPIED_DURATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex shrink-0 items-center rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/15 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-cyan-400/30 dark:hover:bg-cyan-400/10"
      aria-label={copied ? "Copied to clipboard" : `Copy ${label.toLowerCase()}`}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
