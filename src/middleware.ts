import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPrefixes = ["/dashboard", "/projects", "/tasks", "/admin"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasRefreshToken = request.cookies.has("refreshToken");

  if (pathname === "/") {
    const dest = hasRefreshToken ? "/dashboard" : "/login";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (pathname === "/login" && hasRefreshToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected && !hasRefreshToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};