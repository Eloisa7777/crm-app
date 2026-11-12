
"use client";

import { useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

// ============================================================
// YJ CRM - Architectural Blueprint Login
// ============================================================

const ROLE_REDIRECTS = {
  admin: "/",
  yjpo: "/purchase-orders",
  yjest: "/quote",
  subsup: "/sub-invoices",
};


// ============================================================
// 1. Brand Icon
// ============================================================

function BrandIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-9 h-9">
      <path d="M4 8L17 40H24L11 8H4Z" fill="white" />
      <path d="M22 40L39 8H46L29 40H22Z" fill="white" />
      <path d="M29 8H46L41 17H24L29 8Z" fill="#FBBF24" />
    </svg>
  );
}


// ============================================================
// 2. Icons
// ============================================================

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7"
      className="w-5 h-5">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7"
      className="w-5 h-5">
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EyeIcon({ hidden }) {
  return hidden ? (
    <svg viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7"
      className="w-5 h-5">
      <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.2A11 11 0 0 1 12 5c5 0 8.5 4.5 9 7-.2 1-1.1 2.5-2.6 3.8M6.2 6.2C3.9 7.7 2.3 10 3 12c.5 2.5 4 7 9 7 1.3 0 2.5-.3 3.6-.8" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7"
      className="w-5 h-5">
      <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}


// ============================================================
// 3. Architectural Blueprint Background
// ============================================================

function BlueprintBackground() {
  return (
    <svg
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      fill="none"
    >
      <defs>
        <pattern
          id="grid"
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M40 0H0V40"
            stroke="#8BA5D5"
            strokeWidth=".6"
            opacity=".16"
          />
        </pattern>

        <pattern
          id="smallGrid"
          width="10"
          height="10"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M10 0H0V10"
            stroke="#8BA5D5"
            strokeWidth=".4"
            opacity=".08"
          />
        </pattern>

        <linearGradient id="lineFade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A5C4F4" />
          <stop offset="100%" stopColor="#526FAD" />
        </linearGradient>
      </defs>

      {/* Engineering grid */}
      <rect width="1600" height="1000" fill="url(#grid)" />
      <rect width="1600" height="1000" fill="url(#smallGrid)" />

      {/* ========================================= */}
      {/* LEFT: High-rise apartment building */}
      {/* ========================================= */}

      <g
        className="building-lines"
        stroke="url(#lineFade)"
        strokeWidth="1.4"
        opacity=".65"
      >
        {/* Building outline */}
        <path d="M65 800V285L360 145L655 285V800Z" />

        {/* Roof structure */}
        <path d="M40 285L360 125L680 285" />
        <path d="M65 285H655" />

        {/* Floor levels */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path
            key={i}
            d={`M65 ${340 + i * 76}H655`}
          />
        ))}

        {/* Vertical columns */}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <path
            key={i}
            d={`M${110 + i * 90} ${265 - i * 20}V800`}
          />
        ))}

        {/* Apartment windows */}
        {[0, 1, 2, 3, 4, 5].map((floor) =>
          [0, 1, 2, 3, 4].map((col) => {
            const x = 90 + col * 112;
            const y = 300 + floor * 76;

            return (
              <g key={`${floor}-${col}`}>
                <rect
                  x={x}
                  y={y}
                  width="65"
                  height="48"
                />
                <path
                  d={`M${x + 32} ${y}V${y + 48}`}
                />
                <path
                  d={`M${x - 5} ${y + 53}H${x + 70}`}
                  stroke="#FBBF24"
                  strokeOpacity=".6"
                />
              </g>
            );
          })
        )}

        {/* Balcony railings */}
        {[0, 1, 2, 3, 4].map((floor) =>
          [0, 1, 2, 3].map((col) => {
            const x = 105 + col * 120;
            const y = 375 + floor * 76;

            return (
              <g key={`balcony-${floor}-${col}`}>
                <path d={`M${x} ${y}H${x + 85}`} />
                <path d={`M${x + 5} ${y - 20}V${y}`} />
                <path d={`M${x + 80} ${y - 20}V${y}`} />
                <path d={`M${x + 5} ${y - 20}H${x + 80}`} />
              </g>
            );
          })
        )}

        {/* Foundation */}
        <path d="M35 800H685" strokeWidth="2" />
        <path d="M65 815H655" />
        <path d="M90 830H630" />
      </g>


      {/* ========================================= */}
      {/* RIGHT: Townhouse development */}
      {/* ========================================= */}

      <g
        className="building-lines-secondary"
        stroke="#8FA8D7"
        strokeWidth="1.3"
        opacity=".48"
      >
        {/* Three townhouse outlines */}
        {[0, 1, 2].map((i) => {
          const x = 970 + i * 165;

          return (
            <g key={i}>
              {/* Roof */}
              <path d={`M${x} 440L${x + 75} 385L${x + 150} 440`} />

              {/* Main walls */}
              <path d={`M${x + 10} 440V760H${x + 140}V440`} />

              {/* Roof line */}
              <path d={`M${x + 10} 440H${x + 140}`} />

              {/* Upper floor */}
              <path d={`M${x + 10} 590H${x + 140}`} />

              {/* Windows */}
              <rect x={x + 30} y="465" width="42" height="65" />
              <rect x={x + 88} y="465" width="42" height="65" />

              <rect x={x + 30} y="615" width="42" height="65" />
              <rect x={x + 88} y="615" width="42" height="65" />

              {/* Entrance */}
              <rect x={x + 55} y="690" width="42" height="70" />

              {/* Balcony */}
              <path d={`M${x + 20} 575H${x + 135}`} />
              <path d={`M${x + 20} 545V575M${x + 135} 545V575`} />

              {/* Window divisions */}
              <path d={`M${x + 51} 465V530M${x + 109} 465V530`} />
            </g>
          );
        })}

        <path d="M920 760H1480" />
        <path d="M920 780H1480" />
      </g>


      {/* ========================================= */}
      {/* Technical dimension lines */}
      {/* ========================================= */}

      <g stroke="#FBBF24" strokeWidth="1" opacity=".65">
        {/* Apartment dimensions */}
        <path d="M35 285V800" />
        <path d="M25 285H45M25 800H45" />

        <path d="M65 855H655" />
        <path d="M65 845V865M655 845V865" />

        {/* Townhouse dimensions */}
        <path d="M970 810H1440" />
        <path d="M970 800V820M1440 800V820" />

        {/* Reference markers */}
        <circle cx="360" cy="145" r="5" fill="#FBBF24" />
        <circle cx="970" cy="440" r="4" fill="#FBBF24" />
      </g>


      {/* ========================================= */}
      {/* Technical labels */}
      {/* ========================================= */}

      <g
        fill="#A5B9E8"
        fontSize="12"
        letterSpacing="3"
        opacity=".75"
      >
        <text x="65" y="105">RESIDENTIAL</text>
        <text x="65" y="885" fontSize="10">APARTMENT </text>
        <text x="970" y="845" fontSize="10">TOWNHOUSE </text>

      </g>

      {/* Crosshair */}
      <g stroke="#FBBF24" opacity=".6">
        <circle cx="800" cy="500" r="18" />
        <path d="M770 500H830M800 470V530" />
      </g>

    </svg>
  );
}


// ============================================================
// 4. Main Login Component
// ============================================================

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Mouse spotlight
  function handleMouseMove(e) {
    const x = e.clientX;
    const y = e.clientY;

    e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
  }

  // 3D tilt
  function handleCardMove(e) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();

    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const rotateX = (0.5 - y) * 4;
    const rotateY = (x - 0.5) * 4;

    e.currentTarget.style.transform =
      `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  }

  function handleCardLeave(e) {
    e.currentTarget.style.transform =
      "perspective(1200px) rotateX(0deg) rotateY(0deg)";
  }


  // ==========================================================
  // 5. Firebase Authentication
  // ==========================================================

  async function handleLogin(e) {
    e.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const idToken = await credential.user.getIdToken(true);

      console.info("[Login] Firebase authenticated:", {
        uid: credential.user.uid,
        email: credential.user.email,
      });

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

      if (!result.uid || !result.role) {
        throw new Error(
          "Invalid CRM login response. Please contact administrator."
        );
      }

      const roleId = String(result.role).trim().toLowerCase();

      console.info("[Login] Firestore RBAC verified:", {
        uid: result.uid,
        role: roleId,
        permissions: result.permissions,
      });

      const destination = ROLE_REDIRECTS[roleId];

      if (!destination) {
        throw new Error(
          `No default landing page configured for role: ${roleId}`
        );
      }

      await signOut(auth);

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
        console.warn("[Login] Cleanup failed:", signOutError?.message);
      }

      setLoading(false);
    }
  }


  // ==========================================================
  // 6. UI
  // ==========================================================

  return (
    <main
      onMouseMove={handleMouseMove}
      className="login-scene relative flex min-h-screen items-center justify-center overflow-hidden bg-[#101426] px-4 py-10 text-white"
    >

      {/* Background blueprint */}
      <div className="pointer-events-none absolute inset-0">
        <BlueprintBackground />

        {/* Dark overlays */}
        <div className="absolute inset-0 bg-[#101426]/45" />

        <div className="absolute inset-0 bg-gradient-to-r from-[#101426]/45 via-[#101426]/75 to-[#101426]/45" />

        <div className="absolute inset-0 bg-gradient-to-b from-[#101426]/40 via-transparent to-[#101426]/75" />

        {/* Mouse spotlight */}
        <div className="mouse-spotlight absolute inset-0" />

        {/* Ambient lighting */}
        <div className="absolute left-1/2 top-1/2 h-[650px] w-[650px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[140px]" />

        <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/[0.045] blur-[100px]" />
      </div>


      {/* Technical corner labels */}
      <div className="pointer-events-none absolute left-7 top-7 z-10 hidden md:block">
        <p className="font-mono text-[9px] tracking-[0.25em] text-slate-400/70">
          YJ CRM SYSTEM
        </p>
        <p className="mt-2 font-mono text-[9px] text-slate-500/70">
          RESIDENTIAL · COMMERCIAL · FITOUT · QLD
        </p>
      </div>

      {/* ================================================== */}
      {/* CENTERED LOGIN CARD */}
      {/* ================================================== */}

      <div className="relative z-20 w-full max-w-[430px]">

        {/* Floating top indicator */}
        <div className="mb-5 flex justify-center">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#202943]/70 px-4 py-2 shadow-xl backdrop-blur-xl">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
            <span className="text-[9px] font-semibold tracking-[0.2em] text-slate-300">
              SECURE CRM ACCESS
            </span>
          </div>
        </div>


        {/* Glass Panel */}
        <div
          onMouseMove={handleCardMove}
          onMouseLeave={handleCardLeave}
          className="glass-panel relative rounded-2xl border border-white/[0.16] p-7 shadow-[0_30px_100px_rgba(0,0,0,0.5)] sm:p-10"
        >

          {/* Top amber line */}
          <div className="absolute left-[20%] right-[20%] top-0 h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent" />


          Brand 
          <div className="mb-9 flex flex-col items-center text-center">

           {/* <div className="mb-5 flex h-[66px] w-[66px] items-center justify-center rounded-2xl border border-white/15 bg-white/[0.07] shadow-xl backdrop-blur-xl">
              
            </div>*/}

            <h1 className="text-2xl font-bold tracking-tight">
              YJ Linings
            </h1>

            <p className="mt-2 text-[9px] font-semibold tracking-[0.3em] text-slate-400">
              Sign in to your workspace
            </p>

            <div className="mt-6 h-px w-12 bg-amber-400/70" />

          </div>


          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300"
              >
                Email Address
              </label>

              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
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
                  className="w-full rounded-lg border border-white/10 bg-[#151E32]/90 py-3.5 pl-12 pr-4 text-sm text-white outline-none transition-all placeholder:text-slate-600 hover:border-white/20 focus:border-amber-400/80 focus:ring-4 focus:ring-amber-400/10 disabled:opacity-50"
                />
              </div>
            </div>


            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300"
              >
                Password
              </label>

              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
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
                  className="w-full rounded-lg border border-white/10 bg-[#151E32]/90 py-3.5 pl-12 pr-12 text-sm text-white outline-none transition-all placeholder:text-slate-600 hover:border-white/20 focus:border-amber-400/80 focus:ring-4 focus:ring-amber-400/10 disabled:opacity-50"
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
                className="login-error rounded-lg border border-red-400/20 bg-red-500/[0.09] px-4 py-3 text-sm text-red-300"
              >
                {error}
              </div>
            )}


            {/* Login button */}
            <button
              type="submit"
              disabled={loading}
              className="amber-button group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-lg bg-amber-400 py-4 text-sm font-bold text-[#151827] shadow-[0_8px_30px_rgba(251,191,36,0.15)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-amber-300 hover:shadow-[0_12px_35px_rgba(251,191,36,0.3)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="button-shine absolute inset-0" />

              <span className="relative z-10">
                {loading ? "Signing in..." : "Sign in"}
              </span>

              {loading ? (
                <span className="relative z-10 h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="relative z-10 h-5 w-5 transition-transform group-hover:translate-x-1"
                >
                  <path d="M5 12h14m-6-6 6 6-6 6" />
                </svg>
              )}
            </button>

          </form>


          {/* Security footer */}
          <div className="mt-8">

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />

              <div className="flex items-center gap-2 text-slate-400">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="h-4 w-4"
                >
                  <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>

                <span className="text-[9px] tracking-wider">
                  SECURE & ENCRYPTED
                </span>
              </div>

              <div className="h-px flex-1 bg-white/10" />
            </div>

            <p className="mt-5 text-center text-[10px] text-slate-500">
              Authorised users only
            </p>

          </div>

        </div>


        {/* Copyright */}
        <p className="mt-6 text-center text-[10px] tracking-wide text-slate-400/70">
          © {new Date().getFullYear()} YJ Linings Creation Pty Ltd.
        </p>

      </div>


      {/* ================================================== */}
      {/* 7. Animation CSS */}
      {/* ================================================== */}

      <style jsx>{`

        /* Mouse spotlight */
        .mouse-spotlight {
          background: radial-gradient(
            500px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
            rgba(99, 102, 241, 0.15),
            transparent 65%
          );
        }

        /* Blueprint drawing animation */
        .building-lines,
        .building-lines-secondary {
          stroke-dasharray: 12 8;
          animation: blueprintFlow 35s linear infinite,
                     blueprintAppear 3s ease both;
        }

        @keyframes blueprintFlow {
          to {
            stroke-dashoffset: -400;
          }
        }

        @keyframes blueprintAppear {
          from {
            opacity: 0;
          }
          to {
            opacity: .65;
          }
        }

        /* Glass panel */
        .glass-panel {
          background: linear-gradient(
            145deg,
            rgba(43, 57, 86, 0.82),
            rgba(22, 30, 49, 0.92)
          );

          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);

          transform-style: preserve-3d;

          transition:
            transform .18s ease-out,
            border-color .3s ease,
            box-shadow .3s ease;
        }

        .glass-panel:hover {
          border-color: rgba(251, 191, 36, .3);

          box-shadow:
            0 30px 100px rgba(0,0,0,.5),
            0 0 40px rgba(251,191,36,.05);
        }

        /* Button shine */
        .button-shine {
          background: linear-gradient(
            110deg,
            transparent 30%,
            rgba(255,255,255,.5) 50%,
            transparent 70%
          );

          transform: translateX(-120%);
          transition: transform .8s ease;
        }

        .amber-button:hover .button-shine {
          transform: translateX(120%);
        }

        /* Error animation */
        .login-error {
          animation: errorShake .35s ease;
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

        /* Mobile */
        @media (max-width: 640px) {
          .building-lines,
          .building-lines-secondary {
            opacity: .25;
          }
        }

        /* Accessibility */
        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
          }

          .glass-panel {
            transform: none !important;
          }
        }

      `}</style>

    </main>
  );
}
