
import { NextResponse } from "next/server";
import { getFirebaseAdminServices } from "@/lib/firebaseAdmin";

// ============================================================
// Login API
// 1. 接收 Firebase ID Token
// 2. 初始化 Firebase Admin
// 3. 验证 Token
// 4. 创建 HttpOnly Session Cookie
// 5. 不区分用户角色
// ============================================================

export const runtime = "nodejs";

const SESSION_COOKIE_NAME = "yj_session";
const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000;

function logError(step, error) {
  // 不记录 Token、密码或 Cookie。
  // 不输出 error.message，避免意外泄露凭据。
  console.error(`[Login] ${step} failed`, {
    code: error?.code ?? "unknown",
    name: error?.name ?? "Error",
  });
}

function errorResponse(error, status) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request) {
  const isLocalDevelopment = process.env.NODE_ENV === "development";
  const vercelEnv = process.env.VERCEL_ENV;

  // 允许本地开发、Vercel Preview 和 Production。
  if (
    !isLocalDevelopment &&
    vercelEnv !== "preview" &&
    vercelEnv !== "production"
  ) {
    return errorResponse("LOGIN_ENVIRONMENT_UNAVAILABLE", 503);
  }

  // Step 1: Read request body.
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

  // Step 2: Initialize Firebase Admin.
  let adminAuth;

  try {
    ({ adminAuth } = getFirebaseAdminServices());
  } catch (error) {
    logError("Firebase Admin initialization", error);

    return errorResponse("FIREBASE_ADMIN_INITIALIZATION_FAILED", 503);
  }

  // Step 3: Verify Firebase ID Token.
  try {
    await adminAuth.verifyIdToken(idToken);
  } catch (error) {
    logError("ID token verification", error);

    return errorResponse("FIREBASE_ID_TOKEN_VERIFICATION_FAILED", 401);
  }

  // Step 4: Create the session cookie.
  let sessionCookie;

  try {
    sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS,
    });
  } catch (error) {
    logError("Session cookie creation", error);

    return errorResponse("SESSION_COOKIE_CREATION_FAILED", 500);
  }

  // Step 5: Return success and set the session cookie.
  const response = NextResponse.json({
    success: true,
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
