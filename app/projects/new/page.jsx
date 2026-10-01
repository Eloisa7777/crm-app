"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

export default function NewProjectPage() {
  const router = useRouter();

  /* =====================================================
     Clients
  ===================================================== */

  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);

  /* =====================================================
     Quotes / Projects
  ===================================================== */

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  /* =====================================================
     Form
  ===================================================== */

  const [form, setForm] = useState({
    name: "",
    clientId: "",
    clientName: "",
    projectType: "Commercial",
    status: "Draft",
    contractValue: "",
    startDate: "",
    expectedCompletion: "",
    siteAddress: "",

    projectManager: "",
    contact: "",
    architect: "",
    architectContact: "",

    description: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* =====================================================
     Load Clients
  ===================================================== */

  useEffect(() => {
    const fetchClients = async () => {
      setLoadingClients(true);

      try {
        const snapshot = await getDocs(
          collection(db, "Clients")
        );

        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setClients(data);
      } catch (error) {
        console.error("Error loading clients:", error);
      } finally {
        setLoadingClients(false);
      }
    };

    fetchClients();
  }, []);

  /* =====================================================
     Load Quotes
  ===================================================== */

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoadingProjects(true);
        setError("");

        const snapshot = await getDocs(
          collection(db, "quote")
        );

        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setProjects(data);

        // Do not automatically select the first quote
        setSelectedProjectId("");
      } catch (err) {
        console.error("Error loading quotes:", err);
        setError("Failed to load projects.");
      } finally {
        setLoadingProjects(false);
      }
    };

    loadProjects();
  }, []);

  /* =====================================================
     Form Change
  ===================================================== */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* =====================================================
     Client Change
  ===================================================== */

  const handleClientChange = (e) => {
    const clientId = e.target.value;

    const client = clients.find(
      (item) => item.id === clientId
    );

    setForm((prev) => ({
      ...prev,
      clientId,
      clientName:
        client?.name ||
        client?.companyName ||
        client?.clientName ||
        "",
    }));
  };

  /* =====================================================
     Quote / Project Change
  ===================================================== */

  const handleProjectChange = (e) => {
    const projectId = e.target.value;

    const project = projects.find(
      (item) => item.id === projectId
    );

    setSelectedProjectId(projectId);

    setForm((prev) => ({
      ...prev,

      // Project Name comes from quote
      name:
        project?.projectName ||
        project?.name ||
        "",

      // Automatically fill Site Address
      siteAddress:
        project?.siteAddress ||
        project?.address ||
        "",
    }));
  };

  /* =====================================================
     Submit
  ===================================================== */

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!selectedProjectId) {
      setError("Please select a project.");
      return;
    }

    if (!form.name.trim()) {
      setError("Project name is required.");
      return;
    }

    setSaving(true);

    try {
      const projectData = {
        name: form.name.trim(),

        // Keep relationship with quote
        quoteId: selectedProjectId || "",

        clientId: form.clientId || "",
        clientName: form.clientName || "",

        projectType: form.projectType,
        status: form.status,

        contractValue:
          form.contractValue === ""
            ? 0
            : Number(form.contractValue),

        startDate: form.startDate || "",

        expectedCompletion:
          form.expectedCompletion || "",

        siteAddress:
          form.siteAddress.trim(),

        /* =================================================
           Project Contacts
        ================================================= */

        projectManager:
          form.projectManager.trim(),

        contact:
          form.contact.trim(),

        architect:
          form.architect.trim(),

        architectContact:
          form.architectContact.trim(),

        description:
          form.description.trim(),

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(
        collection(db, "projects"),
        projectData
      );

      router.push(`/projects/${docRef.id}`);
    } catch (error) {
      console.error("Error creating project:", error);

      setError("Failed to create project.");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/projects"
            className="text-sm text-gray-500 hover:text-black"
          >
            ← Back to Projects
          </Link>

          <h1 className="mt-4 text-2xl font-semibold text-gray-900">
            New Project
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Create a new project
          </p>
        </div>

        <form onSubmit={handleSubmit}>

          <div className="space-y-6">

            {/* =================================================
                Project Information
            ================================================= */}

            <section className="rounded-xl border border-gray-200 bg-white p-6">

              <h2 className="text-base font-semibold text-gray-900">
                Project Information
              </h2>

              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">

                {/* Project Name */}
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Project Name *
                  </label>

                  <select
                    value={selectedProjectId}
                    onChange={handleProjectChange}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-black"
                    required
                  >
                    <option value="">
                      {loadingProjects
                        ? "Loading projects..."
                        : "Select Project"}
                    </option>

                    {!loadingProjects &&
                      projects.map((project) => (
                        <option
                          key={project.id}
                          value={project.id}
                        >
                          {project.projectName ||
                            project.name ||
                            project.id}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Client */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Client
                  </label>

                  <select
                    value={form.clientId}
                    onChange={handleClientChange}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-black"
                  >
                    <option value="">
                      {loadingClients
                        ? "Loading clients..."
                        : "Select Client"}
                    </option>

                    {!loadingClients &&
                      clients.map((client) => (
                        <option
                          key={client.id}
                          value={client.id}
                        >
                          {client.name ||
                            client.companyName ||
                            client.clientName ||
                            client.id}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Project Type */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Project Type
                  </label>

                  <select
                    name="projectType"
                    value={form.projectType}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-black"
                  >
                    <option value="Commercial">
                      Commercial
                    </option>

                    <option value="Residential">
                      Residential
                    </option>

                    <option value="Renovation">
                      Renovation
                    </option>

                    <option value="Retail">
                      Retail
                    </option>

                    <option value="Fit-out">
                      Fit-out
                    </option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Status
                  </label>

                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-black"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                    <option value="Withdraw">Withdraw</option>
                  </select>
                </div>

                {/* Contract Value */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Contract Value
                  </label>

                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                      $
                    </span>

                    <input
                      name="contractValue"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.contractValue}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-gray-300 px-8 py-2.5 text-sm outline-none focus:border-black"
                    />
                  </div>
                </div>

                {/* Start Date */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Start Date
                  </label>

                  <input
                    name="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                {/* Completion */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Expected Completion
                  </label>

                  <input
                    name="expectedCompletion"
                    type="date"
                    value={form.expectedCompletion}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                {/* Site Address */}
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Site Address
                  </label>

                  <textarea
                    name="siteAddress"
                    value={form.siteAddress}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Project site address"
                    className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

              </div>
            </section>

            {/* =================================================
                Project Contacts
            ================================================= */}

            <section className="rounded-xl border border-gray-200 bg-white p-6">

              <h2 className="text-base font-semibold text-gray-900">
                Project Contacts
              </h2>

              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">

                {/* Project Manager / CA */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Project Manager / CA
                  </label>

                  <input
                    name="projectManager"
                    type="text"
                    value={form.projectManager}
                    onChange={handleChange}
                    placeholder="Enter project manager / CA"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                {/* PM / CA Contact */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    PM / CA Contact
                  </label>

                  <input
                    name="contact"
                    type="text"
                    value={form.contact}
                    onChange={handleChange}
                    placeholder="Phone or email"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                {/* Architect */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Architect
                  </label>

                  <input
                    name="architect"
                    type="text"
                    value={form.architect}
                    onChange={handleChange}
                    placeholder="Enter architect"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                {/* Architect Contact */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Architect Contact
                  </label>

                  <input
                    name="architectContact"
                    type="text"
                    value={form.architectContact}
                    onChange={handleChange}
                    placeholder="Phone or email"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

              </div>
            </section>

            {/* =================================================
                Description
            ================================================= */}

            <section className="rounded-xl border border-gray-200 bg-white p-6">

              <h2 className="text-base font-semibold text-gray-900">
                Description / Notes
              </h2>

              <div className="mt-6">

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Project description..."
                  className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-black"
                />

              </div>
            </section>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">

              <Link
                href="/projects"
                className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-indigo-800 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-amber-400 hover:text-black cursor-pointer"
              >
                {saving
                  ? "Creating..."
                  : "Create Project"}
              </button>

            </div>

          </div>
        </form>
      </div>
    </div>
  );
}

