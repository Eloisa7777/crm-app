
// ============================================================
// CRM Proxy
// 1. 公开登录、登出及静态资源
// 2. 验证 Firebase Session Cookie
// 3. 未登录或 Session 无效时跳转登录页
// 4. 所有已登录用户均可访问页面，不区分角色
//
// 注意：API 的数据读写权限仍需在各自的服务端 Route Handler
// 中单独验证，不能仅依赖 Proxy。
// ============================================================

import { NextResponse, type NextRequest } from "next/server";
import { getFirebaseAdminServices } from "@/lib/firebaseAdmin";

const SESSION_COOKIE_NAME = "yj_session";

const PUBLIC_PATHS = [
  "/login",
  "/api/login",
  "/api/logout",
];

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
  // 1. Public pages and static resources
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
  // 2. API requests
  // API permissions must be checked in their own Route Handlers.
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
  // 4. Verify Firebase Session
  // No role checks; any valid signed-in user can access pages.
  // ----------------------------------------------------------

  try {
    const { adminAuth } = getFirebaseAdminServices();

    await adminAuth.verifySessionCookie(sessionCookie, false);

    return NextResponse.next();
  } catch (error) {
    // Do not log raw credentials or token-related error messages.
    console.error("[Proxy] Session verification failed", {
      code:
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : "unknown",
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
}

// ============================================================
// Proxy matcher
// ============================================================

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.png).*)",
  ],
};
