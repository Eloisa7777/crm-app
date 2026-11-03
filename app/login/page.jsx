
"use client";

import { useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

// ============================================================
// Login Page
//
// 1. Firebase Email / Password authentication
// 2. Get Firebase ID Token
// 3. Exchange ID Token with /api/login
// 4. Server validates Firestore RBAC
// 5. Server creates HttpOnly Session Cookie
// 6. Clear client Firebase Auth state
// 7. Redirect to Dashboard
//
// IMPORTANT:
// No Firebase Custom Claims are used.
// All CRM roles come from Firestore RBAC.
// ============================================================

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    try {
      // ========================================================
      // 1. Firebase Authentication
      // ========================================================

      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      console.info("[Login] Firebase authentication successful:", {
        uid: credential.user.uid,
        email: credential.user.email,
      });

      // ========================================================
      // 2. Get Firebase ID Token
      // ========================================================

      const idToken = await credential.user.getIdToken();

      // ========================================================
      // 3. Exchange ID Token for Server Session
      // ========================================================

      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ idToken }),
      });

      const result = await response.json();

      if (!response.ok || result.success !== true) {
        throw new Error(
          result.error ||
          result.message ||
          "Failed to create login session"
        );
      }

      // ========================================================
      // 4. Verify Server Response
      // Server is the authority for CRM roles.
      // ========================================================

      if (
        result.authenticated !== true ||
        !result.uid ||
        !result.role
      ) {
        throw new Error(
          "Invalid server authentication response"
        );
      }

      if (result.uid !== credential.user.uid) {
        throw new Error(
          "User identity verification failed"
        );
      }

      console.info("[Login] Firestore RBAC successful:", {
        uid: result.uid,
        role: result.role,
      });

      // ========================================================
      // 5. Clear Client Firebase Auth State
      // HttpOnly server Session Cookie remains.
      // ========================================================

      await signOut(auth);

      // ========================================================
      // 6. Full Browser Navigation
      // ========================================================

      window.location.replace("/");

    } catch (err) {
      console.error("[Login] Sign-in failed:", {
        code: err?.code,
        message: err?.message,
      });

      const messages = {
        "auth/invalid-credential": "邮箱或密码不正确",
        "auth/invalid-email": "邮箱格式不正确",
        "auth/user-disabled": "该账号已被停用",
        "auth/too-many-requests": "尝试次数过多，请稍后再试",
        "auth/network-request-failed": "网络连接失败，请检查网络",
        USER_NOT_REGISTERED: "该用户尚未在 CRM 中注册",
        USER_DISABLED: "该 CRM 用户已被停用",
        INVALID_USER_ROLE: "该用户尚未分配有效角色",
        ROLE_NOT_FOUND: "CRM 角色不存在",
        ROLE_DISABLED: "该 CRM 角色已被停用",
      };

      setError(
        messages[err?.code] ||
        messages[err?.message] ||
        err?.message ||
        "登录失败，请检查服务器日志"
      );

      // Clear client Firebase Auth state after failure.
      try {
        if (auth.currentUser) {
          await signOut(auth);
        }
      } catch (signOutError) {
        console.warn(
          "[Login] Cleanup failed:",
          signOutError?.message
        );
      }

      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md space-y-5 rounded-xl border bg-white p-8 shadow-sm"
      >
        <div>
          <h1 className="text-2xl font-bold">YJ CRM</h1>
          <p className="mt-2 text-sm text-gray-500">
            Sign in to your account
          </p>
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-medium"
          >
            Email
          </label>

          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border p-3"
            placeholder="name@company.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-medium"
          >
            Password
          </label>

          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border p-3"
            placeholder="Enter password"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-black p-3 text-white disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
