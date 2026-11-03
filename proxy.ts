
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
// 2. CRM page permissions
//
// Firestore roles/{roleId}.permissions
// ============================================================

const PAGE_PERMISSIONS = [
  {
    paths: ["/"],
    permission: "dashboard",
    fallback: "/login",
  },
  {
    paths: ["/dashboard"],
    permission: "dashboard",
    fallback: "/login",
  },
  {
    paths: ["/purchase-orders"],
    permission: "purchaseOrders",
    fallback: "/login",
  },
  {
    paths: ["/suppliers"],
    permission: "suppliers",
    fallback: "/login",
  },
  {
    paths: ["/subcontractors"],
    permission: "subcontractors",
    fallback: "/login",
  },
  {
    paths: ["/quote"],
    permission: "quote",
    fallback: "/login",
  },
  {
    paths: ["/clients"],
    permission: "clients",
    fallback: "/login",
  },
  {
    paths: ["/sub-invoices"],
    permission: "subInvoices",
    fallback: "/login",
  },
  {
    paths: ["/settings"],
    permission: "settings",
    fallback: "/login",
  },
];

// ============================================================
// 3. Session Cookie
// ============================================================

const SESSION_COOKIE_NAME = "yj_session";

// ============================================================
// 4. Helpers
// ============================================================

function matchesPath(
  pathname: string,
  allowedPaths: string[]
) {
  return allowedPaths.some(
    (path) =>
      pathname === path ||
      pathname.startsWith(`${path}/`)
  );
}

function isPublicPath(pathname: string) {
  return matchesPath(pathname, PUBLIC_PATHS);
}

function redirectToLogin(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL("/login", request.url)
  );

  // Clear invalid session cookie.
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  // Clear legacy authentication cookies.
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

function unauthorizedApi(
  message: string,
  status = 401
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

// ============================================================
// 5. Main Proxy
// ============================================================

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ----------------------------------------------------------
  // 5.1 Public routes
  // ----------------------------------------------------------

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const isApi = pathname.startsWith("/api/");

  // ----------------------------------------------------------
  // 5.2 Read Firebase Session Cookie
  // ----------------------------------------------------------

  const sessionCookie =
    request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    if (isApi) {
      return unauthorizedApi("AUTHENTICATION_REQUIRED", 401);
    }

    return redirectToLogin(request);
  }

  try {
    // --------------------------------------------------------
    // 5.3 Initialize Firebase Admin
    // --------------------------------------------------------

    const { adminAuth, adminDb } =
      getFirebaseAdminServices();

    // --------------------------------------------------------
    // 5.4 Verify Firebase Session Cookie
    // --------------------------------------------------------

    const decodedToken =
      await adminAuth.verifySessionCookie(
        sessionCookie,
        true
      );

    const uid = decodedToken.uid;

    if (!uid) {
      if (isApi) {
        return unauthorizedApi("INVALID_SESSION", 401);
      }

      return redirectToLogin(request);
    }

    // --------------------------------------------------------
    // 5.5 Read Firestore User
    //
    // Collection: users
    // Document: Firebase UID
    // --------------------------------------------------------

    const userSnapshot = await adminDb
      .collection("users")
      .doc(uid)
      .get();

    if (!userSnapshot.exists) {
      if (isApi) {
        return unauthorizedApi("USER_NOT_FOUND", 403);
      }

      return redirectToLogin(request);
    }

    const userData = userSnapshot.data() || {};

    // --------------------------------------------------------
    // 5.6 Check User Active Status
    //
    // Actual field: Active
    // Actual type: Boolean
    // --------------------------------------------------------

    if (userData.Active !== true) {
      if (isApi) {
        return unauthorizedApi("USER_INACTIVE", 403);
      }

      return redirectToLogin(request);
    }

    // --------------------------------------------------------
    // 5.7 Get Role ID
    //
    // Actual field: roleId
    // Example: admin
    // --------------------------------------------------------

    const roleId = userData.roleId;

    if (
      typeof roleId !== "string" ||
      !roleId.trim()
    ) {
      if (isApi) {
        return unauthorizedApi("MISSING_ROLE", 403);
      }

      return redirectToLogin(request);
    }

    // --------------------------------------------------------
    // 5.8 Read Firestore Role
    //
    // Collection: roles
    // Document: roleId
    // Example: roles/admin
    // --------------------------------------------------------

    const roleSnapshot = await adminDb
      .collection("roles")
      .doc(roleId)
      .get();

    if (!roleSnapshot.exists) {
      if (isApi) {
        return unauthorizedApi("ROLE_NOT_FOUND", 403);
      }

      return redirectToLogin(request);
    }

    const roleData = roleSnapshot.data() || {};

    // --------------------------------------------------------
    // 5.9 Validate Role Name
    // --------------------------------------------------------

    if (
      typeof roleData.rolename !== "string" ||
      roleData.rolename.toLowerCase() !==
        roleId.toLowerCase()
    ) {
      if (isApi) {
        return unauthorizedApi("INVALID_ROLE", 403);
      }

      return redirectToLogin(request);
    }

    // --------------------------------------------------------
    // 5.10 Read Firestore Permissions
    //
    // Actual structure:
    //
    // permissions: {
    //   dashboard: true,
    //   clients: true,
    //   purchaseOrders: true,
    //   quote: true,
    //   settings: true,
    //   subInvoices: true,
    //   subcontractors: true,
    //   suppliers: true
    // }
    // --------------------------------------------------------

    const permissions = roleData.permissions || {};

    // --------------------------------------------------------
    // 5.11 API Routes
    //
    // Proxy checks authentication and valid role.
    // Each API handler must enforce its own permissions.
    // --------------------------------------------------------

    if (isApi) {
      const requestHeaders = new Headers(request.headers);

      // Pass verified identity to downstream handlers.
      // These headers are overwritten, not trusted from client.
      requestHeaders.set("x-crm-uid", uid);
      requestHeaders.set("x-crm-role-id", roleId);

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    // --------------------------------------------------------
    // 5.12 Admin Access
    //
    // roleId = admin can access all CRM pages.
    // --------------------------------------------------------

    if (roleId === "admin") {
      return NextResponse.next();
    }

    // --------------------------------------------------------
    // 5.13 Check Page Permission
    // --------------------------------------------------------

    const pageRule = PAGE_PERMISSIONS.find(
      (rule) => matchesPath(pathname, rule.paths)
    );

    // Unknown routes:
    // Do not block authenticated routes that are not listed.
    if (!pageRule) {
      return NextResponse.next();
    }

    const hasPermission =
      permissions[pageRule.permission] === true;

    if (!hasPermission) {
      console.warn("[Proxy] Permission denied:", {
        uid,
        roleId,
        pathname,
        permission: pageRule.permission,
      });

      return NextResponse.redirect(
        new URL(pageRule.fallback, request.url)
      );
    }

    // --------------------------------------------------------
    // 5.14 Access Granted
    // --------------------------------------------------------

    return NextResponse.next();

  } catch (error) {
    console.error("[Proxy] Authentication/RBAC failed:", {
      message:
        error instanceof Error
          ? error.message
          : String(error),
    });

    if (isApi) {
      return unauthorizedApi("INVALID_SESSION", 401);
    }

    return redirectToLogin(request);
  }
}

// ============================================================
// 6. Proxy Matcher
// ============================================================

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.png).*)",
  ],
};
