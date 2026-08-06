import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppChrome from "@/components/AppChrome";
import AuthProvider from "@/components/AuthProvider";
import LocaleProvider from "@/components/LocaleProvider";
import LocaleSync from "@/components/LocaleSync";
import { RESUMEX_URL } from "@/lib/constants";
import { localeInitScript } from "@/lib/locale-sync";
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
  title: "ResumeX — personal job-search tools",
  description:
    "Private workspace: format a CV, check job fit, draft cover letters, and track applications. For personal use for now.",
  metadataBase: new URL(RESUMEX_URL),
  openGraph: {
    title: "ResumeX — personal job-search tools",
    description:
      "Private workspace for CV formatting, job-fit analysis, cover letters, and application tracking.",
    siteName: "ResumeX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ResumeX — personal job-search tools",
    description:
      "Private workspace for CV formatting, job-fit analysis, cover letters, and application tracking.",
  },
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
        <script dangerouslySetInnerHTML={{ __html: localeInitScript }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <AuthProvider>
          <LocaleProvider defaultLocale="en">
            <LocaleSync />
            <AppChrome>{children}</AppChrome>
          </LocaleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
