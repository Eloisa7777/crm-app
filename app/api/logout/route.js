
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SESSION_COOKIE_NAME = "yj_session";

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });

    // Clear current CRM session cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });

    return response;

  } catch (error) {
    console.error("[Logout] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to logout",
      },
      { status: 500 }
    );
  }
}
