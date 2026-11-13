
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// ============================================================
// 1. Sidebar Menu Configuration
// ============================================================

const menuItems = [
  { name: "Dashboard", href: "/", icon: "▦", permission: "dashboard" },
  {
    name: "Quote",
    href: "/quote",
    icon: "▣",
    permission: "quote",
    children: [
      { name: "Timeline", href: "/quote/timeline" },
      { name: "Quote List", href: "/quote" },
    ],
  },
  { name: "Projects", href: "/projects", icon: "▣", permission: "projects" },
  { name: "Suppliers", href: "/suppliers", icon: "♙", permission: "suppliers" },
  { name: "Subcontractors", href: "/subcontractors", icon: "♙", permission: "subcontractors" },
  { name: "Clients", href: "/clients", icon: "♙", permission: "clients" },
  { name: "Purchase Orders", href: "/purchase-orders", icon: "□", permission: "purchaseOrders" },
  { name: "Bills", href: "/bills", icon: "□", permission: "bills" },
  { name: "Invoices", href: "/invoices", icon: "▤", permission: "invoices" },
  { name: "Subcontractor Invoices", href: "/sub-invoices", icon: "▤", permission: "subInvoices" },
  { name: "User Settings", href: "/settings", icon: "⚙", permission: "settings" },
];

// ============================================================
// 2. Sidebar Component
// ============================================================

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [uid, setUid] = useState("");
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [role, setRole] = useState("");
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ============================================================
  // 3. Get Authenticated User and RBAC Permissions
  // ============================================================

  useEffect(() => {
    let active = true;

    async function getCurrentUser() {
      try {
        const response = await fetch("/api/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data = await response.json();

        if (!active) return;

        if (!response.ok || !data.authenticated) {
          setUid("");
          setRole("");
          setPermissions({});
          setError("Not signed in");
          return;
        }

        setUid(data.uid || "");
        setRole(data.role || "");

        setPermissions(
          data.permissions &&
          typeof data.permissions === "object" &&
          !Array.isArray(data.permissions)
            ? data.permissions
            : {}
        );

        setError("");

      } catch (err) {
        console.error("Get current user error:", err);

        if (active) {
          setUid("");
          setRole("");
          setPermissions({});
          setError("Unable to get user information");
        }

      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    getCurrentUser();

    return () => {
      active = false;
    };
  }, []);

  // ============================================================
  // 4. Auto Open Quote Submenu
  // ============================================================

  useEffect(() => {
    if (pathname.startsWith("/quote")) {
      setQuoteOpen(true);
    }
  }, [pathname]);

  // ============================================================
  // 5. RBAC Sidebar Filtering
  // ============================================================

  const visibleMenuItems = !loading
    ? role === "admin"
      ? menuItems
      : menuItems.filter(
          (item) => permissions[item.permission] === true
        )
    : [];

  // ============================================================
  // 6. Logout
  // ============================================================

  async function handleLogout() {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      router.replace("/login");
      router.refresh();

    } catch (err) {
      console.error("Logout error:", err);
      alert("Unable to logout. Please try again.");
    }
  }

  // ============================================================
  // 7. Active Menu Styles
  // ============================================================

  const activeStyle =
    "bg-[#D6A64B] text-[#14243A] shadow-sm font-semibold";

  const inactiveStyle =
    "text-[#CBD5E1] hover:bg-[#29415D] hover:text-white";

  // ============================================================
  // 8. Render Sidebar
  // ============================================================

  return (
    <aside className="
      w-64
      bg-[#14243A]
      border-r border-[#2C4059]
      min-h-screen
      flex flex-col
      shrink-0
    ">

      {/* Brand Header */}
      <div className="px-6 py-6 border-b border-[#2C4059]">
        <div className="flex items-center gap-3">

          <div className="
            w-10 h-10
            rounded-xl
            bg-[#D6A64B]
            flex items-center justify-center
            text-[#14243A]
            font-bold text-lg
            shadow-md
          ">
            YJ
          </div>

          <div>
            <div className="text-white font-semibold tracking-wide">
              YJ Building
            </div>

            <div className="text-[10px] text-[#94A3B8] tracking-[2px] uppercase">
              Management System
            </div>
          </div>

        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6">

        <div className="
          text-[10px]
          font-semibold
          text-[#94A3B8]
          uppercase
          tracking-[2px]
          px-3 mb-4
        ">
          Management
        </div>

        <div className="space-y-1">

          {loading ? (
            <div className="px-3 py-3 text-xs text-[#94A3B8]">
              Loading permissions...
            </div>

          ) : error ? (
            <div className="px-3 py-3 text-xs text-red-300">
              {error}
            </div>

          ) : (
            visibleMenuItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              const hasChildren = Array.isArray(item.children);

              // Quote Parent Menu
              if (hasChildren) {
                return (
                  <div key={item.href}>

                    <button
                      type="button"
                      onClick={() => setQuoteOpen(!quoteOpen)}
                      className={`
                        w-full flex items-center justify-between
                        px-3 py-3
                        rounded-lg
                        text-sm font-medium
                        transition-all duration-200
                        ${active ? activeStyle : inactiveStyle}
                      `}
                    >
                      <span className="flex items-center gap-3">
                        <span className="w-5 text-center text-base">
                          {item.icon}
                        </span>

                        <span>{item.name}</span>
                      </span>

                      <span className="text-xs opacity-70">
                        {quoteOpen ? "▾" : "▸"}
                      </span>
                    </button>

                    {/* Quote Submenu */}
                    {quoteOpen && (
                      <div className="
                        ml-6 mt-2 mb-2
                        space-y-1
                        border-l-2 border-[#43556B]
                        pl-3
                      ">

                        {item.children.map((child) => {
                          const childActive =
                            child.href === "/quote"
                              ? pathname === "/quote"
                              : pathname === child.href ||
                                pathname.startsWith(child.href + "/");

                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={`
                                block px-3 py-2.5
                                rounded-md
                                text-xs
                                transition-all duration-200
                                ${
                                  childActive
                                    ? "bg-[#D6A64B] text-[#14243A] font-semibold"
                                    : "text-[#AFC0D2] hover:bg-[#29415D] hover:text-white"
                                }
                              `}
                            >
                              {child.name}
                            </Link>
                          );
                        })}

                      </div>
                    )}

                  </div>
                );
              }

              // Normal Menu
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-3
                    px-3 py-3
                    rounded-lg
                    text-sm font-medium
                    transition-all duration-200
                    ${active ? activeStyle : inactiveStyle}
                  `}
                >
                  <span className="w-5 text-center text-base">
                    {item.icon}
                  </span>

                  <span>{item.name}</span>
                </Link>
              );
            })
          )}

        </div>
      </nav>

      {/* Logout */}
      <div className="px-5 pb-5">

        <button
          onClick={handleLogout}
          className="
            w-full
            rounded-lg
            bg-[#1E344F]
            px-5 py-3
            border border-[#43556B]
            text-sm font-medium
            text-[#CBD5E1]
            transition-all duration-200
            hover:bg-[#D6A64B]
            hover:text-[#14243A]
            hover:border-[#D6A64B]
            cursor-pointer
          "
        >
          Logout
        </button>

      </div>

      {/* User Information */}
      <div className="p-5 border-t border-[#2C4059]">

        <div className="flex items-center gap-3">

          <div className="
            w-10 h-10
            rounded-full
            bg-[#29415D]
            border border-[#52647A]
            flex items-center justify-center
            text-sm font-semibold
            text-[#E8BE70]
            shrink-0
          ">
            YJ
          </div>

          <div className="min-w-0 flex-1">

            <div className="text-sm font-semibold text-white truncate">
              YJ Building
            </div>

            <div className="text-xs text-[#94A3B8] truncate">
              {role ? role.toUpperCase() : "No role"}
            </div>

          </div>

        </div>

        {/* Firebase UID */}
        <div className="mt-5 pt-4 border-t border-[#2C4059]">

          <div className="
            text-[10px]
            font-semibold
            text-[#94A3B8]
            uppercase
            tracking-wider
            mb-2
          ">
            Firebase User UID
          </div>

          <div className="
            text-xs
            text-[#E8BE70]
            break-all
            select-all
            leading-relaxed
          ">
            {loading
              ? "Loading..."
              : uid || error || "Not signed in"}
          </div>

        </div>

        {/* User Role */}
        <div className="mt-4">

          <div className="
            text-[10px]
            font-semibold
            text-[#94A3B8]
            uppercase
            tracking-wider
            mb-2
          ">
            CRM Role
          </div>

          <div className="text-xs font-medium text-[#6EE7B7]">
            {loading ? "Loading..." : role || "No role"}
          </div>

        </div>

      </div>

    </aside>
  );
}
