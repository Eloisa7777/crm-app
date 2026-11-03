
import { NextResponse } from "next/server";
import { getFirebaseAdminServices } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================
// 1. Session Configuration
// ============================================================

// Session expires after 4 hours.
const SESSION_EXPIRES_IN = 4 * 60 * 60 * 1000;

// Unified CRM session cookie name.
const SESSION_COOKIE_NAME = "yj_session";

// ============================================================
// 2. POST /api/login
//
// Authentication:
//   Firebase Authentication ID Token
//
// RBAC:
//   users/{uid}
//     Active: true
//     roleId: "admin"
//
//   roles/{roleId}
//     rolename: "admin"
//     permissions: { ... }
//
// No Firebase Custom Claims required.
// ============================================================

export async function POST(request) {
  try {
    // --------------------------------------------------------
    // 1. Read request body
    // --------------------------------------------------------

    const body = await request.json();
    const idToken = body?.idToken;

    if (
      typeof idToken !== "string" ||
      !idToken.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_ID_TOKEN",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // 2. Initialize Firebase Admin Services
    // --------------------------------------------------------

    const { adminAuth, adminDb } =
      getFirebaseAdminServices();

    // --------------------------------------------------------
    // 3. Verify Firebase ID Token
    //
    // This verifies identity only.
    // Role is NOT read from Custom Claims.
    // --------------------------------------------------------

    const decodedToken = await adminAuth.verifyIdToken(
      idToken,
      true
    );

    const uid = decodedToken.uid;

    if (!uid) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_USER_ID",
        },
        { status: 401 }
      );
    }

    // --------------------------------------------------------
    // 4. Get Firestore User Document
    //
    // Collection: users
    // Document: Firebase UID
    // --------------------------------------------------------

    const userSnapshot = await adminDb
      .collection("users")
      .doc(uid)
      .get();

    if (!userSnapshot.exists) {
      console.warn("[Login] User document not found:", uid);

      return NextResponse.json(
        {
          success: false,
          error: "USER_NOT_FOUND",
          message: "CRM user profile does not exist.",
        },
        { status: 403 }
      );
    }

    const userData = userSnapshot.data() || {};

    // --------------------------------------------------------
    // 5. Check User Active Status
    //
    // Actual Firestore field: Active
    // Expected value: true
    // --------------------------------------------------------

    if (userData.Active !== true) {
      console.warn("[Login] Inactive CRM user:", uid);

      return NextResponse.json(
        {
          success: false,
          error: "USER_INACTIVE",
          message: "This CRM account is inactive.",
        },
        { status: 403 }
      );
    }

    // --------------------------------------------------------
    // 6. Get Role ID
    //
    // Actual Firestore field: roleId
    // Example: admin
    // --------------------------------------------------------

    const roleId = userData.roleId;

    if (
      typeof roleId !== "string" ||
      !roleId.trim()
    ) {
      console.warn("[Login] Missing roleId:", uid);

      return NextResponse.json(
        {
          success: false,
          error: "MISSING_ROLE",
          message: "No CRM role has been assigned.",
        },
        { status: 403 }
      );
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
      console.warn("[Login] Role not found:", {
        uid,
        roleId,
      });

      return NextResponse.json(
        {
          success: false,
          error: "ROLE_NOT_FOUND",
          message: "Assigned CRM role does not exist.",
        },
        { status: 403 }
      );
    }

    const roleData = roleSnapshot.data() || {};

    // --------------------------------------------------------
    // 8. Validate Role Name
    // --------------------------------------------------------

    if (
      typeof roleData.rolename !== "string" ||
      roleData.rolename.toLowerCase() !==
        roleId.toLowerCase()
    ) {
      console.warn("[Login] Invalid role document:", {
        uid,
        roleId,
        rolename: roleData.rolename ?? null,
      });

      return NextResponse.json(
        {
          success: false,
          error: "INVALID_ROLE",
        },
        { status: 403 }
      );
    }

    // --------------------------------------------------------
    // 9. Validate Permissions
    // --------------------------------------------------------

    if (
      !roleData.permissions ||
      typeof roleData.permissions !== "object"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_ROLE_PERMISSIONS",
        },
        { status: 403 }
      );
    }

    // --------------------------------------------------------
    // 10. Create Firebase Session Cookie
    //
    // Cookie contains Firebase identity.
    // CRM role remains in Firestore.
    // --------------------------------------------------------

    const sessionCookie =
      await adminAuth.createSessionCookie(
        idToken,
        {
          expiresIn: SESSION_EXPIRES_IN,
        }
      );

    // --------------------------------------------------------
    // 11. Return Login Result
    // --------------------------------------------------------

    const response = NextResponse.json({
      success: true,
      uid,
      roleId,
      displayName: userData.displayname || "",
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_EXPIRES_IN / 1000,
    });

    // --------------------------------------------------------
    // 12. Remove Old Session Cookie
    // --------------------------------------------------------

    response.cookies.set({
      name: "__session",
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    // --------------------------------------------------------
    // 13. Logging
    // --------------------------------------------------------

    console.info("[Login] Firestore RBAC session created:", {
      uid,
      roleId,
    });

    return response;

  } catch (error) {
    console.error(
      "[Login] Firebase authentication failed:",
      {
        code: error?.code,
        message: error?.message,
      }
    );

    if (
      typeof error?.code === "string" &&
      error.code.startsWith("auth/")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "FIREBASE_AUTHENTICATION_FAILED",
          message: "Please sign in again.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "SERVER_AUTHENTICATION_FAILED",
        message: "Server authentication is temporarily unavailable.",
      },
      { status: 500 }
    );
  }
}
