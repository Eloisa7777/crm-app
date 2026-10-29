
import { NextResponse, type NextRequest } from "next/server";
import { getFirebaseAdminServices } from "@/lib/firebaseAdmin";

// ============================================================
// 1. Public routes
// ============================================================

const PUBLIC_PATHS = [
  "/login",
  "/api/login",
  "/api/logout",
];

// ============================================================
// 2. Page permissions
// ============================================================

const PO_ALLOWED_PATHS = [
  "/purchase-orders",
  "/suppliers",
  "/subcontractors",
];

const EST_ALLOWED_PATHS = [
  "/quote",
  "/clients",
];

const VALID_ROLES = ["admin", "yjpo", "yjest"];

const SESSION_COOKIE_NAME = "__session";

// ============================================================
// 3. Helpers
// ============================================================

function matchesPath(pathname: string, allowedPaths: string[]) {
  return allowedPaths.some(
    (path) =>
      pathname === path || pathname.startsWith(`${path}/`)
  );
}

function redirectToLogin(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL("/login", request.url)
  );

  // Clear invalid or expired sessions.
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  // Remove legacy authentication cookies.
  response.cookies.set({
    name: "yj_auth",
    value: "",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set({
    name: "yj_role",
    value: "",
    path: "/",
    maxAge: 0,
  });

  return response;
}

// ============================================================
// 4. Main Proxy
// ============================================================

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public pages and authentication endpoints.
  if (matchesPath(pathname, PUBLIC_PATHS)) {
    return NextResponse.next();
  }

  // The matcher below excludes static assets.
  // Check Firebase session instead of trusting old cookies.
  const sessionCookie =
    request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    return redirectToLogin(request);
  }

  let decodedToken;

  try {
    const { adminAuth } = getFirebaseAdminServices();

    // Verify the signature, expiry and revocation status.
    decodedToken = await adminAuth.verifySessionCookie(
      sessionCookie,
      true
    );
  } catch (error) {
    console.error("[Proxy] Session verification failed:", {
      code: (error as { code?: string })?.code,
      message: (error as { message?: string })?.message,
    });

    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    return redirectToLogin(request);
  }

  // Read role from the verified Firebase token.
  const role = decodedToken.role;

  if (
    typeof role !== "string" ||
    !VALID_ROLES.includes(role)
) {
  console.error("[Proxy] User role is missing or invalid:", {
    uid: decodedToken.uid,
    role: role ?? null,
    validRoles: VALID_ROLES,
  });

    return redirectToLogin(request);
  }

  // ==========================================================
  // 5. API routes
  // ==========================================================
  // This verifies the session only.
  // Each protected API handler must also enforce role permissions.

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // ==========================================================
  // 6. YJ PO role
  // ==========================================================

  if (
    role === "yjpo" &&
    !matchesPath(pathname, PO_ALLOWED_PATHS)
  ) {
    return NextResponse.redirect(
      new URL("/purchase-orders", request.url)
    );
  }

  // ==========================================================
  // 7. YJ Estimator role
  // ==========================================================

  if (
    role === "yjest" &&
    !matchesPath(pathname, EST_ALLOWED_PATHS)
  ) {
    return NextResponse.redirect(
      new URL("/quote", request.url)
    );
  }

  // Admin can access all authenticated pages.
  return NextResponse.next();
}

// ============================================================
// 8. Proxy matcher
// ============================================================

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.png).*)",
  ],
};
