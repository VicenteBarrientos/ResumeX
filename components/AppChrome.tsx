"use client";

import { usePathname } from "next/navigation";
import AppNav from "@/components/AppNav";
import Footer from "@/components/Footer";
import LanguageToggle from "@/components/LanguageToggle";
import SiteLinks from "@/components/SiteLinks";
import { isTalentAppPath } from "@/lib/products";

/**
 * Career / marketing / auth keep the floating top chrome + footer.
 * Talent app routes (`/talent/mapper` …) own their own sidebar shell and
 * suppress this chrome so the two products do not stack navigation.
 */
export default function AppChrome({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const talentApp = isTalentAppPath(pathname);

  if (talentApp) {
    return <div className="relative flex min-h-screen flex-col">{children}</div>;
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="pointer-events-none fixed inset-x-4 top-4 z-50 flex items-start justify-between gap-3 sm:inset-x-6 lg:inset-x-8">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <AppNav />
          <SiteLinks />
        </div>
        <div className="pointer-events-auto flex shrink-0 items-center gap-2">
          <LanguageToggle />
        </div>
      </div>
      <main className="flex-1 pt-16 sm:pt-20">{children}</main>
      <Footer />
    </div>
  );
}
