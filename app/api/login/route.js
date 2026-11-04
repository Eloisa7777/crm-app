
import { NextResponse } from "next/server";
import { getFirebaseAdminServices } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================
// Session Configuration
// ============================================================

const SESSION_EXPIRES_IN = 4 * 60 * 60 * 1000;
const SESSION_COOKIE_NAME = "yj_session";

const VALID_ROLES = ["admin", "yjpo", "yjest", "subsup"];

// ============================================================
// POST: Firebase Login + Firestore RBAC
// ============================================================

export async function POST(request) {
  try {
    // 1. Read Firebase ID Token
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json(
        { success: false, error: "Missing ID token" },
        { status: 400 }
      );
    }

    // 2. Initialize Firebase Admin INSIDE POST
    const { adminAuth, adminDb } = getFirebaseAdminServices();

    // 3. Verify Firebase ID Token
    const decodedToken = await adminAuth.verifyIdToken(
      idToken,
      true
    );

    const uid = decodedToken.uid;

    // 4. Get user RBAC configuration
    const userRef = adminDb.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json(
        { success: false, error: "User not registered in CRM" },
        { status: 403 }
      );
    }

    const userData = userSnap.data();

    // 5. Check whether user is active
    if (userData.Active !== true) {
      return NextResponse.json(
        { success: false, error: "Account is inactive" },
        { status: 403 }
      );
    }

    // 6. Get roleId
    const roleId = userData.roleId;

    if (!roleId || typeof roleId !== "string") {
      return NextResponse.json(
        { success: false, error: "User role not configured" },
        { status: 403 }
      );
    }


    // 7. Read Firestore Role configuration
    let roleSnap = await adminDb
      .collection("roles")
      .doc(roleId.trim())
      .get();

    // Support existing documents with auto-generated IDs
    if (!roleSnap.exists) {
      const roleQuery = await adminDb
        .collection("roles")
        .where("rolename", "==", roleId.trim())
        .limit(1)
        .get();

      if (!roleQuery.empty) {
        roleSnap = roleQuery.docs[0];
      }
    }

    if (!roleSnap.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "Role configuration not found",
          code: "ROLE_NOT_FOUND",
        },
        { status: 403 }
      );
    }

    const roleData = roleSnap.data();

    const role = roleData.rolename;
    const permissions = roleData.permissions;

    console.log("[CRM LOGIN RBAC]", {
  uid,
  roleId,
  roleDocumentId: roleSnap.id,
  roleName: roleData.rolename,
  permissionsValid:
    !!permissions &&
    typeof permissions === "object" &&
    !Array.isArray(permissions),
});

    // 8. Validate role
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, error: "Invalid CRM role" },
        { status: 403 }
      );
    }

    if (
      !permissions ||
      typeof permissions !== "object" ||
      Array.isArray(permissions)
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid role permissions" },
        { status: 403 }
      );
    }

    // 9. Create Firebase Session Cookie
    const sessionCookie = await adminAuth.createSessionCookie(
      idToken,
      {
        expiresIn: SESSION_EXPIRES_IN,
      }
    );

    // 10. Return successful login
    const response = NextResponse.json({
      success: true,
      uid,
      role,
      permissions,
    });

    // 11. Set HttpOnly Session Cookie
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_EXPIRES_IN / 1000,
    });

    // Remove legacy cookie if it exists
    response.cookies.set("__session", "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
    });

    return response;

  } catch (error) {
    console.error("CRM Login Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Login failed",
      },
      { status: 401 }
    );
  }
}
