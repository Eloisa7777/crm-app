
import { NextResponse } from "next/server";
import { getFirebaseAdminServices } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================
// Configuration
// ============================================================

const SESSION_COOKIE_NAME = "yj_session";
const SESSION_EXPIRES_IN = 4 * 60 * 60 * 1000;

const VALID_ROLES = [
  "admin",
  "yjpo",
  "yjest",
  "subsup",
];

// ============================================================
// POST: Firebase Login + Firestore RBAC + Session
// ============================================================

export async function POST(request) {
  try {
    // 1. Read ID Token from request
    const body = await request.json();
    const idToken = body.idToken;

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json(
        { success: false, error: "MISSING_ID_TOKEN" },
        { status: 400 }
      );
    }

    // 2. Initialize Firebase Admin
    const { adminAuth, adminDb } =
      getFirebaseAdminServices();

    // 3. Verify Firebase ID Token
    const decodedToken = await adminAuth.verifyIdToken(
      idToken,
      true
    );

    const uid = decodedToken.uid;

    // 4. Read user RBAC document
    const userSnap = await adminDb
      .collection("users")
      .doc(uid)
      .get();

    if (!userSnap.exists) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_REGISTERED" },
        { status: 403 }
      );
    }

    const userData = userSnap.data();

    // 5. Check user status
    if (userData.Active !== true) {
      return NextResponse.json(
        { success: false, error: "USER_DISABLED" },
        { status: 403 }
      );
    }

    // 6. Get role ID
    const roleId = userData.roleId;

    if (
      typeof roleId !== "string" ||
      !VALID_ROLES.includes(roleId)
    ) {
      return NextResponse.json(
        { success: false, error: "INVALID_USER_ROLE" },
        { status: 403 }
      );
    }

    // 7. Read role document
    const roleSnap = await adminDb
      .collection("roles")
      .doc(roleId)
      .get();

    if (!roleSnap.exists) {
      return NextResponse.json(
        { success: false, error: "ROLE_NOT_FOUND" },
        { status: 403 }
      );
    }

    const roleData = roleSnap.data();

    // 8. Check role status
    if (
      roleData.active === false ||
      roleData.Active === false
    ) {
      return NextResponse.json(
        { success: false, error: "ROLE_DISABLED" },
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

    // 10. Return response and set cookie
    const response = NextResponse.json(
      {
        success: true,
        authenticated: true,
        uid,
        email: decodedToken.email || userData.email || "",
        role: roleId,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_EXPIRES_IN / 1000,
    });

    return response;

  } catch (error) {
    console.error("[API LOGIN] Failed:", {
      code: error?.code,
      message: error?.message,
    });

    return NextResponse.json(
      {
        success: false,
        error: error?.code || "LOGIN_FAILED",
        message: error?.message || "Unknown error",
      },
      { status: 401 }
    );
  }
}
