
import { NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";

// ============================================================
// GET /api/settings/users
//
// Authentication:
//   UID + Email
//
// Firestore:
//   users/{uid} -> displayName
//
// Access:
//   Super Admin only
// ============================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    // --------------------------------------------------------
    // 1. Super Admin 权限验证
    // --------------------------------------------------------

    const auth = await requireSuperAdmin();

    if (!auth.success) {
      return auth.response;
    }

    // --------------------------------------------------------
    // 2. 获取分页参数
    // --------------------------------------------------------

    const { searchParams } = new URL(request.url);

    const pageToken = searchParams.get("pageToken") || undefined;

    // --------------------------------------------------------
    // 3. 获取 Firebase Authentication 用户
    // --------------------------------------------------------

    const authResult = await adminAuth.listUsers(
      1000,
      pageToken
    );

    const authUsers = authResult.users;

    // --------------------------------------------------------
    // 4. 根据 UID 获取 Firestore users 文档
    // --------------------------------------------------------

    let firestoreUsers = [];

    if (authUsers.length > 0) {
      const userRefs = authUsers.map((user) =>
        adminDb.collection("users").doc(user.uid)
      );

      const snapshots = await adminDb.getAll(...userRefs);

      firestoreUsers = snapshots.map((snapshot) => {
        if (!snapshot.exists) {
          return {};
        }

        return snapshot.data() || {};
      });
    }

    // --------------------------------------------------------
    // 5. 合并 Authentication + Firestore 数据
    // --------------------------------------------------------

    const users = authUsers.map((authUser, index) => {
      const firestoreUser = firestoreUsers[index] || {};

      return {
        uid: authUser.uid,

        email: authUser.email || "",

        displayName: firestoreUser.displayName || "",

      };
    });

    // --------------------------------------------------------
    // 6. 返回数据
    // --------------------------------------------------------

    return NextResponse.json(
      {
        success: true,

        users,

        pagination: {
          hasMore: Boolean(authResult.pageToken),
          nextPageToken: authResult.pageToken || null,
        },

        totalReturned: users.length,
      },
      {
        status: 200,

        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );

  } catch (error) {
    console.error("[Settings Users API]", error);

    return NextResponse.json(
      {
        success: false,
        error: "FAILED_TO_LOAD_USERS",
      },
      {
        status: 500,
      }
    );
  }
}
