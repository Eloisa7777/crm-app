
import { NextResponse } from "next/server";
import { getFirebaseAdminServices } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const TEST_UID = "Eqj5n773rbOC9pHRc3xyegSxyIk1";

export async function GET(request) {
  // Only allow this endpoint when a secret is configured.
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

    await adminAuth.setCustomUserClaims(TEST_UID, {
      ...(user.customClaims || {}),
      role: "admin",
    });

    return NextResponse.json({
      success: true,
      uid: TEST_UID,
      role: "admin",
      message: "Role assigned. Sign out and sign in again.",
    });
  } catch (error) {
    console.error("[Role Setup] Failed:", {
      code: error?.code,
      message: error?.message,
    });

    return NextResponse.json(
      { error: "Failed to assign role" },
      { status: 500 }
    );
  }
}
