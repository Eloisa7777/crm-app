"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =========================
     Load Suppliers from Firebase
  ========================= */

  useEffect(() => {
    async function loadSuppliers() {
      try {
        setLoading(true);
        setError("");

        const snapshot = await getDocs(
          collection(db, "Suppliers")
        );

        const data = snapshot.docs.map((doc) => {
          const supplier = doc.data();

          return {
            id: doc.id,
            name: supplier.name || "",
            abn: supplier.abn || "",
            contact: supplier.contact || "",
            email: supplier.email || "",
            phone: supplier.phone || "-",
            address: supplier.address || "-",
            status: supplier.status || "Active",
            // Temporary for MVP
            orders: supplier.orders || 0,
            total: supplier.total || 0,
          };
        });

        setSuppliers(data);
      } catch (error) {
        console.error("Failed to load suppliers:", error);
        setError("Failed to load suppliers.");
      } finally {
        setLoading(false);
      }
    }

    loadSuppliers();
  }, []);

  /* =========================
     Search + Status Filter
  ========================= */

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      const searchText = search.toLowerCase();

      const matchesSearch =
        supplier.name.toLowerCase().includes(searchText) ||
        supplier.contact.toLowerCase().includes(searchText) ||
        supplier.email.toLowerCase().includes(searchText);

      const matchesStatus =
        status === "All" || supplier.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [suppliers, search, status]);

  /* =========================
     Loading
  ========================= */

  if (loading) {
    return (
      <div className="min-h-screen">
        <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Suppliers
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Loading suppliers...
            </p>
          </div>
        </header>

        <div className="p-8">
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-sm text-gray-500">
            Loading suppliers from Firebase...
          </div>
        </div>
      </div>
    );
  }

  /* =========================
     Error
  ========================= */

  if (error) {
    return (
      <div className="min-h-screen">
        <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Suppliers
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Manage your suppliers and subcontractors
            </p>
          </div>
        </header>

        <div className="p-8">
          <div className="bg-white border border-red-200 rounded-xl p-10 text-center">
            <p className="text-sm text-red-600">
              {error}
            </p>

            <p className="text-xs text-gray-500 mt-2">
              Please check your Firebase configuration and Firestore permissions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">

      {/* Header */}
      <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between">

        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Suppliers
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Manage your suppliers and subcontractors
          </p>
        </div>

        <Link
          href="/suppliers/new"
          className="rounded-lg bg-indigo-800 px-5 py-2.5 text-sm font-medium text-gray-100 transition hover:bg-amber-400 hover:text-black"
        >
          + New Supplier
        </Link>

      </header>


      {/* Content */}
      <div className="p-8">

        {/* Search / Filter */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">

          <div className="flex flex-col md:flex-row gap-3">

            <div className="flex-1">

              <input
                type="text"
                placeholder="Search suppliers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input"
              />

            </div>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input md:w-40"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

          </div>

        </div>


        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">

          <SummaryCard
            title="Total Suppliers"
            value={suppliers.length}
          />

          <SummaryCard
            title="Active Suppliers"
            value={suppliers.filter(
              (supplier) => supplier.status === "Active"
            ).length}
          />

          <SummaryCard
            title="Total PO Value"
            value={formatCurrency(
              suppliers.reduce(
                (sum, supplier) => sum + supplier.total,
                0
              )
            )}
          />

        </div>


        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

          <div className="px-6 py-5 border-b border-gray-200">

            <h2 className="text-base font-semibold text-gray-900">
              Supplier List
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              {filteredSuppliers.length} supplier
              {filteredSuppliers.length !== 1 ? "s" : ""} found
            </p>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead>
                <tr className="border-b border-gray-200 text-left bg-gray-50">

                  <th className="px-6 py-3 font-medium text-gray-500">
                    Supplier
                  </th>

                  <th className="px-6 py-3 font-medium text-gray-500">
                    Contact
                  </th>

                  <th className="px-6 py-3 font-medium text-gray-500">
                    Phone
                  </th>

                  <th className="px-6 py-3 font-medium text-gray-500">
                    Email
                  </th>

                  <th className="px-6 py-3 font-medium text-gray-500">
                    Status
                  </th>

                  <th className="px-6 py-3 font-medium text-gray-500 text-right">
                    Actions
                  </th>

                </tr>
              </thead>


              <tbody>

                {filteredSuppliers.map((supplier) => (

                  <tr
                    key={supplier.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                  >

                    <td className="px-6 py-4">

                      <Link
                        href={`/suppliers/${supplier.id}`}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {supplier.name}
                      </Link>

                      <div className="text-xs text-gray-500 mt-1">
                        ABN {supplier.abn}
                      </div>

                    </td>


                    <td className="px-6 py-4 text-gray-600">
                      {supplier.contact}
                    </td>


                    <td className="px-6 py-4 text-gray-600">
                      {supplier.phone}
                    </td>


                    <td className="px-6 py-4 text-gray-600">
                      {supplier.email}
                    </td>


                    <td className="px-6 py-4">
                      <StatusBadge status={supplier.status} />
                    </td>


                    <td className="px-6 py-4 text-right">

                      <Link
                        href={`/suppliers/${supplier.id}`}
                        className="text-sm font-medium text-gray-700 hover:text-gray-900"
                      >
                        View
                      </Link>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>


          {filteredSuppliers.length === 0 && (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              No suppliers found.
            </div>
          )}

        </div>

      </div>
    </div>
  );
}


/* =========================
   Summary Card
========================= */

function SummaryCard({ title, value }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">

      <div className="text-sm text-gray-500">
        {title}
      </div>

      <div className="text-2xl font-semibold text-gray-900 mt-2">
        {value}
      </div>

    </div>
  );
}


/* =========================
   Status Badge
========================= */

function StatusBadge({ status }) {
  const styles = {
    Active: "bg-green-50 text-green-700",
    Inactive: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
        styles[status] || "bg-gray-100 text-gray-600"
      }`}
    >
      {status}
    </span>
  );
}


/* =========================
   Currency
========================= */

function formatCurrency(value) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(value);
}