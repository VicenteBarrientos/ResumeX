import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppNav from "@/components/AppNav";
import Footer from "@/components/Footer";
import LanguageToggle from "@/components/LanguageToggle";
import SiteLinks from "@/components/SiteLinks";
import LocaleProvider from "@/components/LocaleProvider";
import LocaleSync from "@/components/LocaleSync";
import ThemeProvider from "@/components/ThemeProvider";
import ThemeSync from "@/components/ThemeSync";
import ThemeToggle from "@/components/ThemeToggle";
import { localeInitScript } from "@/lib/locale-sync";
import { themeInitScript } from "@/lib/theme-sync";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ResumeX — Turn any resume into a polished CV",
  description:
    "Turn any resume into a polished, professional CV in one click. Format, edit, and export to PDF or DOCX — plus an AI job-description match analyzer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: localeInitScript }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <ThemeProvider defaultTheme="light">
          <LocaleProvider defaultLocale="en">
            <ThemeSync />
            <LocaleSync />
            <div className="relative flex min-h-screen flex-col">
              <div className="pointer-events-none fixed inset-x-4 top-4 z-50 flex items-start justify-between gap-3 sm:inset-x-6 lg:inset-x-8">
                <div className="pointer-events-auto flex flex-wrap items-center gap-2">
                  <AppNav />
                  <SiteLinks />
                </div>
                <div className="pointer-events-auto flex shrink-0 items-center gap-2">
                  <LanguageToggle />
                  <ThemeToggle />
                </div>
              </div>
              <main className="flex-1 pt-16 sm:pt-20">{children}</main>
              <Footer />
            </div>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
