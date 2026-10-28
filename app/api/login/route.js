
import { NextResponse } from "next/server";
import { getFirebaseAdminServices } from "@/lib/firebaseAdmin";

// ============================================================
// Login API
// 1. 接收 Firebase ID Token
// 2. 初始化 Firebase Admin
// 3. 验证 Token 与用户状态
// 4. 验证 Custom Claims 角色
// 5. 创建 HttpOnly Session Cookie
// ============================================================

export const runtime = "nodejs";

const SESSION_COOKIE_NAME = "yj_session";
const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000;
const ALLOWED_ROLES = new Set(["admin", "yjpo", "yjest"]);

function logError(step, error) {
  // 只记录错误信息，不记录 ID Token、密码或 Cookie。
  console.error(`[Login] ${step} failed`, {
    code: error?.code ?? "unknown",
    message: error?.message ?? "Unknown error",
  });
}

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

  // Step 1: Initialize Firebase Admin.
  let adminAuth;

  try {
    ({ adminAuth } = getFirebaseAdminServices());
  } catch (error) {
    logError("Firebase Admin initialization", error);

    return errorResponse("FIREBASE_ADMIN_INITIALIZATION_FAILED", 503);
  }

  // Step 2: Verify the Firebase ID Token.
  let decodedToken;

  try {
    decodedToken = await adminAuth.verifyIdToken(idToken, true);
} catch (error) {
  console.error("[Login] ID token verification failed", {
    code: error?.code,
    message: error?.message,
    name: error?.name,
  });

  return NextResponse.json(
    {
      error: "FIREBASE_ID_TOKEN_VERIFICATION_FAILED",
      detail: error?.code || error?.message || "Unknown error",
    },
    { status: 401 }
  );
}

  // Step 3: Check the trusted Custom Claims role. （默认yjest)
let role = decodedToken.role;

// 没有设置角色时，默认使用 yjest
if (role == null || role === "") {
  role = "yjest";
}

// 只允许 CRM 已定义的角色
if (typeof role !== "string" || !ALLOWED_ROLES.has(role)) {
  console.warn("[Login] User has no authorized CRM role", {
    uid: decodedToken.uid,
    role: typeof role === "string" ? role : "invalid",
  });

  return errorResponse("UNAUTHORIZED_CRM_ROLE", 403);
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

  // Step 5: Return the session cookie.
  const response = NextResponse.json({
    success: true,
    role,
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
