
import { NextResponse, type NextRequest } from "next/server";
import { getFirebaseAdminServices } from "@/lib/firebaseAdmin";

// ============================================================
// 1. Public routes
// ============================================================

const PUBLIC_PATHS = [
  "/login",
  "/api/login",
  "/api/logout",
  //"/api/admin/set-test-role",
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

const SUBSUP_ALLOWED_PATHS = [
  "/sub-invoices",
];

const VALID_ROLES = [
  "admin",
  "yjpo",
  "yjest",
  "subsup",
];

const SESSION_COOKIE_NAME = "yj_session";

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

  // Clear invalid or expired session.
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

  // Allow public routes.
  if (matchesPath(pathname, PUBLIC_PATHS)) {
    return NextResponse.next();
  }

  // Read Firebase session.
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

    // Verify signature, expiry and revocation.
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

  // Read role from verified Firebase token.
  const role = decodedToken.role;

  if (
    typeof role !== "string" ||
    !VALID_ROLES.includes(role)
  ) {
    console.error("[Proxy] Invalid CRM role:", {
      uid: decodedToken.uid,
      role: role ?? null,
    });

    return redirectToLogin(request);
  }

  // ==========================================================
  // 5. API routes
  // ==========================================================

  // Proxy verifies authentication only.
  // Each API handler must enforce its own role permissions.
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

  // ==========================================================
  // 8. Subcontractor / Supplier role
  // ==========================================================

  if (
    role === "subsup" &&
    !matchesPath(pathname, SUBSUP_ALLOWED_PATHS)
  ) {
    return NextResponse.redirect(
      new URL("/sub-invoices", request.url)
    );
  }

  // Admin can access all authenticated pages.
  return NextResponse.next();
}

// ============================================================
// 9. Proxy matcher
// ============================================================

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.png).*)",
  ],
};
