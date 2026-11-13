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
  const [attentionBills, setAttentionBills] = useState([]);
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

          if (dueToday) {
            quotes.push({
              id: doc.id,
              ...data,
              dueToday,
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
           Attention - Bills
        ===================================================== */

        const billSnapshot = await getDocs(
          collection(db, "bills")
        );

        const bills = [];

        billSnapshot.forEach((doc) => {
          const data = doc.data();

          if (isSameDate(data.dueDate, today)) {
            bills.push({
              id: doc.id,
              ...data,
            });
          }
        });

        setAttentionBills(bills);


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
    attentionBills.length +
    attentionPurchaseOrders.length;

  return (
    <div className="min-h-screen bg-[#F4F6F8]">

      {/* =====================================================
          Header
      ===================================================== */}

      <header className="h-20 bg-white border-b border-[#E2E8F0] px-8 flex items-center justify-between shadow-[0_1px_3px_rgba(20,36,58,0.03)]">

        <div>
          <h1 className="text-xl font-semibold text-[#14243A]">
            Dashboard
          </h1>

          <p className="text-sm text-[#64748B] mt-1">
            Overview of your business operations
          </p>
        </div>

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
              <h2 className="text-lg font-semibold text-[#14243A]">
                Attention
              </h2>

              <p className="text-sm text-[#64748B] mt-1">
                Items requiring attention today
              </p>
            </div>

            {!loading && attentionCount > 0 && (
              <div className="text-sm text-[#64748B]">
                {attentionCount} item
                {attentionCount !== 1
                  ? "s"
                  : ""}
              </div>
            )}

          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-[0_2px_8px_rgba(20,36,58,0.04)]">

            {loading ? (
              <div className="px-6 py-8 text-sm text-[#64748B]">
                Loading...
              </div>
            ) : attentionCount === 0 ? (
              <div className="px-6 py-12 text-center">

                <div className="text-sm font-medium text-[#14243A]">
                  Nothing requires attention today
                </div>

                <div className="text-xs text-[#64748B] mt-1">
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
                          className="flex items-center justify-between gap-4 px-6 py-4 border-t border-[#EDF1F5] hover:bg-[#F8FAFC] transition-colors"
                        >

                          <div className="min-w-0">

                            <div className="text-sm font-medium text-[#14243A]">
                              {quote.quoteNumber ||
                                quote.number ||
                                quote.name ||
                                `Quote ${quote.id}`}
                            </div>

                            <div className="text-xs text-[#64748B] mt-1 truncate">
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
                          className="flex items-center justify-between gap-4 px-6 py-4 border-t border-[#EDF1F5] hover:bg-[#F8FAFC] transition-colors"
                        >

                          <div className="min-w-0">

                            <div className="text-sm font-medium text-[#14243A]">
                              {invoice.invoiceNumber ||
                                invoice.number ||
                                `Invoice ${invoice.id}`}
                            </div>

                            <div className="text-xs text-[#64748B] mt-1 truncate">
                              {invoice.clientName ||
                                invoice.client?.name ||
                                invoice.projectName ||
                                "—"}
                            </div>

                          </div>

                          <div className="ml-4 flex items-center gap-3">

                            <span className="text-sm font-medium text-[#1E344F]">
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
                    Bills
                ================================================= */}

                {attentionBills.length > 0 && (
                  <AttentionGroup
                    title="Bills"
                    count={attentionBills.length}
                  >
                    {attentionBills.map(
                      (bill) => (
                        <Link
                          key={bill.id}
                          href={`/bills/${bill.id}`}
                          className="flex items-center justify-between gap-4 px-6 py-4 border-t border-[#EDF1F5] hover:bg-[#F8FAFC] transition-colors"
                        >

                          <div className="min-w-0">

                            <div className="text-sm font-medium text-[#14243A]">
                              {bill.billNumber ||
                                bill.number ||
                                `Bill ${bill.id}`}
                            </div>

                            <div className="text-xs text-[#64748B] mt-1 truncate">
                              {bill.supplierName ||
                                bill.supplier?.name ||
                                bill.projectName ||
                                "—"}
                            </div>

                          </div>

                          <div className="ml-4 flex items-center gap-3">

                            <span className="text-sm font-medium text-[#1E344F]">
                              {bill.total != null
                                ? `$${Number(
                                    bill.total
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
                          className="flex items-center justify-between gap-4 px-6 py-4 border-t border-[#EDF1F5] hover:bg-[#F8FAFC] transition-colors"
                        >

                          <div className="min-w-0">

                            <div className="text-sm font-medium text-[#14243A]">
                              {po.poNumber ||
                                po.number ||
                                `PO ${po.id}`}
                            </div>

                            <div className="text-xs text-[#64748B] mt-1 truncate">
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
    <div className="relative bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-[0_2px_8px_rgba(20,36,58,0.04)] overflow-hidden transition-shadow hover:shadow-[0_6px_18px_rgba(20,36,58,0.08)]">

      <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#D6A64B]" />

      <div className="text-sm text-[#64748B]">
        {title}
      </div>

      <div className="text-2xl font-semibold text-[#14243A] mt-2">
        {value}
      </div>

      <div className="text-xs text-[#64748B] mt-2">
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

      <div className="px-6 py-3 bg-[#F8FAFC] border-t border-[#EDF1F5] flex items-center justify-between">

        <div className="text-sm font-semibold text-[#1E344F]">
          {title}
        </div>

        <div className="text-xs font-medium text-[#64748B]">
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
    <span className="inline-flex items-center rounded-full bg-[#FBF3E3] border border-[#F0DFBA] px-2.5 py-1 text-xs font-semibold text-[#A87924] whitespace-nowrap">
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