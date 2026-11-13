"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
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
    projectType: "",
    status: "Active",
    contractValue: "",
    startDate: "",
    expectedCompletion: "",
    siteAddress: "",

    projectManager: "",
    contact: "",
    ca: "",
    caContact: "",

    description: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* =====================================================
     Contacts from Selected Client
     Clients.contacts: [{ contactName, email, phone }]
  ===================================================== */

  const selectedClient = clients.find(
    (client) => client.id === form.clientId
  );

  const clientContacts = Array.isArray(selectedClient?.contacts)
    ? selectedClient.contacts
    : [];

  // 联系人和联系方式绑定：选择人员后，只显示该人员自己的电话 / 邮箱
  const selectedPM = clientContacts.find(
    (person) => person.contactName === form.projectManager
  );

  const selectedCA = clientContacts.find(
    (person) => person.contactName === form.ca
  );

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

  // 选择 PM 后，清空旧联系方式，避免带入其他人的电话 / 邮箱
  const handlePMChange = (e) => {
    const value = e.target.value;

    const person = clientContacts.find(
      (item) => item.contactName === value
    );

    setForm((prev) => ({
      ...prev,
      projectManager: value,
      contact: person?.phone || person?.email || "",
    }));
  };

  // 选择 CA 后，清空旧联系方式，避免带入其他人的电话 / 邮箱
  const handleCAChange = (e) => {
    const value = e.target.value;

    const person = clientContacts.find(
      (item) => item.contactName === value
    );

    setForm((prev) => ({
      ...prev,
      ca: value,
      caContact: person?.phone || person?.email || "",
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

      // Clear contacts belonging to the previous client
      projectManager: "",
      contact: "",
      ca: "",
      caContact: "",
    }));
  };


/* =====================================================
   Quote / Project Change
   Automatically fill Project details from Quote
===================================================== */

const handleProjectChange = (e) => {
  const projectId = e.target.value;

  const project = projects.find(
    (item) => item.id === projectId
  );

  setSelectedProjectId(projectId);

  // No quote selected: clear auto-filled fields
  if (!project) {
    setForm((prev) => ({
      ...prev,
      name: "",
      clientId: "",
      clientName: "",
      projectType: "",
      contractValue: "",
      siteAddress: "",
      startDate: "",

      // Clear contacts when the selected quote is cleared
      projectManager: "",
      contact: "",
      ca: "",
      caContact: "",
    }));

    return;
  }

  // Client information from Quote
  const clientId =
    project.clientId ||
    project.client?.id ||
    "";

  const matchedClient = clients.find(
    (item) => item.id === clientId
  );

  const clientName =
    project.client?.name ||
    project.clientName ||
    matchedClient?.name ||
    matchedClient?.companyName ||
    matchedClient?.clientName ||
    "";

  // Estimated Total Value
  const rawContractValue = project.esttotalvalue;

  const contractValue =
    rawContractValue === undefined ||
    rawContractValue === null ||
    rawContractValue === ""
      ? ""
      : String(rawContractValue).replace(/[$,\s]/g, "");

  setForm((prev) => ({
    ...prev,

    // Project Name
    name: project.projectName || "",

    // Client
    clientId,
    clientName,

    // Clear contacts from the previously selected client
    projectManager: "",
    contact: "",
    ca: "",
    caContact: "",

    // Project Type
    projectType:
      project.projectType || "",

    // Contract Value = Est. Total Value
    contractValue,

    // Site Address
    siteAddress:
      project.siteAddress ||
      project.address ||
      "",

      // Start Date = EST. Start Date
      startDate: project.estStartDate
        ? (
            typeof project.estStartDate.toDate === "function"
              ? project.estStartDate.toDate().toISOString().slice(0, 10)
              : String(project.estStartDate).slice(0, 10)
          )
        : "",
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

        ca:
          form.ca.trim(),

        caContact:
          form.caContact.trim(),

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

                     <option value="">Select Project Type</option>

                    <option value="Commercial">
                      Commercial
                    </option>

                    <option value="Residential">
                      Residential
                    </option>

                    <option value="Renovation">
                      Renovation
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
                    <option value="Active">Active</option>
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

                {/* Project Manager*/}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Project Manager
                  </label>

                  <select
                    name="ProjectManager"
                    value={form.projectManager}
                    onChange={handlePMChange}
                    disabled={!form.clientId || clientContacts.length === 0}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-black disabled:bg-gray-100"
                  >
                    <option value="">
                      {!form.clientId
                        ? "Select Client First"
                        : clientContacts.length === 0
                          ? "No Contacts Available"
                          : "Select Contact"}
                    </option>

                    {clientContacts.map((person, index) => (
                      <option
                        key={`pm-${index}`}
                        value={person.contactName || ""}
                      >
                        {person.contactName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* PM Contact */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    PM Contact
                  </label>

                  <select
                    name="contact"
                    value={form.contact}
                    onChange={handleChange}
                    disabled={!selectedPM || (!selectedPM.phone && !selectedPM.email)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-black disabled:bg-gray-100"
                  >
                    <option value="">
                      {form.projectManager ? "No phone / email available" : "Select PM first"}
                    </option>

                    {selectedPM?.phone && (
                      <option value={selectedPM.phone}>
                        {selectedPM.phone}
                      </option>
                    )}

                    {selectedPM?.email && (
                      <option value={selectedPM.email}>
                        {selectedPM.email}
                      </option>
                    )}
                  </select>
                </div>

                {/* CA */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    CA
                  </label>

                  <select
                    name="Contract Administrator"
                    value={form.ca}
                    onChange={handleCAChange}
                    disabled={!form.clientId || clientContacts.length === 0}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-black disabled:bg-gray-100"
                  >
                    <option value="">
                      {!form.clientId
                        ? "Select Client First"
                        : clientContacts.length === 0
                          ? "No Contacts Available"
                          : "Select Contact"}
                    </option>

                    {clientContacts.map((person, index) => (
                      <option
                        key={`ca-${index}`}
                        value={person.contactName || ""}
                      >
                        {person.contactName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* CA Contact */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    CA Contact
                  </label>

                  <select
                    name="CA Contact"
                    value={form.caContact}
                    onChange={handleChange}
                    disabled={!selectedCA || (!selectedCA.phone && !selectedCA.email)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-black disabled:bg-gray-100"
                  >
                    <option value="">
                      {form.ca ? "No phone / email available" : "Select CA first"}
                    </option>

                    {selectedCA?.phone && (
                      <option value={selectedCA.phone}>
                        {selectedCA.phone}
                      </option>
                    )}

                    {selectedCA?.email && (
                      <option value={selectedCA.email}>
                        {selectedCA.email}
                      </option>
                    )}
                  </select>
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
                className="cursor-pointer rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="btn-primary cursor-pointer rounded-lg bg-[#14243A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#D6A64B] hover:text-[#14243A] hover:shadow-md"
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

