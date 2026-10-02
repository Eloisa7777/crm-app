
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function QuotePage() {
  /* =====================================================
     Quote Data
  ===================================================== */

  const [quotes, setQuotes] = useState([]);

  /* =====================================================
     Filters
  ===================================================== */

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All Status");

  /* =====================================================
     UI State
  ===================================================== */

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =====================================================
     Load Quotes
  ===================================================== */

  useEffect(() => {
    async function loadQuotes() {
      try {
        setLoading(true);
        setError("");

        const snapshot = await getDocs(
          collection(db, "quote")
        );

        const data = snapshot.docs.map((doc) => {
          const quoteData = doc.data();

          return {
            id: doc.id,

            /* ---------------------------------------------
               Quote Number
               Currently optional because New Quote
               does not generate one yet.
            --------------------------------------------- */

            quoteNumber:
              quoteData.quoteNumber || "",

            /* ---------------------------------------------
               Client
               Prefer client snapshot.
            --------------------------------------------- */

            client:
              typeof quoteData.client === "object"
                ? quoteData.client?.name || ""
                : quoteData.client ||
                  quoteData.clientName ||
                  "",

            /* ---------------------------------------------
               Project
            --------------------------------------------- */

            project:
              quoteData.projectName ||
              quoteData.project ||
              "",

            /* ---------------------------------------------
               Dates
            --------------------------------------------- */

            dueDate:
              quoteData.dueDate || "",

            /* ---------------------------------------------
               Estimator
            --------------------------------------------- */

            estimator:
              quoteData.estimator || "",

            /* ---------------------------------------------
               Status
            --------------------------------------------- */

            status:
              quoteData.status || "Pending Tender",
          };
        });

        console.log(
          "Firebase quote data:",
          data
        );

        setQuotes(data);
      } catch (err) {
        console.error(
          "Firebase quote error:",
          err
        );

        setError(
          err.message ||
            "Failed to load quotes."
        );
      } finally {
        setLoading(false);
      }
    }

    loadQuotes();
  }, []);

  /* =====================================================
     Filter Quotes
  ===================================================== */

  const filteredQuotes = quotes.filter(
    (quote) => {
      const searchText =
        search.toLowerCase().trim();

      const matchesSearch =
        quote.quoteNumber
          .toLowerCase()
          .includes(searchText) ||
        quote.client
          .toLowerCase()
          .includes(searchText) ||
        quote.project
          .toLowerCase()
          .includes(searchText);

      const matchesStatus =
        status === "All Status" ||
        quote.status === status;

      return (
        matchesSearch &&
        matchesStatus
      );
    }
  );

  /* =====================================================
     Render
  ===================================================== */

  return (
    <div className="min-h-screen bg-gray-50 p-8">

      {/* =================================================
          Header
      ================================================= */}

      <div className="mb-8 flex items-center justify-between">

        <div>

          <h1 className="text-2xl font-semibold text-gray-900">
            Quote
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage and create quotes
          </p>

        </div>

        <button
          type="button"
          onClick={() => {
            window.location.href =
              "/quote/new";
          }}
          className="cursor-pointer rounded-lg bg-indigo-800 px-5 py-2.5 text-sm font-medium text-gray-100 transition hover:bg-amber-400 hover:text-black"
        >
          + New Quote
        </button>

      </div>

      {/* =================================================
          Filters
      ================================================= */}

      <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4">

        <div className="flex gap-3">

          {/* Search */}

          <input
            type="text"
            placeholder="Search quote no., client or project..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-200"
          />

          {/* Status */}

          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value)
            }
            className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm"
          >
                 <option value="All Status">
                  All Status
                </option>

                <option value="Pending">
                  Pending Tender
                </option>

                <option value="Tendering">
                  Tendering
                </option>

                <option value="Submitted">
                  Submitted
                </option>

                <option value="onHold">
                  On Hold
                </option>

                <option value="awarded">
                  Awarded
                </option>

                <option value="unsuccessful">
                  Unsuccessful
                </option>

          </select>

        </div>

      </div>

      {/* =================================================
          Error
      ================================================= */}

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4">

          <p className="text-sm text-red-600">
            {error}
          </p>

        </div>
      )}

      {/* =================================================
          Quote Table
      ================================================= */}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">

        <table className="w-full">

          {/* =================================================
              Table Header
          ================================================= */}

          <thead className="border-b border-gray-200 bg-gray-50">

            <tr>

              <th className="px-6 py-4 text-left text-xs font-medium uppercase text-gray-500">
                Quote Number
              </th>

              <th className="px-6 py-4 text-left text-xs font-medium uppercase text-gray-500">
                Client
              </th>

              <th className="px-6 py-4 text-left text-xs font-medium uppercase text-gray-500">
                Project
              </th>

              <th className="px-6 py-4 text-left text-xs font-medium uppercase text-gray-500">
                Due Date
              </th>

              <th className="px-6 py-4 text-left text-xs font-medium uppercase text-gray-500">
                Estimator
              </th>

              <th className="px-6 py-4 text-center text-xs font-medium uppercase text-gray-500">
                Status
              </th>

            </tr>

          </thead>

          {/* =================================================
              Table Body
          ================================================= */}

          <tbody className="divide-y divide-gray-100">

            {/* Loading */}

            {loading && (
              <tr>

                <td
                  colSpan="7"
                  className="px-6 py-16 text-center text-sm text-gray-500"
                >
                  Loading quotes...
                </td>

              </tr>
            )}

            {/* Quote Rows */}

            {!loading &&
              filteredQuotes.map(
                (quote) => (
                  <tr
                    key={quote.id}
                    onClick={() =>
                      (window.location.href =
                        `/quote/${quote.id}`)
                    }
                    className="cursor-pointer transition hover:bg-gray-50"
                  >

                    {/* Quote Number */}

                    <td className="px-6 py-4">

                      <div className="font-medium text-gray-900">
                        {quote.quoteNumber ||
                          "-"}
                      </div>

                    </td>

                    {/* Client */}

                    <td className="px-6 py-4 text-sm text-gray-700">
                      {quote.client || "-"}
                    </td>

                    {/* Project */}

                    <td className="px-6 py-4 text-sm text-gray-700">
                      {quote.project || "-"}
                    </td>

                    {/* Due Date */}

                    <td className="px-6 py-4 text-sm text-gray-500">
                      {quote.dueDate || "-"}
                    </td>

                    {/* Estimator */}

                    <td className="px-6 py-4 text-sm text-gray-500">
                      {quote.estimator || "-"}
                    </td>

                    {/* Status */}

                    <td className="px-6 py-4 text-center">

                      <StatusBadge
                        status={quote.status}
                      />

                    </td>

                  </tr>
                )
              )}

            {/* Empty */}

            {!loading &&
              filteredQuotes.length === 0 && (
                <tr>

                  <td
                    colSpan="7"
                    className="px-6 py-16 text-center text-sm text-gray-500"
                  >
                    No quotes found.
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
    Pending:
      "bg-blue-200 text-gray-700",

    Submitted:
      "bg-purple-200 text-blue-700",

    Awarded:
      "bg-green-200 text-green-700",

    Unsuccessful:
      "bg-red-200 text-red-700",

    onHold:
      "bg-orange-200 text-orange-700",

    Tendering:
      "bg-yellow-200 text-orange-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        styles[status] ||
        styles.Pending
      }`}
    >
      {status || "Pending"}
    </span>
  );
}

