
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/api/login",
  "/api/logout",
];

const PO_ALLOWED_PATHS = [
  "/purchase-orders",
  "/suppliers",
];

const EST_ALLOWED_PATHS = [
  "/quote",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /* =====================================================
     Public pages / APIs / static assets
  ===================================================== */

  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/logo.png" ||
    PUBLIC_PATHS.some(
      (path) =>
        pathname === path ||
        pathname.startsWith(`${path}/`)
    )
  ) {
    return NextResponse.next();
  }

  /* =====================================================
     Authentication
  ===================================================== */

  const authCookie = request.cookies.get("yj_auth");
  const roleCookie = request.cookies.get("yj_role");

  // Not logged in
  if (
    !authCookie ||
    authCookie.value !== "authenticated"
  ) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  /* =====================================================
     YJ PO User
     Only suppliers and purchase orders are allowed
  ===================================================== */

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

  /* =====================================================
     YJ Estimator User
     Only quote and clients are allowed
  ===================================================== */

  if (roleCookie?.value === "yjest") {
    const isAllowed = EST_ALLOWED_PATHS.some(
      (path) =>
        pathname === path ||
        pathname.startsWith(`${path}/`)
    );

    if (!isAllowed) {
      return NextResponse.redirect(
        new URL("/quote", request.url)
      );
    }
  }

  return NextResponse.next();
}

/* =====================================================
   Proxy Matcher

   Static assets are excluded from proxy completely.
===================================================== */

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.png).*)",
  ],
};

