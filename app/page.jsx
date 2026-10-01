
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  collection,
  getCountFromServer,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

export default function HomePage() {
  const [purchaseOrders, setPurchaseOrders] = useState(0);
  const [outstandingInvoices, setOutstandingInvoices] =
    useState(0);
  const [receivableAmount, setReceivableAmount] =
    useState(0);

  const [projects, setProjects] = useState(0);

  const [attentionQuotes, setAttentionQuotes] =
    useState([]);
  const [attentionInvoices, setAttentionInvoices] =
    useState([]);
  const [attentionPurchaseOrders, setAttentionPurchaseOrders] =
    useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        /* =====================================================
           Active Projects
        ===================================================== */

        const projectsQuery = query(
          collection(db, "projects"),
          where("status", "==", "Active")
        );

        const projectsSnapshot =
          await getCountFromServer(
            projectsQuery
          );

        /* =====================================================
           Purchase Orders
        ===================================================== */

        const purchaseOrderQuery = query(
          collection(db, "purchaseOrders"),
          where("status", "in", [
            "Issued",
            "Draft",
            "Approved",
          ])
        );

        const poSnapshot =
          await getCountFromServer(
            purchaseOrderQuery
          );

        /* =====================================================
           Invoices
        ===================================================== */

        const invoiceQuery = query(
          collection(db, "invoices"),
          where("status", "in", [
            "Issued",
            "Overdue",
          ])
        );

        const invoiceSnapshot =
          await getDocs(invoiceQuery);

        /* =====================================================
           Calculate Outstanding Amount
        ===================================================== */

        let totalReceivable = 0;

        invoiceSnapshot.forEach((doc) => {
          const data = doc.data();

          totalReceivable += Number(
            data.total ?? 0
          );
        });

        /* =====================================================
           Attention - Today's Date
        ===================================================== */

        const today = getTodayDate();

        /* =====================================================
           Attention - Quotes
        ===================================================== */

        const quoteSnapshot = await getDocs(
          collection(db, "quote")
        );

        const quotes = [];

        quoteSnapshot.forEach((doc) => {
          const data = doc.data();

          const dueToday =
            isSameDate(data.dueDate, today);

          const chasingToday =
            isSameDate(data.chasingDate, today);

          if (dueToday || chasingToday) {
            quotes.push({
              id: doc.id,
              ...data,
              dueToday,
              chasingToday,
            });
          }
        });

        setAttentionQuotes(quotes);

        /* =====================================================
           Attention - Invoices
        ===================================================== */

        const invoices = [];

        invoiceSnapshot.forEach((doc) => {
          const data = doc.data();

          if (
            isSameDate(
              data.dueDate,
              today
            )
          ) {
            invoices.push({
              id: doc.id,
              ...data,
            });
          }
        });

        setAttentionInvoices(invoices);

        /* =====================================================
           Attention - Purchase Orders
        ===================================================== */

        const allPurchaseOrdersSnapshot =
          await getDocs(
            collection(
              db,
              "purchaseOrders"
            )
          );

        const purchaseOrders = [];

        allPurchaseOrdersSnapshot.forEach(
          (doc) => {
            const data = doc.data();

            if (
              isSameDate(
                data.deliveryDate,
                today
              )
            ) {
              purchaseOrders.push({
                id: doc.id,
                ...data,
              });
            }
          }
        );

        setAttentionPurchaseOrders(
          purchaseOrders
        );

        /* =====================================================
           Set Dashboard Values
        ===================================================== */

        setProjects(
          projectsSnapshot.data().count
        );

        setPurchaseOrders(
          poSnapshot.data().count
        );

        setOutstandingInvoices(
          invoiceSnapshot.size
        );

        setReceivableAmount(
          totalReceivable
        );
      } catch (error) {
        console.error(
          "Failed to load dashboard:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const attentionCount =
    attentionQuotes.length +
    attentionInvoices.length +
    attentionPurchaseOrders.length;

  return (
    <div className="min-h-screen">

      {/* =====================================================
          Header
      ===================================================== */}

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
          href="/login"
          className="rounded-lg bg-indigo-800 px-5 py-2.5 text-sm font-medium text-gray-100 transition hover:bg-amber-400 hover:text-black cursor-pointer"
        >
          Logout
        </Link>

      </header>

      {/* =====================================================
          Content
      ===================================================== */}

      <div className="p-8">

        {/* ===================================================
            Dashboard Cards
        =================================================== */}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

          {/* Active Projects */}

          <DashboardCard
            title="Active Projects"
            value={
              loading
                ? "—"
                : projects
            }
            description="Currently in progress"
          />

          {/* Purchase Orders */}

          <DashboardCard
            title="Outstanding Purchase Orders"
            value={
              loading
                ? "—"
                : purchaseOrders
            }
            description="Incomplete Purchase Orders"
          />

          {/* Unpaid Invoices */}

          <DashboardCard
            title="Unpaid Invoices"
            value={
              loading
                ? "—"
                : outstandingInvoices
            }
            description="Invoices awaiting payment"
          />

          {/* Outstanding Amount */}

          <DashboardCard
            title="Outstanding Invoices"
            value={
              loading
                ? "—"
                : `$${receivableAmount.toLocaleString(
                    "en-AU",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}`
            }
            description="Awaiting customer payment"
          />

        </div>

        {/* ===================================================
            Attention
        =================================================== */}

        <section className="mt-8">

          <div className="flex items-center justify-between mb-4">

            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Attention
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Items requiring attention today
              </p>
            </div>

            {!loading && attentionCount > 0 && (
              <div className="text-sm text-gray-500">
                {attentionCount} item
                {attentionCount !== 1
                  ? "s"
                  : ""}
              </div>
            )}

          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

            {loading ? (
              <div className="px-6 py-8 text-sm text-gray-500">
                Loading...
              </div>
            ) : attentionCount === 0 ? (
              <div className="px-6 py-10 text-center">

                <div className="text-sm font-medium text-gray-900">
                  Nothing requires attention today
                </div>

                <div className="text-xs text-gray-500 mt-1">
                  No quotes, invoices or purchase orders
                  are due today.
                </div>

              </div>
            ) : (
              <div>

                {/* =================================================
                    Quotes
                ================================================= */}

                {attentionQuotes.length > 0 && (
                  <AttentionGroup
                    title="Quotes"
                    count={attentionQuotes.length}
                  >
                    {attentionQuotes.map(
                      (quote) => (
                        <Link
                          key={quote.id}
                          href={`/quote/${quote.id}`}
                          className="flex items-center justify-between px-6 py-4 border-t border-gray-100 hover:bg-gray-50 transition"
                        >

                          <div className="min-w-0">

                            <div className="text-sm font-medium text-gray-900">
                              {quote.quoteNumber ||
                                quote.number ||
                                quote.name ||
                                `Quote ${quote.id}`}
                            </div>

                            <div className="text-xs text-gray-500 mt-1 truncate">
                              {quote.clientName ||
                                quote.client?.name ||
                                quote.projectName ||
                                "—"}
                            </div>

                          </div>

                          <div className="ml-4 flex items-center gap-2">

                            {quote.dueToday && (
                              <AttentionBadge>
                                Due Today
                              </AttentionBadge>
                            )}

                            {quote.chasingToday && (
                              <AttentionBadge>
                                Chasing Today
                              </AttentionBadge>
                            )}

                          </div>

                        </Link>
                      )
                    )}
                  </AttentionGroup>
                )}

                {/* =================================================
                    Invoices
                ================================================= */}

                {attentionInvoices.length > 0 && (
                  <AttentionGroup
                    title="Invoices"
                    count={attentionInvoices.length}
                  >
                    {attentionInvoices.map(
                      (invoice) => (
                        <Link
                          key={invoice.id}
                          href={`/invoices/${invoice.id}`}
                          className="flex items-center justify-between px-6 py-4 border-t border-gray-100 hover:bg-gray-50 transition"
                        >

                          <div className="min-w-0">

                            <div className="text-sm font-medium text-gray-900">
                              {invoice.invoiceNumber ||
                                invoice.number ||
                                `Invoice ${invoice.id}`}
                            </div>

                            <div className="text-xs text-gray-500 mt-1 truncate">
                              {invoice.clientName ||
                                invoice.client?.name ||
                                invoice.projectName ||
                                "—"}
                            </div>

                          </div>

                          <div className="ml-4 flex items-center gap-3">

                            <span className="text-sm font-medium text-gray-900">
                              {invoice.total != null
                                ? `$${Number(
                                    invoice.total
                                  ).toLocaleString(
                                    "en-AU",
                                    {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    }
                                  )}`
                                : ""}
                            </span>

                            <AttentionBadge>
                              Due Today
                            </AttentionBadge>

                          </div>

                        </Link>
                      )
                    )}
                  </AttentionGroup>
                )}

                {/* =================================================
                    Purchase Orders
                ================================================= */}

                {attentionPurchaseOrders.length > 0 && (
                  <AttentionGroup
                    title="Purchase Orders"
                    count={
                      attentionPurchaseOrders.length
                    }
                  >
                    {attentionPurchaseOrders.map(
                      (po) => (
                        <Link
                          key={po.id}
                          href={`/purchase-orders/${po.id}`}
                          className="flex items-center justify-between px-6 py-4 border-t border-gray-100 hover:bg-gray-50 transition"
                        >

                          <div className="min-w-0">

                            <div className="text-sm font-medium text-gray-900">
                              {po.poNumber ||
                                po.number ||
                                `PO ${po.id}`}
                            </div>

                            <div className="text-xs text-gray-500 mt-1 truncate">
                              {po.supplier?.name ||
                                po.supplierName ||
                                po.projectName ||
                                "—"}
                            </div>

                          </div>

                          <AttentionBadge>
                            Delivery Today
                          </AttentionBadge>

                        </Link>
                      )
                    )}
                  </AttentionGroup>
                )}

              </div>
            )}

          </div>

        </section>

      </div>

    </div>
  );
}


/* ============================================================
   Dashboard Card
============================================================ */

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


/* ============================================================
   Attention Group
============================================================ */

function AttentionGroup({
  title,
  count,
  children,
}) {
  return (
    <div>

      <div className="px-6 py-3 bg-gray-50 flex items-center justify-between">

        <div className="text-sm font-semibold text-gray-800">
          {title}
        </div>

        <div className="text-xs text-gray-500">
          {count}
        </div>

      </div>

      {children}

    </div>
  );
}


/* ============================================================
   Attention Badge
============================================================ */

function AttentionBadge({
  children,
}) {
  return (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 whitespace-nowrap">
      {children}
    </span>
  );
}


/* ============================================================
   Get Today's Date
============================================================ */

function getTodayDate() {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Australia/Brisbane",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(new Date());
}


/* ============================================================
   Compare Date
============================================================ */

function isSameDate(
  value,
  today
) {
  if (!value) return false;

  /* ----------------------------------------------------------
     Firestore Timestamp
  ---------------------------------------------------------- */

  if (
    typeof value === "object" &&
    typeof value.toDate === "function"
  ) {
    return (
      formatDateForComparison(
        value.toDate()
      ) === today
    );
  }

  /* ----------------------------------------------------------
     JavaScript Date
  ---------------------------------------------------------- */

  if (value instanceof Date) {
    return (
      formatDateForComparison(
        value
      ) === today
    );
  }

  /* ----------------------------------------------------------
     String
  ---------------------------------------------------------- */

  if (typeof value === "string") {

    /*
      If stored as YYYY-MM-DD,
      compare directly.
    */

    if (
      /^\d{4}-\d{2}-\d{2}$/.test(
        value
      )
    ) {
      return value === today;
    }

    /*
      Otherwise try to parse it.
    */

    const parsedDate =
      new Date(value);

    if (
      !Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return (
        formatDateForComparison(
          parsedDate
        ) === today
      );
    }
  }

  return false;
}


/* ============================================================
   Format Date For Comparison
============================================================ */

function formatDateForComparison(
  date
) {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Australia/Brisbane",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(date);
}