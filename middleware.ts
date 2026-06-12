import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isLocale } from "@/lib/locale-sync";
import { isThemeMode } from "@/lib/theme-sync";

export function middleware(request: NextRequest) {
  const theme = request.nextUrl.searchParams.get("theme");
  const lang = request.nextUrl.searchParams.get("lang");

  if (!isThemeMode(theme) && !isLocale(lang)) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

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

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
