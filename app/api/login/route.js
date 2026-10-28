
import { NextResponse } from "next/server";
import { getFirebaseAdminServices } from "@/lib/firebaseAdmin";

// ============================================================
// Login API
// 1. 接收 Firebase Auth 登录后的 ID Token
// 2. 使用 Firebase Admin 验证 Token
// 3. 从 Custom Claims 读取角色
// 4. 创建 HttpOnly Session Cookie
// ============================================================

export const runtime = "nodejs";

const SESSION_COOKIE_NAME = "yj_session";
const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000;
const ALLOWED_ROLES = new Set(["admin", "yjpo", "yjest"]);

function logStepError(step, error) {
  console.error(`[Login] ${step} failed:`, {
    code: error?.code ?? "unknown",
    message: error?.message ?? "Unknown error",
  });
}

export async function POST(request) {
  const isLocalDevelopment = process.env.NODE_ENV === "development";
  const vercelEnv = process.env.VERCEL_ENV;

  // 仅允许本地开发、Vercel Preview 和 Production。
  if (
    !isLocalDevelopment &&
    vercelEnv !== "preview" &&
    vercelEnv !== "production"
  ) {
    return NextResponse.json(
      { error: "Login is unavailable in this environment." },
      { status: 503 }
    );
  }

  let step = "Reading request";

  try {
    const body = await request.json();
    const idToken = body?.idToken;

    if (typeof idToken !== "string" || !idToken.trim()) {
      return NextResponse.json(
        { error: "Missing Firebase ID token" },
        { status: 400 }
      );
    }

    step = "Initializing Firebase Admin";

    const { adminAuth } = getFirebaseAdminServices();

    step = "Verifying Firebase ID token";

    const decodedToken = await adminAuth.verifyIdToken(idToken, true);

    // 角色必须来自可信的 Firebase Custom Claims。
    const role = decodedToken.role;

    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json(
        { error: "User does not have an authorized CRM role" },
        { status: 403 }
      );
    }

    step = "Creating session cookie";

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS,
    });

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
  } catch (error) {
    logStepError(step, error);

    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 401 }
    );
  }
}
