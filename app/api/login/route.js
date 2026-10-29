
import { NextResponse } from "next/server";
import { getFirebaseAdminServices } from "@/lib/firebaseAdmin";

// ============================================================
// Firebase Login API
// 1. 接收 Firebase Authentication 的 ID Token
// 2. 由 Firebase Admin 验证用户身份
// 3. 创建服务端 Session Cookie
// 4. 清除旧版不安全的登录 Cookie
// ============================================================

export const runtime = "nodejs";

const SESSION_EXPIRES_IN = 5 * 24 * 60 * 60 * 1000; // 5 days

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

    // 1. Initialize Firebase Admin
    const { adminAuth } = getFirebaseAdminServices();

    // 2. Verify the Firebase ID Token
    const decodedToken = await adminAuth.verifyIdToken(
      idToken,
      true
    );

    // 3. Create a server-side session cookie
    const sessionCookie = await adminAuth.createSessionCookie(
      idToken,
      { expiresIn: SESSION_EXPIRES_IN }
    );

    // 4. Return success and set the secure session cookie
    const response = NextResponse.json({
      success: true,
      uid: decodedToken.uid,
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

    // Remove legacy cookies. They must no longer be used
    // as proof of authentication or authorization.
    response.cookies.set({
      name: "yj_auth",
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    response.cookies.set({
      name: "yj_role",
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("[Login] Firebase session creation failed:", {
      code: error?.code,
      message: error?.message,
    });

    // Invalid or expired Firebase ID Token
    if (
      typeof error?.code === "string" &&
      error.code.startsWith("auth/")
    ) {
      return NextResponse.json(
        { error: "Firebase authentication failed. Please sign in again." },
        { status: 401 }
      );
    }

    // Server credential, WIF, or Firebase Admin configuration error
    return NextResponse.json(
      { error: "Server authentication is temporarily unavailable." },
      { status: 500 }
    );
  }
}
