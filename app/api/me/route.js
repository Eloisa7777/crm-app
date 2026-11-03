
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getFirebaseAdminServices } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_ROLES = [
  "admin",
  "yjpo",
  "yjest",
  "subsup",
];

const SESSION_COOKIE_NAME = "yj_session";

export async function GET() {
  try {
    // ========================================================
    // 1. Read session cookie
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
    // 2. Initialize Firebase Admin
    // ========================================================
    const { adminAuth, adminDb } =
      getFirebaseAdminServices();

    // ========================================================
    // 3. Verify Firebase Session Cookie
    // ========================================================
    const decodedToken =
      await adminAuth.verifySessionCookie(
        sessionCookie,
        true
      );

    const uid = decodedToken.uid;

    console.log("[API ME] Session verified:", { uid });

    // ========================================================
    // 4. Read user RBAC from Firestore
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

    const userData = userSnap.data();

    // ========================================================
    // 5. Check user status
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
    // 6. Read roleId from Firestore
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
    // 7. Verify role document
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

    const roleData = roleSnap.data();

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
    // 8. Authentication successful
    // ========================================================
    console.log("[API ME] Authentication successful:", {
      uid,
      role,
    });

    return NextResponse.json(
      {
        authenticated: true,
        uid,
        email: decodedToken.email || userData.email || "",
        role,
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
