
"use client";

import { useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

// ============================================================
// YJ CRM - Architectural Premium Login
//
// Features:
// 1. Architectural blueprint animation
// 2. Glassmorphism login panel
// 3. Amber interactive elements
// 4. Mouse-following spotlight
// 5. 3D card tilt effect
// 6. Floating information cards
// 7. Responsive mobile layout
//
// Authentication:
// Firebase Auth -> ID Token -> Session Cookie -> Firestore RBAC
// ============================================================


// ============================================================
// 1. Role redirects
// ============================================================

const ROLE_REDIRECTS = {
  admin: "/",
  yjpo: "/purchase-orders",
  yjest: "/quote",
  subsup: "/sub-invoices",
};


// ============================================================
// 2. SVG Icons
// ============================================================

function BrandIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="h-10 w-10">
      <path d="M4 8L17 40H24L11 8H4Z" fill="white" />
      <path d="M22 40L39 8H46L29 40H22Z" fill="white" />
      <path d="M29 8H46L41 17H24L29 8Z" fill="#FBBF24" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" className="h-5 w-5">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" className="h-5 w-5">
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EyeIcon({ hidden }) {
  return hidden ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" className="h-5 w-5">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.2A11 11 0 0 1 12 5c5 0 8.5 4.5 9 7-.2 1-1.1 2.5-2.6 3.8M6.2 6.2C3.9 7.7 2.3 10 3 12c.5 2.5 4 7 9 7 1.3 0 2.5-.3 3.6-.8" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" className="h-5 w-5">
      <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" className="h-5 w-5 transition-transform group-hover:translate-x-1">
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" className="h-5 w-5">
      <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}


// ============================================================
// 3. Architectural Blueprint
// ============================================================

function Blueprint() {
  return (
    <svg
      viewBox="0 0 760 650"
      fill="none"
      className="blueprint-svg absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <pattern
          id="blueprintGrid"
          width="30"
          height="30"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M30 0H0V30"
            stroke="#91A8D8"
            strokeWidth=".6"
            opacity=".22"
          />
        </pattern>

        <linearGradient id="blueprintFade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A5B9E8" stopOpacity=".7" />
          <stop offset="100%" stopColor="#A5B9E8" stopOpacity=".08" />
        </linearGradient>
      </defs>

      {/* Blueprint grid */}
      <rect width="760" height="650" fill="url(#blueprintGrid)" />

      {/* Building main structure */}
      <g
        stroke="url(#blueprintFade)"
        strokeWidth="1.5"
        className="blueprint-draw"
      >
        {/* Main building outline */}
        <path d="M145 505V190L370 85L595 190V505H145Z" />

        {/* Floors */}
        <path d="M145 270H595" />
        <path d="M145 350H595" />
        <path d="M145 430H595" />

        {/* Vertical columns */}
        <path d="M225 190V505" />
        <path d="M305 152V505" />
        <path d="M385 92V505" />
        <path d="M465 152V505" />
        <path d="M545 190V505" />

        {/* Roof details */}
        <path d="M115 190L370 65L625 190" />
        <path d="M145 180H595" />

        {/* Windows */}
        <path d="M165 210H205V250H165Z" />
        <path d="M245 210H285V250H245Z" />
        <path d="M325 210H365V250H325Z" />
        <path d="M405 210H445V250H405Z" />
        <path d="M485 210H525V250H485Z" />
        <path d="M565 210H575V250H565Z" />

        <path d="M165 290H205V330H165Z" />
        <path d="M245 290H285V330H245Z" />
        <path d="M325 290H365V330H325Z" />
        <path d="M405 290H445V330H405Z" />
        <path d="M485 290H525V330H485Z" />

        <path d="M165 370H205V410H165Z" />
        <path d="M245 370H285V410H245Z" />
        <path d="M325 370H365V410H325Z" />
        <path d="M405 370H445V410H405Z" />
        <path d="M485 370H525V410H485Z" />

        {/* Entrance */}
        <path d="M330 505V435H410V505" />
        <path d="M370 435V505" />

        {/* Dimension lines */}
        <path d="M110 190V505M100 190H120M100 505H120" />
        <path d="M145 535H595M145 525V545M595 525V545" />

        {/* Technical markers */}
        <path d="M595 190L655 140H700" />
        <path d="M545 350L650 350H700" />
        <path d="M225 505L170 565H100" />
      </g>

      {/* Amber technical markers */}
      <g stroke="#FBBF24" strokeWidth="1.4" opacity=".85">
        <path d="M650 140H700" />
        <circle cx="650" cy="140" r="3" fill="#FBBF24" />
        <path d="M650 350H700" />
        <circle cx="650" cy="350" r="3" fill="#FBBF24" />
        <path d="M170 565H100" />
        <circle cx="170" cy="565" r="3" fill="#FBBF24" />
      </g>

      {/* Blueprint labels */}
      <g fill="#A5B9E8" fontSize="10" letterSpacing="2">
        <text x="655" y="130">ROOF LEVEL</text>
        <text x="655" y="340">LEVEL 02</text>
        <text x="75" y="580">FOUNDATION</text>
        <text x="145" y="565">BUILDING ELEVATION</text>
        <text x="145" y="590">YJ / PROJECT DESIGN</text>
        <text x="145" y="610" opacity=".5">TECHNICAL DRAWING 001</text>
      </g>

      {/* Dimension measurements */}
      <g fill="#FBBF24" fontSize="10" letterSpacing="1.5">
        <text x="360" y="555">24.00 M</text>
        <text x="75" y="355" transform="rotate(-90 75 355)">18.00 M</text>
      </g>

      {/* Crosshair */}
      <g stroke="#FBBF24" strokeWidth="1" opacity=".6">
        <path d="M370 25V55M355 40H385" />
        <circle cx="370" cy="40" r="9" />
      </g>
    </svg>
  );
}


// ============================================================
// 4. Floating Information Card
// ============================================================

function FloatingCard({ type, title, subtitle, className = "" }) {
  return (
    <div className={`floating-card absolute z-20 hidden rounded-xl border border-white/10 bg-[#202B45]/80 p-4 shadow-2xl backdrop-blur-xl xl:block ${className}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400">
          {type === "project" ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.7" className="h-5 w-5">
              <path d="M3 21V8l9-5 9 5v13" />
              <path d="M8 21v-8h8v8M3 11h18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.7" className="h-5 w-5">
              <path d="M4 19V5m0 14h17" />
              <path d="m7 15 4-4 3 2 6-7" />
            </svg>
          )}
        </div>

        <div>
          <p className="text-[11px] font-semibold text-white">{title}</p>
          <p className="mt-1 text-[9px] text-slate-400">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}


// ============================================================
// 5. Main Component
// ============================================================

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);


  // ==========================================================
  // 6. Mouse Spotlight
  // ==========================================================

  function handleMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
  }


  // ==========================================================
  // 7. 3D Card Tilt
  // ==========================================================

  function handleCardMove(e) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();

    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const rotateY = (x - 0.5) * 5;
    const rotateX = (0.5 - y) * 5;

    e.currentTarget.style.transform =
      `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  }

  function handleCardLeave(e) {
    e.currentTarget.style.transform =
      "perspective(1200px) rotateX(0deg) rotateY(0deg)";
  }


  // ==========================================================
  // 8. Firebase Login
  // ==========================================================

  async function handleLogin(e) {
    e.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    try {
      // Firebase Authentication
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      // Get ID Token
      const idToken = await credential.user.getIdToken(true);

      console.info("[Login] Firebase authenticated:", {
        uid: credential.user.uid,
        email: credential.user.email,
      });

      // Exchange ID Token for Session Cookie
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

      // Validate Server Response
      if (!result.uid || !result.role) {
        throw new Error(
          "Invalid CRM login response. Please contact administrator."
        );
      }

      // Normalize Role
      const roleId = String(result.role).trim().toLowerCase();

      console.info("[Login] Firestore RBAC verified:", {
        uid: result.uid,
        role: roleId,
        permissions: result.permissions,
      });

      // Determine Landing Page
      const destination = ROLE_REDIRECTS[roleId];

      if (!destination) {
        throw new Error(
          `No default landing page configured for role: ${roleId}`
        );
      }

      // Clear client Firebase Auth state
      await signOut(auth);

      // Redirect
      window.location.replace(destination);

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


  // ==========================================================
  // 9. UI
  // ==========================================================

  return (
    <main
      onMouseMove={handleMouseMove}
      className="login-scene relative min-h-screen overflow-hidden bg-[#101426] text-white"
    >

      {/* Background layers */}
      <div className="pointer-events-none absolute inset-0">

        {/* Mouse-following spotlight */}
        <div className="mouse-spotlight absolute inset-0" />

        {/* Ambient lights */}
        <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-indigo-500/10 blur-[150px]" />

        <div className="absolute -bottom-60 -right-40 h-[650px] w-[650px] rounded-full bg-amber-400/[0.045] blur-[150px]" />

        {/* Architectural blueprint */}
        <div className="blueprint-container absolute inset-0 opacity-60">
          <Blueprint />
        </div>

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#101426]/95 via-[#101426]/70 to-[#101426]/95" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#101426] via-transparent to-[#101426]/40" />

      </div>


      {/* Main layout */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1500px] items-center px-6 py-10 sm:px-10 lg:px-16">

        <div className="grid w-full grid-cols-1 items-center gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">


          {/* ================================================= */}
          {/* LEFT - BRAND AND ARCHITECTURE */}
          {/* ================================================= */}

          <section className="relative hidden min-h-[650px] flex-col justify-between lg:flex">

            {/* Brand */}
            <div className="flex items-center gap-4">

              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/15 bg-white/[0.07] shadow-lg backdrop-blur-xl">
                <BrandIcon />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  YJ CRM
                </h1>

                <p className="mt-1 text-[9px] font-semibold tracking-[0.3em] text-slate-400">
                  BUSINESS MANAGEMENT SYSTEM
                </p>
              </div>

            </div>


            {/* Main heading */}
            <div className="relative z-20 max-w-lg">

              <div className="mb-6 flex items-center gap-3">
                <span className="h-px w-10 bg-amber-400" />

                <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-400">
                  Built for better operations
                </span>
              </div>

              <h2 className="text-5xl font-bold leading-[1.15] tracking-tight xl:text-6xl">

                Build better.
                <br />

                Manage smarter.

                <span className="mt-2 block bg-gradient-to-r from-amber-300 via-amber-400 to-amber-100 bg-clip-text text-transparent">
                  Work seamlessly.
                </span>

              </h2>

              <p className="mt-7 max-w-md text-sm leading-8 text-slate-400">
                One centralised workspace to manage projects,
                procurement, quotations and business operations.
              </p>

            </div>


            {/* Technical details */}
            <div className="relative z-20 flex items-end justify-between border-t border-white/10 pt-6">

              <div>
                <p className="text-[9px] tracking-[0.25em] text-slate-500">
                  YJ LININGS CREATION
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  Internal Business Platform
                </p>
              </div>

              <div className="text-right">
                <p className="font-mono text-[10px] text-amber-400/80">
                  DESIGN / BUILD / MANAGE
                </p>

                <p className="mt-2 text-[9px] text-slate-500">
                  QUEENSLAND · AUSTRALIA
                </p>
              </div>

            </div>


            {/* Floating Cards */}
            <FloatingCard
              type="project"
              title="Project Management"
              subtitle="Projects & timelines"
              className="right-[-15px] top-[125px]"
            />

            <FloatingCard
              type="analytics"
              title="Business Operations"
              subtitle="Centralised management"
              className="bottom-[145px] right-[10px]"
            />

          </section>


          {/* ================================================= */}
          {/* RIGHT - LOGIN PANEL */}
          {/* ================================================= */}

          <section className="mx-auto w-full max-w-[450px]">

            {/* Mobile brand */}
            <div className="mb-9 flex items-center justify-center gap-3 lg:hidden">

              <BrandIcon />

              <div>
                <h1 className="text-xl font-bold">YJ CRM</h1>
                <p className="text-[9px] tracking-[0.25em] text-slate-400">
                  BUSINESS MANAGEMENT
                </p>
              </div>

            </div>


            {/* Glass Panel */}
            <div
              onMouseMove={handleCardMove}
              onMouseLeave={handleCardLeave}
              className="glass-panel relative rounded-2xl border border-white/[0.16] p-7 shadow-[0_30px_100px_rgba(0,0,0,0.45)] sm:p-10"
            >

              {/* Amber top light */}
              <div className="absolute left-[20%] right-[20%] top-0 h-px bg-gradient-to-r from-transparent via-amber-300/90 to-transparent" />


              {/* Panel header */}
              <div className="mb-9">

                <div className="mb-7 flex items-center justify-between">

                  <div className="flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/[0.08] px-3 py-1.5">

                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />

                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-amber-300">
                      Secure Access
                    </span>

                  </div>

                  <span className="font-mono text-[9px] tracking-wider text-slate-500">
                    YJ / AUTH / 001
                  </span>

                </div>


                <h2 className="text-3xl font-bold tracking-tight text-white">
                  Welcome back.
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Sign in to access your YJ CRM workspace.
                </p>

              </div>


              {/* Login form */}
              <form onSubmit={handleLogin} className="space-y-6">


                {/* Email */}
                <div>

                  <label
                    htmlFor="email"
                    className="mb-2.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300"
                  >
                    Email Address
                  </label>

                  <div className="input-group relative">

                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 transition-colors">
                      <MailIcon />
                    </div>

                    <input
                      id="email"
                      type="email"
                      autoComplete="username"
                      required
                      disabled={loading}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="login-input w-full rounded-lg border border-white/10 bg-[#151E32]/90 py-3.5 pl-12 pr-4 text-sm text-white outline-none transition-all placeholder:text-slate-600 hover:border-white/20 focus:border-amber-400/80 focus:bg-[#19243A] focus:ring-4 focus:ring-amber-400/10 disabled:opacity-50"
                    />

                  </div>

                </div>


                {/* Password */}
                <div>

                  <label
                    htmlFor="password"
                    className="mb-2.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300"
                  >
                    Password
                  </label>

                  <div className="input-group relative">

                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 transition-colors">
                      <LockIcon />
                    </div>

                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      disabled={loading}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="login-input w-full rounded-lg border border-white/10 bg-[#151E32]/90 py-3.5 pl-12 pr-12 text-sm text-white outline-none transition-all placeholder:text-slate-600 hover:border-white/20 focus:border-amber-400/80 focus:bg-[#19243A] focus:ring-4 focus:ring-amber-400/10 disabled:opacity-50"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 transition hover:text-amber-400"
                    >
                      <EyeIcon hidden={showPassword} />
                    </button>

                  </div>

                </div>


                {/* Error */}
                {error && (
                  <div
                    role="alert"
                    className="login-error flex items-start gap-3 rounded-lg border border-red-400/20 bg-red-500/[0.09] px-4 py-3 text-sm text-red-300"
                  >

                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="mt-0.5 h-5 w-5 shrink-0"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 8v5m0 3h.01" />
                    </svg>

                    <span>{error}</span>

                  </div>
                )}


                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="amber-button group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-lg bg-amber-400 py-4 text-sm font-bold text-[#151827] shadow-[0_8px_30px_rgba(251,191,36,0.13)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-amber-300 hover:shadow-[0_12px_35px_rgba(251,191,36,0.25)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                >

                  <span className="button-shine absolute inset-0" />

                  <span className="relative z-10">
                    {loading ? "Signing in..." : "Sign in to CRM"}
                  </span>

                  {loading ? (
                    <svg
                      className="relative z-10 h-5 w-5 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="currentColor"
                        strokeWidth="3"
                        opacity="0.25"
                      />
                      <path
                        d="M21 12a9 9 0 0 0-9-9"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    <span className="relative z-10">
                      <ArrowIcon />
                    </span>
                  )}

                </button>

              </form>


              {/* Security footer */}
              <div className="mt-9">

                <div className="flex items-center gap-3">

                  <div className="h-px flex-1 bg-white/10" />

                  <div className="flex items-center gap-2 text-slate-400">
                    <ShieldIcon />
                    <span className="text-[9px] font-medium tracking-wider">
                      SECURE & ENCRYPTED
                    </span>
                  </div>

                  <div className="h-px flex-1 bg-white/10" />

                </div>

                <p className="mt-5 text-center text-[10px] leading-5 text-slate-500">
                  Authorised users only.
                  <br />
                  Access managed through YJ CRM.
                </p>

              </div>

            </div>


            {/* Copyright */}
            <div className="mt-7 text-center">
              <p className="text-[10px] tracking-wide text-slate-500">
                © {new Date().getFullYear()} YJ Linings Creation Pty Ltd.
              </p>

              <p className="mt-1 text-[9px] text-slate-600">
                All rights reserved.
              </p>
            </div>

          </section>

        </div>

      </div>


      {/* ================================================== */}
      {/* 10. Animation Styles */}
      {/* ================================================== */}

      <style jsx>{`

        /* Mouse spotlight */
        .mouse-spotlight {
          background: radial-gradient(
            500px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
            rgba(99, 102, 241, 0.12),
            transparent 65%
          );
          transition: background 0.15s ease;
        }

        /* Glass panel */
        .glass-panel {
          background: linear-gradient(
            145deg,
            rgba(43, 57, 86, 0.76),
            rgba(22, 30, 49, 0.88)
          );
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          transform-style: preserve-3d;
          transition: transform 0.18s ease-out,
                      border-color 0.3s ease,
                      box-shadow 0.3s ease;
        }

        .glass-panel:hover {
          border-color: rgba(251, 191, 36, 0.28);
          box-shadow:
            0 30px 100px rgba(0,0,0,0.45),
            0 0 35px rgba(251,191,36,0.035);
        }

        /* Blueprint drawing */
        .blueprint-draw {
          stroke-dasharray: 1600;
          stroke-dashoffset: 1600;
          animation: blueprintDraw 5s ease forwards;
        }

        .blueprint-container {
          animation: blueprintFloat 12s ease-in-out infinite;
        }

        @keyframes blueprintDraw {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes blueprintFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        /* Floating cards */
        .floating-card {
          animation: floatCard 6s ease-in-out infinite;
        }

        .floating-card:last-child {
          animation-delay: -3s;
        }

        @keyframes floatCard {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-12px);
          }
        }

        /* Button shine */
        .button-shine {
          background: linear-gradient(
            110deg,
            transparent 30%,
            rgba(255,255,255,0.45) 50%,
            transparent 70%
          );
          transform: translateX(-120%);
          transition: transform 0.8s ease;
        }

        .amber-button:hover .button-shine {
          transform: translateX(120%);
        }

        /* Input focus icon */
        .input-group:focus-within > div {
          color: #FBBF24;
        }

        /* Error animation */
        .login-error {
          animation: errorShake 0.35s ease;
        }

        @keyframes errorShake {
          0%, 100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-4px);
          }
          75% {
            transform: translateX(4px);
          }
        }

        /* Accessibility */
        @media (prefers-reduced-motion: reduce) {
          .blueprint-draw,
          .blueprint-container,
          .floating-card,
          .login-error {
            animation: none !important;
          }

          .glass-panel {
            transition: none !important;
            transform: none !important;
          }

          .button-shine {
            display: none;
          }
        }

        /* Mobile */
        @media (max-width: 1023px) {
          .blueprint-container {
            opacity: 0.35;
          }
        }

      `}</style>

    </main>
  );
}

