import { NextResponse } from "next/server";
import { getFirebaseAdminServices } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const TEST_UID = "Eqj5n773rbOC9pHRc3xyegSxyIk1";

export async function GET(request) {
  const expectedSecret = process.env.ROLE_SETUP_SECRET;
  const suppliedSecret = request.nextUrl.searchParams.get("secret");

  if (
    !expectedSecret ||
    !suppliedSecret ||
    suppliedSecret !== expectedSecret
  ) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { adminAuth } = getFirebaseAdminServices();

    const user = await adminAuth.getUser(TEST_UID);

    // 保留其他 Custom Claims，只删除 role
    const { role, ...remainingClaims } = user.customClaims || {};

    await adminAuth.setCustomUserClaims(
      TEST_UID,
      remainingClaims
    );

    return NextResponse.json({
      success: true,
      uid: TEST_UID,
      previousRole: role || null,
      message: "Role claim removed successfully.",
    });

  } catch (error) {
    console.error("[Role Removal] Failed:", {
      code: error?.code,
      message: error?.message,
    });

    return NextResponse.json(
      { error: "Failed to remove role" },
      { status: 500 }
    );
  }
}