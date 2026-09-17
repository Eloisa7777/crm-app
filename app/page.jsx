"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen">

      {/* Header */}
      <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between">

        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Dashboard
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Overview of your business operations
          </p>
        </div>

        <Link
          href="/purchase-orders/new"
          className="px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800"
        >
          + New Purchase Order
        </Link>

      </header>


      {/* Content */}
      <div className="p-8">

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

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

      </div>

    </div>
  );
}


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