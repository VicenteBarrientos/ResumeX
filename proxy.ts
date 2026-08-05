import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isLocale } from "@/lib/locale-sync";

/**
 * Tool and account routes — require sign-in. Marketing, auth, and webhooks stay public.
 *
 * Whole-product prefixes, except that `/talent` is a public landing page and every
 * tool under `/talent/*` is gated. The old flat routes are 308'd into these segments
 * by `next.config.ts`, and those redirects run before this proxy.
 */
const PROTECTED_PREFIXES = [
  "/career",
  "/extension-auth",
  "/upgrade",
];

function isProtectedPath(pathname: string): boolean {
  if (pathname === "/talent" || pathname === "/talent/") {
    return false;
  }

  if (pathname.startsWith("/talent/")) {
    return true;
  }

  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/** ResumeX is dark-only, so an inbound `?theme=` param is ignored. */
function applyLocaleCookie(request: NextRequest, response: NextResponse) {
  const lang = request.nextUrl.searchParams.get("lang");

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
  return applyLocaleCookie(request, response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
