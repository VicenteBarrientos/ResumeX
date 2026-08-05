"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { trackEvent, type AnalyticsEventName } from "@/lib/analytics";

type TrackedLinkProps = ComponentProps<typeof Link> & {
  event: AnalyticsEventName;
};

export default function TrackedLink({ event, onClick, ...props }: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        trackEvent(event);
        onClick?.(e);
      }}
    />
  );
}
