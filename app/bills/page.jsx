
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

/* =====================================================
   Format Currency
===================================================== */

function formatCurrency(value) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(Number(value) || 0);
}

/* =====================================================
   Bills Page
===================================================== */

export default function BillsPage() {
  const [bills, setBills] = useState([]);

  /* =====================================================
     Filters
  ===================================================== */

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");

  /* =====================================================
     Loading & Error
  ===================================================== */

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =====================================================
     Load Bills from Firebase
  ===================================================== */

  useEffect(() => {
    async function loadBills() {
      try {
        setLoading(true);
        setError("");

        const snapshot = await getDocs(
          collection(db, "bills")
        );

        const data = snapshot.docs.map((doc) => {
          const bill = doc.data();

          return {
            id: doc.id,

            billNumber:
              bill.billNumber ||
              bill.invoiceNumber ||
              bill.number ||
              "",

            supplier:
              typeof bill.supplier === "object"
                ? bill.supplier?.name || ""
                : bill.supplier ||
                  bill.supplierName ||
                  "",
            poNumber:
              bill.poNumber ||
              bill.purchaseOrderNumber ||
              "",
            project:
              bill.projectName ||
              bill.project ||
              "",

            date:
              bill.billDate ||
              bill.date ||
              "",

            dueDate:
              bill.dueDate || "",

            ref:
              bill.ref ||
              bill.reference ||
              "",

            amount:
              Number(bill.total) ||
              Number(bill.amount) ||
              0,

            status:
              bill.status || "Awaiting Payment",
          };
        });

        console.log("Firebase Bill data:", data);

        setBills(data);
      } catch (err) {
        console.error("Firebase Bill error:", err);

        setError(
          err.message || "Failed to load bills."
        );
      } finally {
        setLoading(false);
      }
    }

    loadBills();
  }, []);

  /* =====================================================
     Search & Status Filter
  ===================================================== */

  const filteredBills = bills.filter((bill) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      bill.billNumber.toLowerCase().includes(searchText) ||
      bill.supplier.toLowerCase().includes(searchText) ||
      bill.project.toLowerCase().includes(searchText);

    const matchesStatus =
      status === "All" ||
      bill.status === status;

    return matchesSearch && matchesStatus;
  });

  /* =====================================================
     Render
  ===================================================== */

  return (
    <div className="min-h-screen bg-gray-50 p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">

        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Bills
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Manage and track supplier bills
          </p>
        </div>

        <button
          onClick={() => {
            window.location.href = "/bills/new";
          }}
          className="rounded-lg bg-indigo-800 px-5 py-2.5 text-sm font-medium text-gray-100 transition hover:bg-amber-400 hover:text-black cursor-pointer"
        >
          + New Bill
        </button>

      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5">

        <div className="flex gap-3">

          <input
            type="text"
            placeholder="Search bill, supplier or project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-200"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white"
          >
            <option value="All">All Status</option>
            <option value="Awaiting">Awaiting Payment</option>
            <option value="Paid">Paid</option>
            <option value="Overdue">Overdue</option>
            <option value="Void">Void</option>
          </select>

        </div>

      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
          <p className="text-sm text-red-600">
            {error}
          </p>
        </div>
      )}

      {/* Bills Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">

        <table className="w-full">

          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>

              <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase">
                Bill Number
              </th>

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
                Bill Date
              </th>

              <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase">
                Due Date
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

            {/* Loading */}
            {loading && (
              <tr>
                <td
                  colSpan="7"
                  className="px-6 py-16 text-center text-sm text-gray-500"
                >
                  Loading bills...
                </td>
              </tr>
            )}

            {/* Bill Rows */}
            {!loading &&
              filteredBills.map((bill) => (
                <tr
                  key={bill.id}
                  onClick={() => {
                    window.location.href = `/bills/${bill.id}`;
                  }}
                  className="hover:bg-gray-50 cursor-pointer transition"
                >

                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">
                      {bill.billNumber || "-"}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">
                      {bill.poNumber || "-"}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-700">
                    {bill.supplier || "-"}
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-700">
                    {bill.project || "-"}
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-500">
                    {bill.date || "-"}
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-500">
                    {bill.dueDate || "-"}
                  </td>

                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    {formatCurrency(bill.amount)}
                  </td>

                  <td className="px-6 py-4 text-center">
                    <StatusBadge status={bill.status} />
                  </td>

                </tr>
              ))}

            {/* Empty State */}
            {!loading &&
              filteredBills.length === 0 && (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-16 text-center text-sm text-gray-500"
                  >
                    No bills found.
                  </td>
                </tr>
              )}

          </tbody>

        </table>

      </div>

    </div>
  );
}

/* =====================================================
   Status Badge
===================================================== */

function StatusBadge({ status }) {
  const styles = {
    Void: "bg-gray-100 text-gray-700",
    Awaiting: "bg-blue-200 text-blue-700",
    Paid: "bg-green-200 text-green-700",
    Overdue: "bg-red-200 text-red-700",
  };

  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
        styles[status] || styles.Awaiting
      }`}
    >
      {status}
    </span>
  );
}

