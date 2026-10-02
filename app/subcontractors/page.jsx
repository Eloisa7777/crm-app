
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function SubcontractorsPage() {
  const [subcontractors, setSubcontractors] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =========================
     Load Subcontractors from Firebase
  ========================= */

  useEffect(() => {
    async function loadSubcontractors() {
      try {
        setLoading(true);
        setError("");

        const snapshot = await getDocs(
          collection(db, "Subcontractors")
        );

        const data = snapshot.docs.map((doc) => {
          const subcontractor = doc.data();

          return {
            id: doc.id,
            name: subcontractor.name || "",
            abn: subcontractor.abn || "",
            contact: subcontractor.contact || "",
            email: subcontractor.email || "",
            phone: subcontractor.phone || "-",
            address: subcontractor.address || "-",
            status: subcontractor.status || "Active",
            orders: subcontractor.orders || 0,
            total: subcontractor.total || 0,
          };
        });

        setSubcontractors(data);
      } catch (error) {
        console.error("Failed to load subcontractors:", error);
        setError("Failed to load subcontractors.");
      } finally {
        setLoading(false);
      }
    }

    loadSubcontractors();
  }, []);

  /* =========================
     Search + Status Filter
  ========================= */

  const filteredSubcontractors = useMemo(() => {
    return subcontractors.filter((subcontractor) => {
      const searchText = search.toLowerCase();

      const matchesSearch =
        subcontractor.name.toLowerCase().includes(searchText) ||
        subcontractor.contact.toLowerCase().includes(searchText) ||
        subcontractor.email.toLowerCase().includes(searchText);

      const matchesStatus =
        status === "All" || subcontractor.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [subcontractors, search, status]);

  /* =========================
     Loading
  ========================= */

  if (loading) {
    return (
      <div className="min-h-screen">
        <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Subcontractors
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Loading subcontractors...
            </p>
          </div>
        </header>

        <div className="p-8">
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-sm text-gray-500">
            Loading subcontractors from Firebase...
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
              Subcontractors
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Manage your subcontractors
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
            Subcontractors
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Manage your subcontractors
          </p>
        </div>

        <Link
          href="/subcontractors/new"
          className="rounded-lg bg-indigo-800 px-5 py-2.5 text-sm font-medium text-gray-100 transition hover:bg-amber-400 hover:text-black"
        >
          + New Subcontractor
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
                placeholder="Search subcontractors..."
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


        {/* Supplier Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

          <div className="px-6 py-5 border-b border-gray-200">

            <h2 className="text-base font-semibold text-gray-900">
              Subcontractor List
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              {filteredSubcontractors.length} subcontractor
              {filteredSubcontractors.length !== 1 ? "s" : ""} found
            </p>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead>
                <tr className="border-b border-gray-200 text-left bg-gray-50">

                  <th className="px-6 py-3 font-medium text-gray-500">
                    Subcontractor
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

                {filteredSubcontractors.map((subcontractor) => (

                  <tr
                    key={subcontractor.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                  >

                    <td className="px-6 py-4">

                      <Link
                        href={`/subcontractors/${subcontractor.id}`}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {subcontractor.name}
                      </Link>

                      <div className="text-xs text-gray-500 mt-1">
                        ABN {subcontractor.abn}
                      </div>

                    </td>


                    <td className="px-6 py-4 text-gray-600">
                      {subcontractor.contact}
                    </td>


                    <td className="px-6 py-4 text-gray-600">
                      {subcontractor.phone}
                    </td>


                    <td className="px-6 py-4 text-gray-600">
                      {subcontractor.email}
                    </td>


                    <td className="px-6 py-4">
                      <StatusBadge status={subcontractor.status} />
                    </td>


                    <td className="px-6 py-4 text-right">

                      <Link
                        href={`/subcontractors/${subcontractor.id}`}
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


          {filteredSubcontractors.length === 0 && (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              No subcontractors found.
            </div>
          )}

        </div>

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

