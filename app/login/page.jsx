
"use client";

// ============================================================
// YJ CRM Login Page
// 1. Firebase Authentication: email + password
// 2. Obtain Firebase ID Token
// 3. Send token to /api/login
// 4. API verifies token and creates HTTP-only session cookie
// ============================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
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
      // 1. Sign in with Firebase Authentication
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      // 2. Get Firebase ID Token
      const idToken = await credential.user.getIdToken(true);

      // 3. Send ID Token to the server
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Prevent a Firebase client session remaining active
        // if the server rejects the CRM role or session.
        const { signOut } = await import("firebase/auth");
        await signOut(auth);

        setError(data.error || "Login failed. Please try again.");
        return;
      }

      // 4. Navigate after the server creates the session cookie
      router.replace("/");
      router.refresh();
    } catch (err) {
      console.error("Login failed:", err.code || err.message);

      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found"
      ) {
        setError("Incorrect email or password.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else if (err.code === "auth/network-request-failed") {
        setError("Network error. Please check your connection.");
      } else {
        setError(
          err.message?.includes("Firebase Admin")
            ? "Server authentication is not configured correctly."
            : "Unable to login. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              YJ Building Evolution
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Management System
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                autoComplete="username"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-gray-900
                  focus:border-transparent"
                required
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-gray-900
                  focus:border-transparent"
                required
                disabled={loading}
              />
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
              >
                {error}
              </div>
            )}

            {/* Login */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-800 text-gray-100 py-2.5 rounded-lg
                font-medium hover:bg-amber-400 hover:text-black
                hover:transition disabled:opacity-50
                disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
