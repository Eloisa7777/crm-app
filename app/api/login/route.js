
import { NextResponse } from "next/server";
import { getFirebaseAdminServices } from "@/lib/firebaseAdmin";

// ============================================================
// Login API
// 1. 接收前端 Firebase Auth 登录后获得的 ID Token
// 2. 验证 Token
// 3. 从 Custom Claims 读取角色
// 4. 创建 HttpOnly Session Cookie
// ============================================================

export const runtime = "nodejs";

const SESSION_COOKIE_NAME = "yj_session";
const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000; // 5 days
const vercelEnv = process.env.VERCEL_ENV;
const isLocalDevelopment =
  process.env.NODE_ENV === "development";
const ALLOWED_ROLES = new Set(["admin", "yjpo", "yjest"]);

export async function POST(request) {
  // 本地不使用 GCP 服务端凭证。
if (
  !isLocalDevelopment &&
  vercelEnv !== "preview" &&
  vercelEnv !== "production"
) {
  return Response.json(
    { error: "Login is unavailable in this environment." },
    { status: 503 }
  );
}

  try {
    const body = await request.json();
    const idToken = body?.idToken;

    if (typeof idToken !== "string" || !idToken.trim()) {
      return NextResponse.json(
        { error: "Missing Firebase ID token" },
        { status: 400 }
      );
    }

    const { adminAuth } = getFirebaseAdminServices();

    // 验证 Firebase ID Token，并检查用户是否已被撤销权限。
    const decodedToken = await adminAuth.verifyIdToken(idToken, true);

    // 角色必须来自可信的 Firebase Custom Claims。
    const role = decodedToken.role;

    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json(
        { error: "User does not have an authorized CRM role" },
        { status: 403 }
      );
    }

    // 创建服务端 Session Cookie。
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
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(SESSION_DURATION_MS / 1000),
    });

    // 不再创建 yj_auth 或 yj_role Cookie。
    // 权限验证应使用经过验证的 Session Cookie。
    return response;
  } catch (error) {
    // 服务端只记录错误摘要，不记录 ID Token 或 Session Cookie。
    console.error("Login API failed:", error.code || error.message);

    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 401 }
    );
  }
}
