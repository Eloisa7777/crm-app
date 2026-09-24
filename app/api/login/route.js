import { NextResponse } from "next/server";

const USERS = {
  admin: {
    password: "123456",
    role: "admin",
  },

  yjpo: {
    password: "8888000",
    role: "yjpo",
  },
};

export async function POST(request) {
  try {
    const body = await request.json();

    const { username, password } = body;

    const user = USERS[username];

    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      role: user.role,
    });

    response.cookies.set({
      name: "yj_auth",
      value: "authenticated",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 1,
    });

    response.cookies.set({
      name: "yj_role",
      value: user.role,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 1,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}