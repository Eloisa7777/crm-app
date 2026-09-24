
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  collection,
  getCountFromServer,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function HomePage() {
  const [purchaseOrders, setPurchaseOrders] = useState(0);
  const [suppliers, setSuppliers] = useState(0);
  const [outstandingInvoices, setOutstandingInvoices] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        // Purchase Orders
        const poSnapshot = await getCountFromServer(
          collection(db, "purchaseOrders"),
          where("status", "==", "Issued")
        );

        // Suppliers
        const supplierSnapshot = await getCountFromServer(
          collection(db, "Suppliers")
        );

        // Outstanding Invoices
        const outstandingInvoiceQuery = query(
          collection(db, "invoices"),
          where("status", "==", "Issued")
        );

        const invoiceSnapshot = await getCountFromServer(
          outstandingInvoiceQuery
        );

        setPurchaseOrders(poSnapshot.data().count);
        setSuppliers(supplierSnapshot.data().count);
        setOutstandingInvoices(invoiceSnapshot.data().count);
      } catch (error) {
        console.error("Failed to load dashboard:", error);
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
          href="/purchase-orders/new"
          className="px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800"
        >
          + New Purchase Order
        </Link>

      </header>


      {/* Content */}
      <div className="p-8">

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

          <DashboardCard
            title="Active Projects"
            value="-"
            description="Currently in progress"
          />

          <DashboardCard
            title="Purchase Orders"
            value={loading ? "—" : purchaseOrders}
            description="Total purchase orders"
          />

          <DashboardCard
            title="Invoices Issued"
            value={loading ? "—" : outstandingInvoices}
            description="Recently issued"
          />

          <DashboardCard
            title="Suppliers"
            value={loading ? "—" : suppliers}
            description="Active suppliers"
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

