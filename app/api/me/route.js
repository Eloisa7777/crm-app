import { NextResponse } from "next/server";
import { getFirebaseAdminServices } from "@/lib/firebaseAdmin";

export async function GET(request) {
  try {
    const sessionCookie = request.cookies.get("yj_session")?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    const { auth } = getFirebaseAdminServices();

    const decoded = await auth.verifySessionCookie(
      sessionCookie,
      true
    );

    const role = decoded.role;

    if (!role) {
      return NextResponse.json(
        { authenticated: false },
        { status: 403 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      uid: decoded.uid,
      email: decoded.email,
      role,
    });

  } catch (error) {
    console.error("GET /api/me:", error);

    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  }
}