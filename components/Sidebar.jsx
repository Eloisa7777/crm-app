
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// ============================================================
// 1. Sidebar Menu Configuration
// Each menu is linked to Firestore role permission
// ============================================================

const menuItems = [
  { name: "Dashboard", href: "/", icon: "▦", permission: "dashboard" },
  { name: "Quote", href: "/quote", icon: "▣", permission: "quote" },
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
  const [role, setRole] = useState("");
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ============================================================
  // 3. Get authenticated user and RBAC permissions
  // Data comes from server-side /api/me
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

        // Only accept a valid permissions object.
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
  // 4. RBAC Sidebar Filtering
  //
  // Admin:
  //   Show all menus
  //
  // Other roles:
  //   Show menus only when permission === true
  //
  // Loading:
  //   Do not show menus before permissions are loaded
  // ============================================================

  const visibleMenuItems = !loading
    ? role === "admin"
      ? menuItems
      : menuItems.filter(
          (item) => permissions[item.permission] === true
        )
    : [];

  // ============================================================
  // 5. Logout
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
  // 6. Render Sidebar
  // ============================================================

  return (
    <aside className="w-64 bg-indigo-800 border-r border-gray-200 min-h-screen flex flex-col shrink-0">

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5">

        <div className="text-xs font-semibold text-gray-400 uppercase px-3 mb-3">
          Management
        </div>

        <div className="space-y-1">

          {loading ? (
            <div className="px-3 py-3 text-xs text-gray-400">
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

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-3
                    px-3 py-2.5
                    rounded-lg
                    text-sm font-medium
                    transition
                    ${
                      active
                        ? "bg-amber-400 text-black"
                        : "text-gray-300 hover:bg-indigo-300 hover:text-black"
                    }
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
      <div className="flex items-center gap-3 mb-4 px-6">
        <button
          onClick={handleLogout}
          className="rounded-lg bg-indigo-800 px-5 py-2.5 border border-gray-200 text-sm font-medium text-gray-100 transition hover:bg-amber-400 hover:text-black cursor-pointer"
        >
          Logout
        </button>
      </div>

      {/* User Information */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3">

          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-indigo-800 shrink-0">
            YJ
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-white truncate">
              YJ Building
            </div>

            <div className="text-xs text-gray-400 truncate">
              {role ? role.toUpperCase() : "No role"}
            </div>
          </div>

        </div>

        {/* Firebase UID */}
        <div className="mt-4 pt-3 border-t border-indigo-600">
          <div className="text-xs font-semibold text-gray-400 mb-2">
            Firebase User UID
          </div>

          <div className="text-xs text-amber-300 break-all select-all leading-relaxed">
            {loading
              ? "Loading..."
              : uid || error || "Not signed in"}
          </div>
        </div>

        {/* User Role */}
        <div className="mt-3">
          <div className="text-xs font-semibold text-gray-400 mb-1">
            CRM Role
          </div>

          <div className="text-xs text-green-300">
            {loading ? "Loading..." : role || "No role"}
          </div>
        </div>

      </div>

    </aside>
  );
}
