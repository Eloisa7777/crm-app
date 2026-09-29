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
  const [outstandingInvoices, setOutstandingInvoices] = useState(0);
  const [receivableAmount, setReceivableAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState(0);

  useEffect(() => {
    async function loadDashboard() {
      try {
        // =========================
        // Active Projects
        // =========================
        const projectsQuery = query(
          collection(db, "projects"),
          where("status", "==", "Active")
        );

        const projectsSnapshot = await getCountFromServer(
          projectsQuery
        );

        // =========================
        // Purchase Orders
        // =========================
        const purchaseOrderQuery = query(
          collection(db, "purchaseOrders"),
          where("status", "in", [
            "Issued",
            "Draft",
            "Approved",
          ])
        );

        const poSnapshot = await getCountFromServer(
          purchaseOrderQuery
        );

        // =========================
        // Invoices
        // =========================
        const invoiceQuery = query(
          collection(db, "invoices"),
          where("status", "in", [
            "Issued",
            "Overdue",
          ])
        );

        const invoiceSnapshot = await getDocs(
          invoiceQuery
        );

        // =========================
        // Calculate outstanding amount
        // =========================
        let totalReceivable = 0;

        invoiceSnapshot.forEach((doc) => {
          const data = doc.data();

          totalReceivable += Number(
            data.total ?? 0
          );
        });

        // =========================
        // Set dashboard values
        // =========================
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
          href="/login"
          className="rounded-lg bg-indigo-800 px-5 py-2.5 text-sm font-medium text-gray-100 transition hover:bg-amber-400 hover:text-black cursor-pointer"
        >
          Logout
        </Link>

      </header>

      {/* Content */}
      <div className="p-8">

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