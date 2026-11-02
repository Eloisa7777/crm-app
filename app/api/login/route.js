import { NextResponse } from "next/server";
import { getFirebaseAdminServices } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const SESSION_EXPIRES_IN = 5 * 24 * 60 * 60 * 1000;

const VALID_ROLES = ["admin", "yjpo", "yjest"];

export async function POST(request) {
  try {
    const body = await request.json();
    const idToken = body?.idToken;

    if (typeof idToken !== "string" || !idToken.trim()) {
      return NextResponse.json(
        { error: "Missing Firebase ID token" },
        { status: 400 }
      );
    }

    // ========================================================
    // 1. Initialize Firebase Admin
    // ========================================================

    const { adminAuth } = getFirebaseAdminServices();

    // ========================================================
    // 2. Verify Firebase ID Token
    // ========================================================

    const decodedToken = await adminAuth.verifyIdToken(
      idToken,
      true
    );

    // ========================================================
    // 3. Validate Firebase Custom Claims
    // ========================================================

    const role = decodedToken.role;

    if (
      typeof role !== "string" ||
      !VALID_ROLES.includes(role)
    ) {
      console.warn("[Login] Account has no valid CRM role:", {
        uid: decodedToken.uid,
        role: role ?? null,
      });

      return NextResponse.json(
        {
          error:
            "This account does not have a valid CRM role. Contact your administrator.",
        },
        { status: 403 }
      );
    }

    // ========================================================
    // 4. Create Firebase Session Cookie
    // ========================================================

    const sessionCookie = await adminAuth.createSessionCookie(
      idToken,
      {
        expiresIn: SESSION_EXPIRES_IN,
      }
    );

    // ========================================================
    // 5. Set Session Cookie
    // ========================================================

    const response = NextResponse.json({
      success: true,
      uid: decodedToken.uid,
      role,
    });

    response.cookies.set({
      name: "__session",
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_EXPIRES_IN / 1000,
    });

    // Remove legacy session cookie.
    response.cookies.set({
      name: "yj_session",
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    console.info("[Login] Session created:", {
      uid: decodedToken.uid,
      role,
    });

    return response;
  } catch (error) {
    console.error("[Login] Firebase session creation failed:", {
      code: error?.code,
      message: error?.message,
    });

    if (
      typeof error?.code === "string" &&
      error.code.startsWith("auth/")
    ) {
      return NextResponse.json(
        {
          error: "Firebase authentication failed. Please sign in again.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: "Server authentication is temporarily unavailable.",
      },
      { status: 500 }
    );
  }
}