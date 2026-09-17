"use client";

import { useState } from "react";

const initialPOs = [
  {
    id: 1,
    poNumber: "PO-2026-00125",
    supplier: "ABC Plasterboard Supplies",
    project: "Example Project A",
    date: "16/09/2026",
    deliveryDate: "25/09/2026",
    amount: 3740,
    status: "Issued",
  },
  {
    id: 2,
    poNumber: "PO-2026-00124",
    supplier: "XYZ Aluminium",
    project: "Example Project B",
    date: "15/09/2026",
    deliveryDate: "22/09/2026",
    amount: 2310,
    status: "Draft",
  },
  {
    id: 3,
    poNumber: "PO-2026-00123",
    supplier: "ABC Plasterboard Supplies",
    project: "Example Project C",
    date: "12/09/2026",
    deliveryDate: "20/09/2026",
    amount: 8920,
    status: "Paid",
  },
];

function formatCurrency(value) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(value);
}

export default function PurchaseOrdersPage() {
  const [purchaseOrders] = useState(initialPOs);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");

  const filteredPOs = purchaseOrders.filter((po) => {
    const matchesSearch =
      po.poNumber.toLowerCase().includes(search.toLowerCase()) ||
      po.supplier.toLowerCase().includes(search.toLowerCase()) ||
      po.project.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      status === "All" || po.status === status;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">

        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Purchase Orders
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Manage and create purchase orders
          </p>
        </div>

        <button
          onClick={() => {
            window.location.href = "/purchase-orders/new";
          }}
          className="bg-black text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition"
        >
          + New PO
        </button>

      </div>


      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5">

        <div className="flex gap-3">

          <input
            type="text"
            placeholder="Search PO, supplier or project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-200"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white"
          >
            <option value="All">
              All Status
            </option>

            <option value="Draft">
              Draft
            </option>

            <option value="Issued">
              Issued
            </option>

            <option value="Paid">
              Paid
            </option>

            <option value="Cancelled">
              Cancelled
            </option>
          </select>

        </div>

      </div>


      {/* PO Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

        <table className="w-full">

          <thead className="bg-gray-50 border-b border-gray-200">

            <tr>

              <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase">
                PO Number
              </th>

              <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase">
                Supplier
              </th>

              <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase">
                Project
              </th>

              <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase">
                PO Date
              </th>

              <th className="text-right px-6 py-4 text-xs font-medium text-gray-500 uppercase">
                Amount
              </th>

              <th className="text-center px-6 py-4 text-xs font-medium text-gray-500 uppercase">
                Status
              </th>

            </tr>

          </thead>


          <tbody className="divide-y divide-gray-100">

            {filteredPOs.map((po) => (

              <tr
                key={po.id}
                onClick={() =>
                  (window.location.href =
                    `/purchase-orders/${po.id}`)
                }
                className="hover:bg-gray-50 cursor-pointer transition"
              >

                <td className="px-6 py-4">

                  <div className="font-medium text-gray-900">
                    {po.poNumber}
                  </div>

                </td>


                <td className="px-6 py-4 text-sm text-gray-700">
                  {po.supplier}
                </td>


                <td className="px-6 py-4 text-sm text-gray-700">
                  {po.project}
                </td>


                <td className="px-6 py-4 text-sm text-gray-500">
                  {po.date}
                </td>


                <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                  {formatCurrency(po.amount)}
                </td>


                <td className="px-6 py-4 text-center">

                  <StatusBadge status={po.status} />

                </td>

              </tr>

            ))}


            {filteredPOs.length === 0 && (

              <tr>

                <td
                  colSpan="6"
                  className="px-6 py-16 text-center text-sm text-gray-500"
                >
                  No purchase orders found.
                </td>

              </tr>

            )}

          </tbody>

        </table>

      </div>

    </div>
  );
}


function StatusBadge({ status }) {

  const styles = {
    Draft:
      "bg-gray-100 text-gray-700",

    Issued:
      "bg-blue-50 text-blue-700",

    Paid:
      "bg-green-50 text-green-700",

    Cancelled:
      "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
        styles[status] || styles.Draft
      }`}
    >
      {status}
    </span>
  );
}