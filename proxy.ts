import { NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/api/login",
  "/api/logout",
];

const PO_ALLOWED_PATHS = [
  "/purchase-orders",
  "/suppliers",
];

export function proxy(request) {
  const { pathname } = request.nextUrl;

  // Public pages / APIs
  if (
    PUBLIC_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    )
  ) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get("yj_auth");
  const roleCookie = request.cookies.get("yj_role");

  // Not logged in
  if (!authCookie || authCookie.value !== "authenticated") {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  // PO user
  if (roleCookie?.value === "yjpo") {
    const isAllowed = PO_ALLOWED_PATHS.some(
      (path) =>
        pathname === path ||
        pathname.startsWith(`${path}/`)
    );

    if (!isAllowed) {
      return NextResponse.redirect(
        new URL("/purchase-orders", request.url)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};