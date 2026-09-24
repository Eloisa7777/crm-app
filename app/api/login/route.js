import { NextResponse } from "next/server";

const USERNAME = "admin";
const PASSWORD = "123456";

export async function POST(request) {
  try {
    const body = await request.json();

    const { username, password } = body;

    if (username !== USERNAME || password !== PASSWORD) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
    });

    response.cookies.set({
      name: "yj_auth",
      value: "authenticated",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8, // 1 hour
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}