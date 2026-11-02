"use client";

import { useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

// ============================================================
// Login Page
// 1. Firebase Email / Password authentication
// 2. Refresh ID Token and read Custom Claims
// 3. Require a valid CRM role
// 4. Exchange ID Token for server Session Cookie
// 5. Redirect to Dashboard
// ============================================================

const VALID_ROLES = ["admin", "yjpo", "yjest"];

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

      // ========================================================
      // 2. Force refresh ID Token
      //    This retrieves the latest Firebase Custom Claims.
      // ========================================================

      const idTokenResult =
        await credential.user.getIdTokenResult(true);

      const idToken = idTokenResult.token;
      const role = idTokenResult.claims.role;

      console.info("[Login] Firebase claims:", {
        uid: credential.user.uid,
        role: role || null,
      });

      // ========================================================
      // 3. Check CRM role
      // ========================================================

      if (
        typeof role !== "string" ||
        !VALID_ROLES.includes(role)
      ) {
        await signOut(auth);

        throw new Error(
          "This account does not have a valid CRM role. Please contact the administrator."
        );
      }

      // ========================================================
      // 4. Exchange ID Token for server Session Cookie
      // ========================================================

      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ idToken }),
      });

      const result = await response.json();

      if (!response.ok || result.success !== true) {
        throw new Error(
          result.error || "Failed to create login session"
        );
      }

      // Make sure the server agrees with the Firebase role.
      if (result.role !== role) {
        throw new Error(
          "Role verification failed. Please contact the administrator."
        );
      }

      console.info("[Login] Server session created:", {
        uid: result.uid,
        role: result.role,
      });

      // ========================================================
      // 5. Clear client-side Firebase Auth state
      //    HttpOnly server Session Cookie remains.
      // ========================================================

      await signOut(auth);

      // ========================================================
      // 6. Full browser navigation
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
      };

      setError(
        messages[err?.code] ||
          err?.message ||
          "登录失败，请检查服务器日志"
      );

      // Make sure Firebase client state is cleared after failure.
      try {
        if (auth.currentUser) {
          await signOut(auth);
        }
      } catch (signOutError) {
        console.warn("[Login] Cleanup failed:", signOutError?.message);
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