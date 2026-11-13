
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
              quoteData.status || "Quoting",
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
    <div className="general-page min-h-screen p-8">

      {/* =================================================
          Header
      ================================================= */}

      <div className="page-header mb-8 flex items-center justify-between">

        <div>

          <h1 className="page-title text-2xl font-semibold text-gray-900">
            Quote
          </h1>

          <p className="page-description mt-1 text-sm text-gray-500">
            Manage and create quotes
          </p>

        </div>

        <button
          type="button"
          onClick={() => {
            window.location.href =
              "/quote/new";
          }}
          className="btn-primary cursor-pointer rounded-lg bg-[#14243A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#D6A64B] hover:text-[#14243A] hover:shadow-md"
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

                <option value="quoting">
                  Quoting
                </option>

                <option value="underReview">
                  Under Review
                </option>

                <option value="Submitted">
                  Submitted
                </option>

                <option value="awarded">
                  Awarded
                </option>

                <option value="lost">
                  Lost
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

      <div className="page-card overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">

        <table className="w-full">

          {/* =================================================
              Table Header
          ================================================= */}

          <thead className="border-b border-gray-200 bg-gray-50">

            <tr>

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
    quoting:
      "bg-red-200 text-red-700",

    submitted:
      "bg-purple-200 text-purple-700",

    awarded:
      "bg-green-200 text-green-700",

    lost:
      "bg-gray-200 text-gray-700",

    underReview:
      "bg-yellow-200 text-yellow-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        styles[status] ||
        styles.quoting
      }`}
    >
      {status || "Quoting"}
    </span>
  );
}

