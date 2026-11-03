import { NextResponse } from "next/server";
import { getFirebaseAdminServices } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const TEST_UID = "Eqj5n773rbOC9pHRc3xyegSxyIk1";

export async function GET(request) {
  const expectedSecret = process.env.ROLE_SETUP_SECRET;
  const suppliedSecret = request.nextUrl.searchParams.get("secret");

  if (!expectedSecret || suppliedSecret !== expectedSecret) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { adminAuth } = getFirebaseAdminServices();

    // 删除该用户全部 Custom Claims
    await adminAuth.setCustomUserClaims(TEST_UID, {});

    // 撤销已有 Refresh Tokens
    await adminAuth.revokeRefreshTokens(TEST_UID);

    // 重新读取验证
    const user = await adminAuth.getUser(TEST_UID);

    return NextResponse.json({
      success: true,
      uid: TEST_UID,
      customClaims: user.customClaims || {},
      message: "All custom claims cleared.",
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}