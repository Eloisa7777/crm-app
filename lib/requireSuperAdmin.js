import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getFirebaseAdminServices } from "@/lib/firebaseAdmin";

// ============================================================
// Super Admin Authentication
// ============================================================

export async function requireSuperAdmin() {
  try {
    // 1. 获取 Firebase Admin Services
    const { adminAuth, adminDb } = getFirebaseAdminServices();

    // 2. 获取 Session Cookie
    const cookieStore = await cookies();

    // ⚠️ 这里必须使用你当前登录系统实际的 Cookie 名称
    const sessionCookie = cookieStore.get("__session")?.value;

    if (!sessionCookie) {
      return {
        success: false,
        response: NextResponse.json(
          { success: false, error: "UNAUTHENTICATED" },
          { status: 401 }
        ),
      };
    }

    // 3. 验证 Session Cookie
    const decodedClaims = await adminAuth.verifySessionCookie(
      sessionCookie,
      true
    );

    // 4. 查询 Firestore 用户角色
    const userSnapshot = await adminDb
      .collection("users")
      .doc(decodedClaims.uid)
      .get();

    if (!userSnapshot.exists) {
      return {
        success: false,
        response: NextResponse.json(
          { success: false, error: "USER_NOT_FOUND" },
          { status: 403 }
        ),
      };
    }

    const userData = userSnapshot.data() || {};

    // 5. 检查 Super Admin 权限
    if (userData.role !== "admin") {
      return {
        success: false,
        response: NextResponse.json(
          { success: false, error: "FORBIDDEN" },
          { status: 403 }
        ),
      };
    }

    return {
      success: true,
      uid: decodedClaims.uid,
      user: userData,
    };
  } catch (error) {
    console.error("[Require Super Admin]", error);

    return {
      success: false,
      response: NextResponse.json(
        { success: false, error: "INVALID_SESSION" },
        { status: 401 }
      ),
    };
  }
}