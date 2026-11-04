
import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getFirebaseAdminServices } from "@/lib/firebaseAdmin";

// ============================================================
// Super Admin Authentication
//
// Firebase Authentication:
//   Verify existing Session Cookie
//
// Firestore:
//   users/{uid}
//     Active: true
//     roleId: "admin"
//
//   roles/{roleId}
//     rolename: "admin"
//     permissions: { ... }
//
// Access:
//   Super Admin only
// ============================================================

export async function requireSuperAdmin() {
  try {
    // --------------------------------------------------------
    // 1. Initialize Firebase Admin Services
    // --------------------------------------------------------

const { adminAuth, adminDb } = await getFirebaseAdminServices();

    // --------------------------------------------------------
    // 2. Read Session Cookie
    // --------------------------------------------------------

    const cookieStore = await cookies();

    // Must match the cookie name used in /api/login
    const sessionCookie =
      cookieStore.get("__session")?.value;

    if (!sessionCookie) {
      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            error: "UNAUTHENTICATED",
            message: "Session cookie is missing.",
          },
          { status: 401 }
        ),
      };
    }

    // --------------------------------------------------------
    // 3. Verify Firebase Session Cookie
    // --------------------------------------------------------

    const decodedClaims = await adminAuth.verifySessionCookie(
      sessionCookie,
      true
    );

    const uid = decodedClaims.uid;

    if (!uid) {
      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            error: "INVALID_SESSION",
          },
          { status: 401 }
        ),
      };
    }

    // --------------------------------------------------------
    // 4. Get User Document
    //
    // Collection: users
    // Document: Firebase UID
    // --------------------------------------------------------

    const userSnapshot = await adminDb
      .collection("users")
      .doc(uid)
      .get();

    if (!userSnapshot.exists) {
      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            error: "USER_NOT_FOUND",
          },
          { status: 403 }
        ),
      };
    }

    const userData = userSnapshot.data() || {};

    // --------------------------------------------------------
    // 5. Check User Active Status
    //
    // Actual Firestore field: Active
    // Type: Boolean
    // --------------------------------------------------------

    if (userData.Active !== true) {
      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            error: "USER_INACTIVE",
          },
          { status: 403 }
        ),
      };
    }

    // --------------------------------------------------------
    // 6. Get User Role ID
    // --------------------------------------------------------

    const roleId = userData.roleId;

    if (!roleId) {
      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            error: "MISSING_ROLE",
          },
          { status: 403 }
        ),
      };
    }

    // --------------------------------------------------------
    // 7. Get Role Document
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
      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            error: "ROLE_NOT_FOUND",
          },
          { status: 403 }
        ),
      };
    }

    const roleData = roleSnapshot.data() || {};

    // --------------------------------------------------------
    // 8. Validate Role Name
    // --------------------------------------------------------

    if (
      typeof roleData.rolename !== "string" ||
      roleData.rolename.toLowerCase() !== roleId.toLowerCase()
    ) {
      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            error: "INVALID_ROLE",
          },
          { status: 403 }
        ),
      };
    }

    // --------------------------------------------------------
    // 9. Check Super Admin Role
    //
    // Only roleId = "admin" can access this API
    // --------------------------------------------------------

    if (roleId !== "admin") {
      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            error: "FORBIDDEN",
            message: "Super Admin permission required.",
          },
          { status: 403 }
        ),
      };
    }

    // --------------------------------------------------------
    // 10. Return Verified User
    // --------------------------------------------------------

    return {
      success: true,
      uid,
      user: userData,
      role: roleData,
      permissions: roleData.permissions || {},
    };

  } catch (error) {
    console.error("[Require Super Admin]", error);

    // --------------------------------------------------------
    // 11. Handle Session Errors
    // --------------------------------------------------------

    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: "INVALID_SESSION",
          message: "Unable to verify administrator session.",
        },
        { status: 401 }
      ),
    };
  }
}
