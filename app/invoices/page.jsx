
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

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadInvoices() {
      try {
        setLoading(true);
        setError("");

        const snapshot = await getDocs(
          collection(db, "invoices")
        );

        const data = snapshot.docs.map((doc) => {
          const invoice = doc.data();

          return {
            id: doc.id,

            invoiceNumber:
              invoice.invoiceNumber || "",

            client:
              typeof invoice.client === "object"
                ? invoice.client?.name || ""
                : invoice.client ||
                  invoice.clientName ||
                  "",

            project:
              invoice.projectName ||
              invoice.project ||
              "",

            date:
              invoice.invoiceDate ||
              invoice.date ||
              "",

            dueDate:
              invoice.dueDate || "",

            ref:
              invoice.ref || "",

            amount:
              Number(invoice.total) ||
              Number(invoice.amount) ||
              0,

            status:
              invoice.status || "Draft",
          };
        });

        console.log(
          "Firebase Invoice data:",
          data
        );

        setInvoices(data);
      } catch (err) {
        console.error(
          "Firebase Invoice error:",
          err
        );

        setError(
          err.message ||
            "Failed to load invoices."
        );
      } finally {
        setLoading(false);
      }
    }

    loadInvoices();
  }, []);

  const filteredInvoices = invoices.filter(
    (invoice) => {
      const searchText =
        search.toLowerCase();

      const matchesSearch =
        invoice.invoiceNumber
          .toLowerCase()
          .includes(searchText) ||
        invoice.client
          .toLowerCase()
          .includes(searchText) ||
        invoice.project
          .toLowerCase()
          .includes(searchText);

      const matchesStatus =
        status === "All" ||
        invoice.status === status;

      return (
        matchesSearch &&
        matchesStatus
      );
    }
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">

        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Invoices
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Manage and create invoices
          </p>
        </div>

        <button
          onClick={() => {
            window.location.href =
              "/invoices/new";
          }}
          className="bg-black text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition"
        >
          + New Invoice
        </button>

      </div>


      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5">

        <div className="flex gap-3">

          <input
            type="text"
            placeholder="Search invoice, client or project..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-200"
          />

          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value)
            }
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

            <option value="Overdue">
              Overdue
            </option>

            <option value="Cancelled">
              Cancelled
            </option>
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


      {/* Invoice Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

        <table className="w-full">

          <thead className="bg-gray-50 border-b border-gray-200">

            <tr>

              <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase">
                Invoice Number
              </th>

              <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase">
                Client
              </th>

              <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase">
                Project
              </th>

              <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase">
                Invoice Date
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

            {loading && (
              <tr>

                <td
                  colSpan="7"
                  className="px-6 py-16 text-center text-sm text-gray-500"
                >
                  Loading invoices...
                </td>

              </tr>
            )}


            {!loading &&
              filteredInvoices.map(
                (invoice) => (
                  <tr
                    key={invoice.id}
                    onClick={() =>
                      (window.location.href =
                        `/invoices/${invoice.id}`)
                    }
                    className="hover:bg-gray-50 cursor-pointer transition"
                  >

                    <td className="px-6 py-4">

                      <div className="font-medium text-gray-900">
                        {invoice.invoiceNumber}
                      </div>

                    </td>


                    <td className="px-6 py-4 text-sm text-gray-700">
                      {invoice.client}
                    </td>


                    <td className="px-6 py-4 text-sm text-gray-700">
                      {invoice.project}
                    </td>


                    <td className="px-6 py-4 text-sm text-gray-500">
                      {invoice.date}
                    </td>


                    <td className="px-6 py-4 text-sm text-gray-500">
                      {invoice.dueDate}
                    </td>


                    <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(
                        invoice.amount
                      )}
                    </td>


                    <td className="px-6 py-4 text-center">

                      <StatusBadge
                        status={invoice.status}
                      />

                    </td>

                  </tr>
                )
              )}


            {!loading &&
              filteredInvoices.length === 0 && (
                <tr>

                  <td
                    colSpan="7"
                    className="px-6 py-16 text-center text-sm text-gray-500"
                  >
                    No invoices found.
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

    Overdue:
      "bg-orange-50 text-orange-700",

    Cancelled:
      "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
        styles[status] ||
        styles.Draft
      }`}
    >
      {status}
    </span>
  );
}


