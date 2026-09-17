"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

const suppliers = {
  "abc-plasterboard": {
    name: " LK Plastering",
    abn: "44397435325",
    contact: "Kun Liu",
    email: "huize0616@gmail.com",
    phone: "-",
    address: "-",
    status: "Active",
    orders: 10,
    total: 38450,
  },

  "xyz-aluminium": {
    name: "XYZ Aluminium",
    abn: "23 456 789 012",
    contact: "David Lee",
    email: "david@xyzaluminium.com.au",
    phone: "07 3234 5678",
    address: "18 Trade Street, Brisbane QLD 4101",
    status: "Active",
    orders: 8,
    total: 27680,
  },

  "prime-carpentry": {
    name: "Prime Carpentry",
    abn: "34 567 890 123",
    contact: "Michael Brown",
    email: "michael@primecarpentry.com.au",
    phone: "0412 345 678",
    address: "10 Builder Avenue, Logan QLD 4114",
    status: "Active",
    orders: 6,
    total: 18920,
  },

  "brisbane-insulation": {
    name: "Brisbane Insulation Services",
    abn: "45 678 901 234",
    contact: "Sarah Wilson",
    email: "sarah@brisbaneinsulation.com.au",
    phone: "0433 456 789",
    address: "42 Commerce Drive, Eagle Farm QLD 4009",
    status: "Inactive",
    orders: 3,
    total: 8240,
  },
};

const purchaseOrders = [
  {
    number: "PO-2026-00125",
    project: "Example Project A",
    date: "16/09/2026",
    amount: 3740,
    status: "Issued",
  },
  {
    number: "PO-2026-00118",
    project: "Example Project B",
    date: "08/09/2026",
    amount: 4280,
    status: "Paid",
  },
  {
    number: "PO-2026-00105",
    project: "Example Project C",
    date: "28/08/2026",
    amount: 5620,
    status: "Paid",
  },
  {
    number: "PO-2026-00092",
    project: "Example Project D",
    date: "15/08/2026",
    amount: 3180,
    status: "Paid",
  },
];

export default function SupplierDetailsPage() {
  const params = useParams();

  const supplier = suppliers[params.id];

  if (!supplier) {
    return (
      <div className="min-h-screen">

        <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center">
          <Link
            href="/suppliers"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Suppliers
          </Link>
        </header>

        <div className="p-8">

          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">

            <h1 className="text-lg font-semibold text-gray-900">
              Supplier not found
            </h1>

            <p className="text-sm text-gray-500 mt-2">
              The supplier you are looking for does not exist.
            </p>

          </div>

        </div>

      </div>
    );
  }

  return (
    <div className="min-h-screen">

      {/* Header */}
      <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between">

        <div className="flex items-center gap-4">

          <Link
            href="/suppliers"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Suppliers
          </Link>

          <div className="h-5 w-px bg-gray-200" />

          <div>

            <h1 className="text-xl font-semibold text-gray-900">
              {supplier.name}
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Supplier details
            </p>

          </div>

        </div>

        <Link
          href={`/suppliers/${params.id}/edit`}
          className="px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
        >
          Edit Supplier
        </Link>

      </header>


      {/* Content */}
      <div className="p-8">

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">


          {/* Supplier Information */}
          <section className="xl:col-span-1 bg-white border border-gray-200 rounded-xl">

            <div className="px-6 py-5 border-b border-gray-200">

              <div className="flex items-center justify-between">

                <div>

                  <h2 className="text-base font-semibold text-gray-900">
                    Supplier Information
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    Contact details
                  </p>

                </div>

                <StatusBadge status={supplier.status} />

              </div>

            </div>


            <div className="p-6 space-y-5">

              <InfoItem
                label="Supplier Name"
                value={supplier.name}
              />

              <InfoItem
                label="ABN"
                value={supplier.abn}
              />

              <InfoItem
                label="Contact Name"
                value={supplier.contact}
              />

              <InfoItem
                label="Email"
                value={supplier.email}
              />

              <InfoItem
                label="Phone"
                value={supplier.phone}
              />

              <InfoItem
                label="Address"
                value={supplier.address}
              />

            </div>

          </section>


          {/* Purchase Orders */}
          <section className="xl:col-span-2 bg-white border border-gray-200 rounded-xl">

            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">

              <div>

                <h2 className="text-base font-semibold text-gray-900">
                  Purchase Orders
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Purchase orders associated with this supplier
                </p>

              </div>

              <Link
                href="/purchase-orders/new"
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800"
              >
                + New PO
              </Link>

            </div>


            <div className="overflow-x-auto">

              <table className="w-full text-sm">

                <thead>

                  <tr className="border-b border-gray-200 bg-gray-50 text-left">

                    <th className="px-6 py-3 font-medium text-gray-500">
                      PO Number
                    </th>

                    <th className="px-6 py-3 font-medium text-gray-500">
                      Project
                    </th>

                    <th className="px-6 py-3 font-medium text-gray-500">
                      Date
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

                  {purchaseOrders.map((po) => (

                    <tr
                      key={po.number}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                    >

                      <td className="px-6 py-4">

                        <Link
                          href="/purchase-orders"
                          className="font-medium text-gray-900 hover:underline"
                        >
                          {po.number}
                        </Link>

                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {po.project}
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {po.date}
                      </td>

                      <td className="px-6 py-4 font-medium text-gray-900">
                        {formatCurrency(po.amount)}
                      </td>

                      <td className="px-6 py-4">
                        <POStatusBadge status={po.status} />
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </section>


        </div>


        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">

          <div className="bg-white border border-gray-200 rounded-xl p-6">

            <div className="text-sm text-gray-500">
              Total Purchase Orders
            </div>

            <div className="text-2xl font-semibold text-gray-900 mt-2">
              {supplier.orders}
            </div>

          </div>


          <div className="bg-white border border-gray-200 rounded-xl p-6">

            <div className="text-sm text-gray-500">
              Total PO Value
            </div>

            <div className="text-2xl font-semibold text-gray-900 mt-2">
              {formatCurrency(supplier.total)}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}


/* =========================
   Info Item
========================= */

function InfoItem({ label, value }) {
  return (
    <div>

      <div className="text-xs font-medium text-gray-400 uppercase">
        {label}
      </div>

      <div className="text-sm text-gray-900 mt-1">
        {value || "-"}
      </div>

    </div>
  );
}


/* =========================
   Status Badge
========================= */

function StatusBadge({ status }) {
  const styles = {
    Active: "bg-green-50 text-green-700",
    Inactive: "bg-gray-100 text-gray-600",
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
   PO Status
========================= */

function POStatusBadge({ status }) {
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
   Currency
========================= */

function formatCurrency(value) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(value);
}