import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isLocale } from "@/lib/locale-sync";
import { isThemeMode } from "@/lib/theme-sync";

/** Tool and account routes — require sign-in. Marketing, auth, and webhooks stay public. */
const PROTECTED_PREFIXES = [
  "/cv",
  "/analyzer",
  "/autoapply",
  "/jobs",
  "/jobsearcher",
  "/cover-letter",
  "/tracker",
  "/onboarding",
  "/extension-auth",
  "/formatter",
  "/upgrade",
  "/talent-mapper",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function applyThemeLocaleCookies(request: NextRequest, response: NextResponse) {
  const theme = request.nextUrl.searchParams.get("theme");
  const lang = request.nextUrl.searchParams.get("lang");

  if (isThemeMode(theme)) {
    response.cookies.set("talentx-theme", theme, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  if (isLocale(lang)) {
    response.cookies.set("talentx-locale", lang, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isProtectedPath(pathname)) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }
  }

  const response = NextResponse.next();
  return applyThemeLocaleCookies(request, response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
