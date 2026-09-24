"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const q = query(
          collection(db, "projects"),
          orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);

        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setProjects(data);
      } catch (error) {
        console.error("Error loading projects:", error);

        // Fallback if createdAt is missing on some documents
        try {
          const snapshot = await getDocs(collection(db, "projects"));

          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          setProjects(data);
        } catch (fallbackError) {
          console.error("Fallback error:", fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const keyword = search.toLowerCase().trim();

      const matchesSearch =
        !keyword ||
        project.name?.toLowerCase().includes(keyword) ||
        project.clientName?.toLowerCase().includes(keyword) ||
        project.siteAddress?.toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "All" ||
        project.status === statusFilter;

      const matchesType =
        typeFilter === "All" ||
        project.projectType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [projects, search, statusFilter, typeFilter]);

  const projectTypes = [
    ...new Set(
      projects
        .map((project) => project.projectType)
        .filter(Boolean)
    ),
  ];

  const formatCurrency = (value) => {
    if (value === undefined || value === null || value === "") {
      return "-";
    }

    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(Number(value));
  };

  const formatDate = (value) => {
    if (!value) return "-";

    try {
      if (value?.toDate) {
        return value.toDate().toLocaleDateString("en-AU");
      }

      return new Date(value).toLocaleDateString("en-AU");
    } catch {
      return "-";
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-700";

      case "Completed":
        return "bg-blue-100 text-blue-700";

      case "On Hold":
        return "bg-yellow-100 text-yellow-700";

      case "Cancelled":
        return "bg-red-100 text-red-700";

      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Projects
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage your projects and project information
            </p>
          </div>

          <Link
            href="/projects/new"
            className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            + New Project
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-black"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-black"
            >
              <option value="All">All Status</option>
              <option value="Draft">Draft</option>
              <option value="Active">Active</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-black"
            >
              <option value="All">All Project Types</option>

              {projectTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-20 text-center text-sm text-gray-500">
            Loading projects...
          </div>
        )}

        {/* Empty */}
        {!loading && filteredProjects.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white py-20 text-center">
            <p className="text-sm text-gray-500">
              No projects found.
            </p>

            <Link
              href="/projects/new"
              className="mt-4 inline-block text-sm font-medium text-black underline"
            >
              Create your first project
            </Link>
          </div>
        )}

        {/* Cards */}
        {!loading && filteredProjects.length > 0 && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">

            {filteredProjects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group rounded-xl border border-gray-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-gray-400 hover:shadow-sm"
              >
                {/* Top */}
                <div className="flex items-start justify-between gap-4">

                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-gray-900 group-hover:underline">
                      {project.name || "Untitled Project"}
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      {project.clientName || "No client"}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                      project.status
                    )}`}
                  >
                    {project.status || "Draft"}
                  </span>

                </div>

                {/* Address */}
                <div className="mt-5">
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    Site
                  </p>

                  <p className="mt-1 line-clamp-2 text-sm text-gray-700">
                    {project.siteAddress || "-"}
                  </p>
                </div>

                {/* Type */}
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    Project Type
                  </p>

                  <p className="mt-1 text-sm text-gray-700">
                    {project.projectType || "-"}
                  </p>
                </div>

                {/* Bottom */}
                <div className="mt-6 flex items-end justify-between border-t border-gray-100 pt-4">

                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      Contract Value
                    </p>

                    <p className="mt-1 text-base font-semibold text-gray-900">
                      {formatCurrency(project.contractValue)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-gray-400">
                      Created
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {formatDate(project.createdAt)}
                    </p>
                  </div>

                </div>
              </Link>
            ))}

          </div>
        )}

      </div>
    </div>
  );
}