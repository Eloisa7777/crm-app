
import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

// ============================================================
// Super Admin Authentication
// 使用现有 yj_session HttpOnly Cookie
// 使用固定 UID 验证 Super Admin
// ============================================================

export async function requireSuperAdmin() {
  try {
    const superAdminUid = process.env.CRM_SUPER_ADMIN_UID;

    if (!superAdminUid) {
      console.error("[SuperAdmin] CRM_SUPER_ADMIN_UID is missing");

      return {
        success: false,
        response: NextResponse.json(
          { success: false, error: "SERVER_CONFIGURATION_ERROR" },
          { status: 500 }
        ),
      };
    }

    // 1. 获取现有 Session Cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("yj_session")?.value;

    if (!sessionCookie) {
      return {
        success: false,
        response: NextResponse.json(
          { success: false, error: "UNAUTHENTICATED" },
          { status: 401 }
        ),
      };
    }

    // 2. 验证 Session Cookie
    const decodedToken = await adminAuth.verifySessionCookie(
      sessionCookie,
      true
    );

    // 3. 验证固定 Super Admin UID
    if (decodedToken.uid !== superAdminUid) {
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
      uid: decodedToken.uid,
      email: decodedToken.email || "",
    };
  } catch (error) {
    console.error("[SuperAdmin] Authentication failed:", error);

    return {
      success: false,
      response: NextResponse.json(
        { success: false, error: "INVALID_SESSION" },
        { status: 401 }
      ),
    };
  }
}
