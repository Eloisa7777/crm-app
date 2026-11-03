
import { NextResponse } from "next/server";
import { getFirebaseAdminServices } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

// Session expires after 4 hours.
const SESSION_EXPIRES_IN = 4 * 60 * 60 * 1000;

// All valid CRM roles.
const VALID_ROLES = ["admin", "yjpo", "yjest", "subsup"];

// Unified CRM session cookie name.
const SESSION_COOKIE_NAME = "yj_session";

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

    // 1. Initialize Firebase Admin.
    const { adminAuth } = getFirebaseAdminServices();

    // 2. Verify Firebase ID token.
    const decodedToken = await adminAuth.verifyIdToken(
      idToken,
      true
    );

    // 3. Validate Firebase custom claims.
    const role = decodedToken.role;

    if (
      typeof role !== "string" ||
      !VALID_ROLES.includes(role)
    ) {
      console.warn("[Login] Invalid CRM role:", {
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

    // 4. Create Firebase session cookie.
    const sessionCookie = await adminAuth.createSessionCookie(
      idToken,
      {
        expiresIn: SESSION_EXPIRES_IN,
      }
    );

    // 5. Return login result and set session cookie.
    const response = NextResponse.json({
      success: true,
      uid: decodedToken.uid,
      role,
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

    // Remove old __session cookie.
    response.cookies.set({
      name: "__session",
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
