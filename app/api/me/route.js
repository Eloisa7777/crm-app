
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getFirebaseAdminServices } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================
// 1. Configuration
// ============================================================

const VALID_ROLES = [
  "admin",
  "yjpo",
  "yjest",
  "subsup",
];

const SESSION_COOKIE_NAME = "yj_session";

// Permissions supported by CRM Sidebar and Proxy
const PERMISSION_KEYS = [
  "dashboard",
  "quote",
  "projects",
  "suppliers",
  "subcontractors",
  "clients",
  "purchaseOrders",
  "bills",
  "invoices",
  "subInvoices",
  "settings",
];

// ============================================================
// 2. GET /api/me
//
// Authentication:
//   Firebase Session Cookie
//
// Firestore:
//   users/{uid}
//   roles/{roleId}
//
// Returns:
//   authenticated
//   uid
//   email
//   role
//   permissions
// ============================================================

export async function GET() {
  try {
    // ========================================================
    // 3. Read session cookie
    // ========================================================

    const cookieStore = await cookies();

    const sessionCookie = cookieStore.get(
      SESSION_COOKIE_NAME
    )?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        {
          authenticated: false,
          stage: "cookie",
          error: "No session found",
        },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    // ========================================================
    // 4. Initialize Firebase Admin
    // ========================================================

    const { adminAuth, adminDb } =
      await getFirebaseAdminServices();

    // ========================================================
    // 5. Verify Firebase Session Cookie
    // ========================================================

    const decodedToken =
      await adminAuth.verifySessionCookie(
        sessionCookie,
        true
      );

    const uid = decodedToken.uid;

    console.log("[API ME] Session verified:", { uid });

    // ========================================================
    // 6. Read Firestore User
    //
    // Collection: users
    // Document: Firebase UID
    // ========================================================

    const userSnap = await adminDb
      .collection("users")
      .doc(uid)
      .get();

    if (!userSnap.exists) {
      return NextResponse.json(
        {
          authenticated: false,
          stage: "user",
          error: "USER_NOT_REGISTERED",
        },
        { status: 403 }
      );
    }

    const userData = userSnap.data() || {};

    // ========================================================
    // 7. Check User Active Status
    // ========================================================

    if (userData.Active !== true) {
      return NextResponse.json(
        {
          authenticated: false,
          stage: "user",
          error: "USER_DISABLED",
        },
        { status: 403 }
      );
    }

    // ========================================================
    // 8. Read Role ID
    // ========================================================

    const role = userData.roleId;

    if (
      typeof role !== "string" ||
      !VALID_ROLES.includes(role)
    ) {
      return NextResponse.json(
        {
          authenticated: false,
          stage: "role",
          error: "INVALID_USER_ROLE",
        },
        { status: 403 }
      );
    }

    // ========================================================
    // 9. Read Firestore Role
    //
    // Collection: roles
    // Document: roleId
    // ========================================================

    const roleSnap = await adminDb
      .collection("roles")
      .doc(role)
      .get();

    if (!roleSnap.exists) {
      return NextResponse.json(
        {
          authenticated: false,
          stage: "role",
          error: "ROLE_NOT_FOUND",
        },
        { status: 403 }
      );
    }

    const roleData = roleSnap.data() || {};

    // ========================================================
    // 10. Check Role Active Status
    // ========================================================

    if (
      roleData.active === false ||
      roleData.Active === false
    ) {
      return NextResponse.json(
        {
          authenticated: false,
          stage: "role",
          error: "ROLE_DISABLED",
        },
        { status: 403 }
      );
    }

    // ========================================================
    // 11. Read and Validate Role Permissions
    //
    // Firestore:
    // roles/{roleId}.permissions
    //
    // Only explicitly true permissions are granted.
    // ========================================================

    const rawPermissions = roleData.permissions || {};

    const permissions = {};

    for (const key of PERMISSION_KEYS) {
      permissions[key] =
        rawPermissions[key] === true;
    }

    // ========================================================
    // 12. Authentication Successful
    // ========================================================

    console.log("[API ME] Authentication successful:", {
      uid,
      role,
      permissions,
    });

    return NextResponse.json(
      {
        authenticated: true,
        uid,
        email: decodedToken.email || userData.email || "",
        role,
        permissions,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );

  } catch (error) {
    console.error("[API ME] Error:", {
      code: error?.code,
      message: error?.message,
    });

    return NextResponse.json(
      {
        authenticated: false,
        stage: "verification",
        error: error?.code || "SESSION_VERIFICATION_FAILED",
        message: error?.message || "Unknown error",
      },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
