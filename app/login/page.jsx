
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. 使用 Firebase Authentication 验证账号密码
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      // 2. 获取最新的 Firebase ID Token
 
      const idToken = await credential.user.getIdToken(true);

      // 3. 请求 Next.js 服务端验证 Token 并创建 Session
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ idToken }),
      });

      const result = await response.json();

      // 4. 服务端未能建立 Session 时，不允许进入 CRM
      if (!response.ok) {
        // 避免留下只有客户端认证、没有服务端 Session 的状态
        await signOut(auth);

        const messages = {
          FIREBASE_ADMIN_INITIALIZATION_FAILED:
            "服务端认证初始化失败，请检查部署配置",
          FIREBASE_ID_TOKEN_VERIFICATION_FAILED:
            "服务端无法验证登录凭据，请检查 Firebase Admin 配置",
          UNAUTHORIZED_CRM_ROLE:
            "该账号尚未分配有效的 CRM 角色",
          SESSION_COOKIE_CREATION_FAILED:
            "无法创建登录会话，请稍后重试",
        };

        throw new Error(
          messages[result.error] ||
          result.error ||
          "登录失败，请重试"
        );
      }

      // 5. Session 建立成功后才跳转
      router.replace("/");
      router.refresh();

    } catch (err) {
      console.error("[Login] Firebase sign-in failed:", err);

      const messages = {
        "auth/invalid-credential": "邮箱或密码不正确",
        "auth/invalid-email": "邮箱格式不正确",
        "auth/user-disabled": "该账号已被停用",
        "auth/too-many-requests": "尝试次数过多，请稍后再试",
        "auth/network-request-failed": "网络连接失败，请检查网络",
      };

      setError(
        messages[err.code] ||
        "登录失败，请检查 Firebase 配置和账号状态"
      );
    } finally {
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
