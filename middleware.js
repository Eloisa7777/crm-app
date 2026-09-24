import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Login page and login API don't require authentication
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/login")
  ) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get("yj_auth");

  if (!authCookie || authCookie.value !== "authenticated") {
    const loginUrl = new URL("/login", request.url);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};