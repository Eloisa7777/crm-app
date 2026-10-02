"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: "▦",
  },
    {
    name: "Quote",
    href: "/quote",
    icon: "▣",
  },
  {
    name: "Projects",
    href: "/projects",
    icon: "▣",
  },
  {
    name: "Suppliers",
    href: "/suppliers",
    icon: "♙",
  },
    {
    name: "Subcontractors",
    href: "/subcontractors",
    icon: "♙",
  },
  {
    name: "Clients",
    href: "/clients",
    icon: "♙",
  },
  {
    name: "Purchase Orders",
    href: "/purchase-orders",
    icon: "□",
  },
  {
    name: "Invoices",
    href: "/invoices",
    icon: "▤",
  },
];

export default function Sidebar({ role }) {
  const pathname = usePathname();

  const isPOUser = role === "yjpo";
  const isESTUser = role === "yjest";

  // yjpo can only access suppliers and purchase orders
  const visibleMenuItems = isPOUser
    ? menuItems.filter(
        (item) =>
          item.href === "/suppliers" ||
          item.href === "/subcontractors" ||
          item.href === "/purchase-orders"
      )
      : isESTUser
      ? menuItems.filter(
          (item) =>
            item.href === "/quote"
        )
    : menuItems;

  return (
    <aside className="w-64 bg-indigo-800 border-r border-gray-200 min-h-screen flex flex-col shrink-0">

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5">

        <div className="text-xs font-semibold text-gray-400 uppercase px-3 mb-3">
          Management
        </div>

        <div className="space-y-1">

          {visibleMenuItems.map((item) => {

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

                <span>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
  
        <div className="flex items-center gap-3 mb-4 px-6 ">
        <Link
          href="/login"
          className=" rounded-lg bg-indigo-800 px-5 py-2.5 border border-gray-200 text-sm font-medium text-gray-100 transition hover:bg-amber-400 hover:text-black cursor-pointer"
        >
          Logout
        </Link>

        </div>

      {/* User */}
      <div className="p-4 border-t border-gray-200">

        <div className="flex items-center gap-3">

          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold">
            {isPOUser ? "PO" : isESTUser ? "EST" : "YJ"}
          </div>

          <div className="min-w-0">

            <div className="text-sm font-medium text-white truncate">
              {isPOUser ? "YJ PO" : isESTUser ? "YJ Estimator" : "YJ Building"}
            </div>

            <div className="text-xs text-gray-400 truncate">
              {isPOUser ? "Purchase Orders" : isESTUser ? "Quote Management" : "Administration"}
            </div>

          </div>

        </div>

      </div>

    </aside>
  );
}