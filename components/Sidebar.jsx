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
    name: "Projects",
    href: "/projects",
    icon: "▣",
  },
  {
    name: "Suppliers/Subcontractors",
    href: "/suppliers",
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
  {
    name: "Reports",
    href: "/reports",
    icon: "▥",
  },
  {
    name: "Settings",
    href: "/settings",
    icon: "⚙",
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col shrink-0">

      {/* Company 
      <div className="h-20 px-6 flex items-center border-b border-gray-200">
        <div>
          <div className="text-lg font-bold text-gray-900">
            YJ Building
          </div>

          <div className="text-xs text-gray-500">
            Evolution Pty Ltd
          </div>
        </div>
      </div>
        */}     
        
      {/* Navigation */}
      <nav className="flex-1 px-3 py-5">

        <div className="text-xs font-semibold text-gray-400 uppercase px-3 mb-3">
          Management
        </div>

        <div className="space-y-1">

          {menuItems.map((item) => {

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
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
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

      {/* User */}
      <div className="p-4 border-t border-gray-200">

        <div className="flex items-center gap-3">

          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold">
            YJ
          </div>

          <div className="min-w-0">

            <div className="text-sm font-medium text-gray-900">
              YJ Building
            </div>

            <div className="text-xs text-gray-500 truncate">
              Administration
            </div>

          </div>

        </div>

      </div>

    </aside>
  );
}