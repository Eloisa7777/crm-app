"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =========================
     Load Clients from Firebase
  ========================= */

  useEffect(() => {
    async function loadClients() {
      try {
        setLoading(true);
        setError("");

        const snapshot = await getDocs(
          collection(db, "Clients")
        );

        const data = snapshot.docs.map((doc) => {
          const client = doc.data();

          return {
            id: doc.id,
            name: client.name || "",
            abn: client.abn || "",
            contact: client.contact || "",
            email: client.email || "",
            phone: client.phone || "-",
            address: client.address || "-",
            status: client.status || "Active",
            // Temporary for MVP
            orders: client.orders || 0,
            total: client.total || 0,
          };
        });

        setClients(data);
      } catch (error) {
        console.error("Failed to load clients:", error);
        setError("Failed to load clients.");
      } finally {
        setLoading(false);
      }
    }

    loadClients();
  }, []);

  /* =========================
     Search + Status Filter
  ========================= */

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const searchText = search.toLowerCase();

      const matchesSearch =
        client.name.toLowerCase().includes(searchText) ||
        client.contact.toLowerCase().includes(searchText) ||
        client.email.toLowerCase().includes(searchText);

      const matchesStatus =
        status === "All" || client.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [clients, search, status]);

  /* =========================
     Loading
  ========================= */

  if (loading) {
    return (
      <div className="min-h-screen">
        <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Clients
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Loading clients...
            </p>
          </div>
        </header>

        <div className="p-8">
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-sm text-gray-500">
            Loading clients from Firebase...
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
              Clients
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Manage your clients and subcontractors
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
            Clients
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Manage your clients
          </p>
        </div>

        <Link
          href="/clients/new"
          className="px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
        >
          + New Client
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
                placeholder="Search clients..."
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
            title="Total Clients"
            value={clients.length}
          />

          <SummaryCard
            title="Active Clients"
            value={clients.filter(
              (client) => client.status === "Active"
            ).length}
          />

          <SummaryCard
            title="Total PO Value"
            value={formatCurrency(
              clients.reduce(
                (sum, client) => sum + client.total,
                0
              )
            )}
          />

        </div>


        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

          <div className="px-6 py-5 border-b border-gray-200">

            <h2 className="text-base font-semibold text-gray-900">
              Client List
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              {filteredClients.length} client
              {filteredClients.length !== 1 ? "s" : ""} found
            </p>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead>
                <tr className="border-b border-gray-200 text-left bg-gray-50">

                  <th className="px-6 py-3 font-medium text-gray-500">
                    Client
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

                {filteredClients.map((client) => (

                  <tr
                    key={client.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                  >

                    <td className="px-6 py-4">

                      <Link
                        href={`/clients/${client.id}`}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {client.name}
                      </Link>

                      <div className="text-xs text-gray-500 mt-1">
                        ABN {client.abn}
                      </div>

                    </td>


                    <td className="px-6 py-4 text-gray-600">
                      {client.contact}
                    </td>


                    <td className="px-6 py-4 text-gray-600">
                      {client.phone}
                    </td>


                    <td className="px-6 py-4 text-gray-600">
                      {client.email}
                    </td>


                    <td className="px-6 py-4">
                      <StatusBadge status={client.status} />
                    </td>


                    <td className="px-6 py-4 text-right">

                      <Link
                        href={`/clients/${client.id}`}
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


          {filteredClients.length === 0 && (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              No clients found.
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