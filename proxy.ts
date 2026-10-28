
import { NextResponse, type NextRequest } from "next/server";
import { getFirebaseAdminServices } from "@/lib/firebaseAdmin";

// ============================================================
// CRM Proxy
// 1. 验证 Firebase Session Cookie
// 2. 从已验证的 Session 读取角色
// 3. 限制不同角色的页面访问
//
// 注意：API 仍必须在各自的服务端 Route Handler 中验证权限。
// ============================================================

const SESSION_COOKIE_NAME = "yj_session";

const PUBLIC_PATHS = [
  "/login",
  "/api/login",
  "/api/logout",
];

const PO_ALLOWED_PATHS = [
  "/purchase-orders",
  "/suppliers",
  "/subcontractors",
];

const EST_ALLOWED_PATHS = [
  "/quote",
  "/clients",
];

const ALLOWED_ROLES = new Set([
  "admin",
  "yjpo",
  "yjest",
]);

function matchesPath(pathname: string, allowedPaths: string[]) {
  return allowedPaths.some(
    (path) =>
      pathname === path ||
      pathname.startsWith(`${path}/`)
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ----------------------------------------------------------
  // 1. Public pages and APIs
  // ----------------------------------------------------------

  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/logo.png" ||
    matchesPath(pathname, PUBLIC_PATHS)
  ) {
    return NextResponse.next();
  }

  // ----------------------------------------------------------
  // 2. API requests must verify Session in their own handlers.
  // Do not redirect API clients to an HTML login page.
  // ----------------------------------------------------------

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // ----------------------------------------------------------
  // 3. Read Firebase Session Cookie
  // ----------------------------------------------------------

  const sessionCookie = request.cookies.get(
    SESSION_COOKIE_NAME
  )?.value;

  if (!sessionCookie) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  // ----------------------------------------------------------
  // 4. Verify Session and read trusted role claims
  // ----------------------------------------------------------

  let role: string;

  try {
    const { adminAuth } = getFirebaseAdminServices();

    // Verify the Firebase Session signature, expiry and claims.
    // Revocation is checked separately by sensitive server APIs.
    const decoded = await adminAuth.verifySessionCookie(
      sessionCookie,
      false
    );

    if (
      typeof decoded.role !== "string" ||
      !ALLOWED_ROLES.has(decoded.role)
    ) {
      throw new Error("UNAUTHORIZED_CRM_ROLE");
    }

    role = decoded.role;
  } catch (error) {
    console.error("[Proxy] Session verification failed", {
      message:
        error instanceof Error
          ? error.message
          : "Unknown error",
    });

    const response = NextResponse.redirect(
      new URL("/login", request.url)
    );

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  }

  // ----------------------------------------------------------
  // 5. Role-based page access
  // ----------------------------------------------------------

  if (role === "yjpo") {
    if (!matchesPath(pathname, PO_ALLOWED_PATHS)) {
      return NextResponse.redirect(
        new URL("/purchase-orders", request.url)
      );
    }
  }

  if (role === "yjest") {
    if (!matchesPath(pathname, EST_ALLOWED_PATHS)) {
      return NextResponse.redirect(
        new URL("/quote", request.url)
      );
    }
  }

  // admin can access all matched pages.
  return NextResponse.next();
}

// ============================================================
// Proxy matcher
// ============================================================

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.png).*)",
  ],
};
