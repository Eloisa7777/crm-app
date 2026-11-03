
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getFirebaseAdminServices } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; //实时处理请求，不能只作为静态》》1. Read session cookie

const VALID_ROLES = [
  "admin",
  "yjpo",
  "yjest",
  "subsup",
];

export async function GET() {
  try {
    // 1. Read session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("yj_session")?.value;

    console.log("[API ME] Session exists:", !!sessionCookie);

    if (!sessionCookie) {
      return NextResponse.json(
        {
          authenticated: false,
          stage: "cookie",
          error: "No session found",
        },
        { status: 401 }
      );
    }

    // 2. Initialize Firebase Admin
    const { adminAuth } = getFirebaseAdminServices();

    console.log("[API ME] Firebase Admin initialized");

    // 3. Verify session
    const decodedToken =
      await adminAuth.verifySessionCookie(
        sessionCookie,
        true
      );

    console.log("[API ME] Session verified:", {
      uid: decodedToken.uid,
      role: decodedToken.role,
    });

    // 4. Validate role
    const role = decodedToken.role;

    if (
      typeof role !== "string" ||
      !VALID_ROLES.includes(role)
    ) {
      return NextResponse.json(
        {
          authenticated: false,
          stage: "role",
          error: "Invalid CRM role",
        },
        { status: 403 }
      );
    }

    // 5. Return user information
    return NextResponse.json(
      {
        authenticated: true,
        uid: decodedToken.uid,
        email: decodedToken.email || "",
        role,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );

  } catch (error) {
    console.error("[API ME] Error:", {
      code: error?.code,
      message: error?.message,
    });

    return NextResponse.json(
      {
        authenticated: false,
        stage: "verification",
        error: error?.code || "SESSION_VERIFICATION_FAILED",
        message: error?.message || "Unknown error",
      },
      { status: 401 }
    );
  }
}
