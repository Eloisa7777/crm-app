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
    name: "Suppliers",
    href: "/suppliers",
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

export default function HomePage() {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">

        {/* Logo / Company */}
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

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5">
          <div className="text-xs font-semibold text-gray-400 uppercase px-3 mb-3">
            Management
          </div>

          <div className="space-y-1">
            {menuItems.map((item) => {
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg
                    text-sm font-medium transition
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

                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User / Company */}
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

      {/* Main Content */}
      <main className="flex-1 min-w-0">

        {/* Top Header */}
        <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Dashboard
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Overview of your business operations
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/purchase-orders/new"
              className="px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
            >
              + New Purchase Order
            </Link>
          </div>
        </header>

        {/* Dashboard */}
        <div className="p-8">

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">

            <DashboardCard
              title="Active Projects"
              value="12"
              description="Currently in progress"
            />

            <DashboardCard
              title="Purchase Orders"
              value="48"
              description="This financial year"
            />

            <DashboardCard
              title="Outstanding Invoices"
              value="$24,580"
              description="Awaiting payment"
            />

            <DashboardCard
              title="Suppliers"
              value="36"
              description="Active suppliers"
            />

          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* Recent Purchase Orders */}
            <div className="xl:col-span-2 bg-white border border-gray-200 rounded-xl">

              <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">

                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Recent Purchase Orders
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    Latest purchase orders
                  </p>
                </div>

                <Link
                  href="/purchase-orders"
                  className="text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  View all →
                </Link>

              </div>

              <div className="overflow-x-auto">

                <table className="w-full text-sm">

                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      <th className="px-6 py-3 font-medium text-gray-500">
                        PO Number
                      </th>

                      <th className="px-6 py-3 font-medium text-gray-500">
                        Supplier
                      </th>

                      <th className="px-6 py-3 font-medium text-gray-500">
                        Project
                      </th>

                      <th className="px-6 py-3 font-medium text-gray-500">
                        Amount
                      </th>

                      <th className="px-6 py-3 font-medium text-gray-500">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>

                    <PurchaseOrderRow
                      number="PO-2026-00125"
                      supplier="ABC Plasterboard Supplies"
                      project="Example Project A"
                      amount="$3,740.00"
                      status="Issued"
                    />

                    <PurchaseOrderRow
                      number="PO-2026-00124"
                      supplier="XYZ Aluminium"
                      project="Example Project B"
                      amount="$2,310.00"
                      status="Draft"
                    />

                    <PurchaseOrderRow
                      number="PO-2026-00123"
                      supplier="ABC Plasterboard Supplies"
                      project="Example Project C"
                      amount="$8,920.00"
                      status="Paid"
                    />

                  </tbody>

                </table>

              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white border border-gray-200 rounded-xl">

              <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-900">
                  Quick Actions
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Common tasks
                </p>
              </div>

              <div className="p-4 space-y-2">

                <QuickAction
                  href="/purchase-orders/new"
                  title="Create Purchase Order"
                  description="Create a new PO"
                />

                <QuickAction
                  href="/projects"
                  title="View Projects"
                  description="Manage your projects"
                />

                <QuickAction
                  href="/suppliers"
                  title="Manage Suppliers"
                  description="View supplier information"
                />

                <QuickAction
                  href="/invoices"
                  title="View Invoices"
                  description="Manage invoices"
                />

              </div>

            </div>

          </div>

        </div>
      </main>
    </div>
  );
}


/* =========================
   Dashboard Card
========================= */

function DashboardCard({
  title,
  value,
  description,
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">

      <div className="text-sm text-gray-500">
        {title}
      </div>

      <div className="text-2xl font-semibold text-gray-900 mt-2">
        {value}
      </div>

      <div className="text-xs text-gray-500 mt-2">
        {description}
      </div>

    </div>
  );
}


/* =========================
   Purchase Order Row
========================= */

function PurchaseOrderRow({
  number,
  supplier,
  project,
  amount,
  status,
}) {
  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50">

      <td className="px-6 py-4 font-medium text-gray-900">
        {number}
      </td>

      <td className="px-6 py-4 text-gray-600">
        {supplier}
      </td>

      <td className="px-6 py-4 text-gray-600">
        {project}
      </td>

      <td className="px-6 py-4 font-medium text-gray-900">
        {amount}
      </td>

      <td className="px-6 py-4">
        <StatusBadge status={status} />
      </td>

    </tr>
  );
}


/* =========================
   Status Badge
========================= */

function StatusBadge({ status }) {
  const styles = {
    Draft: "bg-gray-100 text-gray-600",
    Issued: "bg-blue-50 text-blue-700",
    Paid: "bg-green-50 text-green-700",
  };

  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
        styles[status] || "bg-gray-100 text-gray-600"
      }`}
    >
      {status}
    </span>
  );
}


/* =========================
   Quick Action
========================= */

function QuickAction({
  href,
  title,
  description,
}) {
  return (
    <Link
      href={href}
      className="block p-4 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition"
    >
      <div className="font-medium text-sm text-gray-900">
        {title}
      </div>

      <div className="text-xs text-gray-500 mt-1">
        {description}
      </div>
    </Link>
  );
}