
import { NextResponse } from "next/server";
import { getFirebaseAdminServices } from "@/lib/firebaseAdmin";

// ============================================================
// Login API
// 1. 接收 Firebase ID Token
// 2. 验证 ID Token
// 3. 创建 HttpOnly Session Cookie
// 暂时不检查 CRM 角色
// ============================================================

export const runtime = "nodejs";

const SESSION_COOKIE_NAME = "yj_session";
const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000;

function errorResponse(error, status) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request) {
  const isLocalDevelopment = process.env.NODE_ENV === "development";
  const vercelEnv = process.env.VERCEL_ENV;

  if (
    !isLocalDevelopment &&
    vercelEnv !== "preview" &&
    vercelEnv !== "production"
  ) {
    return errorResponse("LOGIN_ENVIRONMENT_UNAVAILABLE", 503);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_REQUEST_BODY", 400);
  }

  const idToken = body?.idToken;

  if (typeof idToken !== "string" || !idToken.trim()) {
    return errorResponse("MISSING_ID_TOKEN", 400);
  }

  let adminAuth;

  try {
    ({ adminAuth } = getFirebaseAdminServices());
  } catch (error) {
    console.error("[Login] Firebase Admin initialization failed", {
      code: error?.code ?? "unknown",
      message: error?.message ?? "Unknown error",
    });

    return errorResponse("FIREBASE_ADMIN_INITIALIZATION_FAILED", 503);
  }

  // Verify the Firebase ID Token.
  let decodedToken;

  try {
    decodedToken = await adminAuth.verifyIdToken(idToken);
  } catch (error) {
    console.error("[Login] ID token verification failed", {
      code: error?.code ?? "unknown",
      message: error?.message ?? "Unknown error",
    });

    return errorResponse("FIREBASE_ID_TOKEN_VERIFICATION_FAILED", 401);
  }

  // Create the Session Cookie.
  let sessionCookie;

  try {
    sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS,
    });
  } catch (error) {
    console.error("[Login] Session cookie creation failed", {
      code: error?.code ?? "unknown",
      message: error?.message ?? "Unknown error",
    });

    return errorResponse("SESSION_COOKIE_CREATION_FAILED", 500);
  }

  const response = NextResponse.json({
    success: true,
    uid: decodedToken.uid,
  });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sessionCookie,
    httpOnly: true,
    secure: !isLocalDevelopment,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  });

  return response;
}
