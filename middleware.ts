import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isThemeMode } from "@/lib/theme-sync";

export function middleware(request: NextRequest) {
  const theme = request.nextUrl.searchParams.get("theme");

  if (!isThemeMode(theme)) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.cookies.set("talentx-theme", theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
