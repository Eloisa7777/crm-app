
import { NextResponse, type NextRequest } from "next/server";
import { getFirebaseAdminServices } from "@/lib/firebaseAdmin";

// ============================================================
// CRM Proxy
// 1. 放行登录页面和公开资源
// 2. API 由各自的 Route Handler 独立验证
// 3. 其他页面只验证 Firebase Session Cookie
// 4. 暂时不限制用户角色
// ============================================================

const SESSION_COOKIE_NAME = "yj_session";

const PUBLIC_PATHS = [
  "/login",
  "/api/login",
  "/api/logout",
];

function matchesPath(pathname: string, paths: string[]) {
  return paths.some(
    (path) =>
      pathname === path ||
      pathname.startsWith(`${path}/`)
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Public pages and static resources
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/logo.png" ||
    matchesPath(pathname, PUBLIC_PATHS)
  ) {
    return NextResponse.next();
  }

  // 2. API endpoints must perform their own authentication.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // 3. Read the Firebase Session Cookie.
  const sessionCookie = request.cookies.get(
    SESSION_COOKIE_NAME
  )?.value;

  if (!sessionCookie) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  // 4. Verify Session only. No role checks for now.
  try {
    const { adminAuth } = getFirebaseAdminServices();

    await adminAuth.verifySessionCookie(
      sessionCookie,
      false
    );

    return NextResponse.next();
  } catch (error) {
    console.error("[Proxy] Session verification failed", {
      code:
        error instanceof Error && "code" in error
          ? String(error.code)
          : "unknown",
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
      secure:
        process.env.NODE_ENV === "production" ||
        process.env.VERCEL === "1",
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
