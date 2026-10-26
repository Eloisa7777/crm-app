
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(Number(value) || 0);
}

export default function SubInvoicesPage() {
  const [subInvoices, setSubInvoices] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 1. Load Sub-Invoices
  useEffect(() => {
    async function loadSubInvoices() {
      try {
        setLoading(true);
        setError("");

        const snapshot = await getDocs(
          collection(db, "subInvoices")
        );

        const data = snapshot.docs.map((document) => {
          const invoice = document.data();

          return {
            id: document.id,
            invoiceNumber: invoice.invoiceNumber || "",
            date: invoice.invoiceDate || invoice.date || "",
            dueDate: invoice.dueDate || "",
            amount: Number(invoice.total) || Number(invoice.amount) || 0,
            status: invoice.status || "Draft",
          };
        });

        data.sort((a, b) => b.date.localeCompare(a.date));
        setSubInvoices(data);
      } catch (err) {
        console.error("Failed to load Sub-Invoices:", err);
        setError(err.message || "Failed to load Sub-Invoices.");
      } finally {
        setLoading(false);
      }
    }

    loadSubInvoices();
  }, []);

  // 2. Search and filter
  const searchText = search.trim().toLowerCase();

  const filteredInvoices = subInvoices.filter((invoice) => {
    const matchesSearch = invoice.invoiceNumber
      .toLowerCase()
      .includes(searchText);

    const matchesStatus =
      status === "All" || invoice.status === status;

    return matchesSearch && matchesStatus;
  });

  // 3. Page UI
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Invoices
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and create Invoices
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            window.location.href = "/sub-invoices/new";
          }}
          className="cursor-pointer rounded-lg bg-indigo-800 px-5 py-2.5 text-sm font-medium text-gray-100 transition hover:bg-amber-400 hover:text-black"
        >
          + New Invoice
        </button>
      </div>

      {/* Filters */}
      <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="Search Invoice number..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-200"
          />

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm"
          >
            <option value="All">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Issued">Issued</option>
            <option value="Paid">Paid</option>
            <option value="Overdue">Overdue</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Sub-Invoice Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[700px]">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase text-gray-500">
               Invoice Number
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase text-gray-500">
                Invoice Date
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase text-gray-500">
                Due Date
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium uppercase text-gray-500">
                Amount
              </th>
              <th className="px-6 py-4 text-center text-xs font-medium uppercase text-gray-500">
                Status
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-sm text-gray-500">
                  Loading Invoices...
                </td>
              </tr>
            )}

            {!loading &&
              filteredInvoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  onClick={() => {
                    window.location.href = `/sub-invoices/${invoice.id}`;
                  }}
                  className="cursor-pointer transition hover:bg-gray-50"
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">
                      {invoice.invoiceNumber || "—"}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {invoice.date || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {invoice.dueDate || "—"}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    {formatCurrency(invoice.amount)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <StatusBadge status={invoice.status} />
                  </td>
                </tr>
              ))}

            {!loading && filteredInvoices.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-sm text-gray-500">
                  No Invoices found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 4. Status badge
function StatusBadge({ status }) {
  const styles = {
    Draft: "bg-gray-100 text-gray-700",
    Issued: "bg-blue-200 text-blue-700",
    Paid: "bg-green-200 text-green-700",
    Overdue: "bg-orange-200 text-orange-700",
    Cancelled: "bg-red-200 text-red-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        styles[status] || styles.Draft
      }`}
    >
      {status}
    </span>
  );
}
