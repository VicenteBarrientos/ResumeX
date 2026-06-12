import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Footer from "@/components/Footer";
import ThemeProvider from "@/components/ThemeProvider";
import ThemeSync from "@/components/ThemeSync";
import ThemeToggle from "@/components/ThemeToggle";
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
  title: "ResumeX — AI Resume Match Analyzer",
  description:
    "Compare your resume to any job description. Get match scores, keyword gaps, and tailored suggestions.",
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
      </head>
      <body className="flex min-h-screen flex-col">
        <ThemeProvider defaultTheme="light">
          <ThemeSync />
          <div className="relative flex min-h-screen flex-col">
            <div className="pointer-events-none fixed right-4 top-4 z-50 sm:right-6 lg:right-8">
              <div className="pointer-events-auto">
                <ThemeToggle />
              </div>
            </div>
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
