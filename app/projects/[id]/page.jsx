
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params?.id;

  const [project, setProject] = useState(null);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState("Overview");
  const [editing, setEditing] = useState(false);

const [editForm, setEditForm] = useState({
  name: "",
  clientId: "",
  clientName: "",
  projectType: "",
  status: "",
  contractValue: "",
  startDate: "",
  expectedCompletion: "",
  siteAddress: "",
  description: "",
  projectManager: "",
  contact: "",
  ca: "",
  caContact: "",
});

  /* =====================================================
     Load Project + Clients + Projects + PO + Invoices
  ===================================================== */

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        /* =========================
           Project
        ========================= */

        const projectRef = doc(
          db,
          "projects",
          id
        );

        const projectSnapshot = await getDoc(
          projectRef
        );

        if (!projectSnapshot.exists()) {
          setProject(null);
          setLoading(false);
          return;
        }

        const projectData = {
          id: projectSnapshot.id,
          ...projectSnapshot.data(),
        };

        setProject(projectData);

        /* =========================
           Quote / Projects
        ========================= */

        try {
          setLoadingProjects(true);

          const projectsSnapshot = await getDocs(
            collection(db, "quote")
          );

          const projectsData =
            projectsSnapshot.docs.map((item) => ({
              id: item.id,
              ...item.data(),
            }));

          setProjects(projectsData);
        } catch (error) {
          console.error(
            "Error loading projects:",
            error
          );

          setProjects([]);
        } finally {
          setLoadingProjects(false);
        }

        /* =========================
           Clients
        ========================= */

        try {
          const clientsSnapshot = await getDocs(
            collection(db, "Clients")
          );

          const clientsData =
            clientsSnapshot.docs.map((item) => ({
              id: item.id,
              ...item.data(),
            }));

          setClients(clientsData);
        } catch (error) {
          console.error(
            "Error loading clients:",
            error
          );
        }

        /* =========================
           Purchase Orders
        ========================= */

        try {
          const poQuery = query(
            collection(db, "purchaseOrders"),
            where("projectId", "==", id)
          );

          const poSnapshot = await getDocs(
            poQuery
          );

          setPurchaseOrders(
            poSnapshot.docs.map((item) => ({
              id: item.id,
              ...item.data(),
            }))
          );
        } catch (error) {
          console.error(
            "Error loading PO:",
            error
          );

          setPurchaseOrders([]);
        }

        /* =========================
           Invoices
        ========================= */

        try {
          const invoiceQuery = query(
            collection(db, "invoices"),
            where("projectId", "==", id)
          );

          const invoiceSnapshot =
            await getDocs(invoiceQuery);

          setInvoices(
            invoiceSnapshot.docs.map((item) => ({
              id: item.id,
              ...item.data(),
            }))
          );
        } catch (error) {
          console.error(
            "Error loading invoices:",
            error
          );

          setInvoices([]);
        }
      } catch (error) {
        console.error(
          "Error loading project:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  /* =====================================================
     Start Edit
  ===================================================== */

  const handleEdit = () => {
    setEditForm({
      name: project.name || "",
      clientId: project.clientId || "",
      clientName: project.clientName || "",
      projectType: project.projectType || "",
      status: project.status || "Active",
      contractValue: project.contractValue ?? "",
      startDate: project.startDate || "",
      expectedCompletion:
        project.expectedCompletion || "",
      siteAddress: project.siteAddress || "",
      description: project.description || "",

      projectManager:
        project.projectManager || "",
      contact:
        project.contact || "",
      ca:
        project.ca || "",
      caContact:
        project.caContact || "",
    });

    setEditing(true);
  };

  /* =====================================================
     Edit Change
  ===================================================== */

  const handleEditChange = (e) => {
    const { name, value } = e.target;

    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* =====================================================
   Selected Client Contacts
===================================================== */

const selectedClient = clients.find(
  (item) => item.id === editForm.clientId
);

const clientContacts = Array.isArray(selectedClient?.contacts)
  ? selectedClient.contacts
  : [];

const selectedPM = clientContacts.find(
  (person) =>
    person.contactName === editForm.projectManager
);

const selectedCA = clientContacts.find(
  (person) =>
    person.contactName === editForm.ca
);

/* =====================================================
   Contact Options
===================================================== */

const getContactOptions = (person) => {
  if (!person) return [];

  const options = [];

  if (person.phone) {
    options.push({
      value: person.phone,
      label: `${person.contactName} - ${person.phone}`,
    });
  }

  if (person.email) {
    options.push({
      value: person.email,
      label: `${person.contactName} - ${person.email}`,
    });
  }

  return options;
};
/* =====================================================
   Client Change
===================================================== */

const handleClientChange = (e) => {
  const clientId = e.target.value;

  const client = clients.find(
    (item) => item.id === clientId
  );

  const clientName =
    client?.name ||
    client?.companyName ||
    client?.clientName ||
    "";

  setEditForm((prev) => ({
    ...prev,
    clientId,
    clientName,

    // Clear previous client contacts
    projectManager: "",
    contact: "",
    ca: "",
    caContact: "",
  }));
};

/* =====================================================
   Contact Person Change
===================================================== */

const handlePMChange = (e) => {
  const personName = e.target.value;

  const person = clientContacts.find(
    (item) => item.contactName === personName
  );

  const defaultContact =
    person?.phone || person?.email || "";

  setEditForm((prev) => ({
    ...prev,
    projectManager: personName,
    contact: defaultContact,
  }));
};

const handlePMContactChange = (e) => {
  setEditForm((prev) => ({
    ...prev,
    contact: e.target.value,
  }));
};

const handleCAChange = (e) => {
  const personName = e.target.value;

  const person = clientContacts.find(
    (item) => item.contactName === personName
  );

  const defaultContact =
    person?.phone || person?.email || "";

  setEditForm((prev) => ({
    ...prev,
    ca: personName,
    caContact: defaultContact,
  }));
};

const handleCAContactChange = (e) => {
  setEditForm((prev) => ({
    ...prev,
    caContact: e.target.value,
  }));
};

  /* =====================================================
     Save Project
  ===================================================== */

  const handleSave = async () => {
    if (!editForm.name.trim()) {
      alert("Project name is required.");
      return;
    }

    try {
      setSaving(true);

      const projectRef = doc(
        db,
        "projects",
        id
      );

      const updatedData = {
        name: editForm.name.trim(),

        clientId:
          editForm.clientId || "",

        clientName:
          editForm.clientName || "",

        projectType:
          editForm.projectType || "",

        status:
          editForm.status || "Draft",

        contractValue:
          editForm.contractValue === ""
            ? 0
            : Number(editForm.contractValue),

        startDate:
          editForm.startDate || "",

        expectedCompletion:
          editForm.expectedCompletion || "",

        siteAddress:
          editForm.siteAddress || "",

        projectManager:
          editForm.projectManager || "",

        contact:
          editForm.contact || "",

        ca:
          editForm.ca || "",

        caContact:
          editForm.caContact || "",

        description:
          editForm.description.trim(),

        updatedAt: new Date(),
      };

      await updateDoc(
        projectRef,
        updatedData
      );

      setProject((prev) => ({
        ...prev,
        ...updatedData,
      }));

      setEditing(false);
    } catch (error) {
      console.error(
        "Error updating project:",
        error
      );

      alert(
        "Failed to update project. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     Currency
  ===================================================== */

  const formatCurrency = (value) => {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return "$0";
    }

    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 2,
    }).format(Number(value));
  };

  /* =====================================================
     Date
  ===================================================== */

  const formatDate = (value) => {
    if (!value) return "-";

    try {
      if (value?.toDate) {
        return value
          .toDate()
          .toLocaleDateString("en-AU");
      }

      return new Date(value).toLocaleDateString(
        "en-AU"
      );
    } catch {
      return "-";
    }
  };

  /* =====================================================
     Status Style
  ===================================================== */

  const getStatusClass = (status) => {
    switch (status) {
      case "Paid":
      case "Completed":
        return "bg-blue-100 text-blue-700";

      case "Issued":
      case "Sent":
      case "Active":
        return "bg-green-100 text-green-700";

      case "On Hold":
        return "bg-yellow-100 text-yellow-700";

      case "Draft":
        return "bg-gray-100 text-gray-600";

      case "Withdraw":
        return "bg-red-100 text-red-700";

      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  /* =====================================================
     PO Total
  ===================================================== */

  const poTotal = useMemo(() => {
    return purchaseOrders.reduce(
      (sum, po) =>
        sum +
        Number(
          po.total ||
            po.totalAmount ||
            po.amount ||
            0
        ),
      0
    );
  }, [purchaseOrders]);

  /* =====================================================
     Invoice Total
  ===================================================== */

  const invoiceTotal = useMemo(() => {
    return invoices.reduce(
      (sum, invoice) =>
        sum +
        Number(
          invoice.total ||
            invoice.totalAmount ||
            invoice.amount ||
            0
        ),
      0
    );
  }, [invoices]);

  /* =====================================================
     Outstanding
  ===================================================== */

  const outstandingTotal = useMemo(() => {
    return invoices.reduce((sum, invoice) => {
      const status =
        invoice.status?.toLowerCase();

      if (
        status === "paid" ||
        status === "completed"
      ) {
        return sum;
      }

      return (
        sum +
        Number(
          invoice.total ||
            invoice.totalAmount ||
            invoice.amount ||
            0
        )
      );
    }, 0);
  }, [invoices]);

  /* =====================================================
     Loading
  ===================================================== */

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 px-6 py-8">
        <div className="mx-auto max-w-7xl py-20 text-center text-sm text-gray-500">
          Loading project...
        </div>
      </div>
    );
  }

  /* =====================================================
     Not Found
  ===================================================== */

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 px-6 py-8">
        <div className="mx-auto max-w-7xl">

          <Link
            href="/projects"
            className="text-sm text-gray-500 hover:text-black"
          >
            ← Back to Projects
          </Link>

          <div className="mt-10 rounded-xl border border-gray-200 bg-white py-20 text-center">
            <p className="text-sm text-gray-500">
              Project not found.
            </p>
          </div>

        </div>
      </div>
    );
  }

  /* =====================================================
     Page
  ===================================================== */

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8">

      <div className="mx-auto max-w-7xl">

        {/* =================================================
            Header
        ================================================= */}

        <div className="mb-6">

          <Link
            href="/projects"
            className="text-sm text-gray-500 hover:text-black"
          >
            ← Projects
          </Link>

          <div className="mt-4 flex items-start justify-between gap-4">

            <div>

              <div className="flex items-center gap-3">

                <h1 className="text-2xl font-semibold text-gray-900">
                  {project.name}
                </h1>

                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                    project.status
                  )}`}
                >
                  {project.status || "Draft"}
                </span>

              </div>

              <p className="mt-1 text-sm text-gray-500">

                {project.clientName ||
                  "No client"}

                {project.siteAddress
                  ? ` · ${project.siteAddress}`
                  : ""}

              </p>

            </div>

            {!editing && (
              <button
                type="button"
                onClick={handleEdit}
                className="btn-primary cursor-pointer rounded-lg bg-[#14243A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#D6A64B] hover:text-[#14243A] hover:shadow-md"
              >
                Edit Project
              </button>
            )}

          </div>
        </div>

        {/* =================================================
            Summary Cards
        ================================================= */}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <SummaryCard
            label="Contract Value"
            value={formatCurrency(
              project.contractValue
            )}
          />

          <SummaryCard
            label="PO Value"
            value={formatCurrency(poTotal)}
          />

          <SummaryCard
            label="Invoiced"
            value={formatCurrency(
              invoiceTotal
            )}
          />

          <SummaryCard
            label="Outstanding"
            value={formatCurrency(
              outstandingTotal
            )}
          />

        </div>

        {/* =================================================
            Tabs
        ================================================= */}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">

          <div className="border-b border-gray-200 px-6">

            <div className="flex gap-7">

              {[
                "Overview",
                "Purchase Orders",
                "Invoices",
              ].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() =>
                    setActiveTab(tab)
                  }
                  className={`border-b-2 py-4 text-sm font-medium transition cursor-pointer ${
                    activeTab === tab
                      ? "border-black text-black"
                      : "border-transparent text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {tab}
                </button>
              ))}

            </div>

          </div>

          <div className="p-6">

            {/* =================================================
                Overview
            ================================================= */}

            {activeTab === "Overview" && (
              <>
                {editing ? (

                  <div className="space-y-6">

                    {/* Project Information */}

                    <section className="rounded-xl border border-gray-200 p-5">

                      <h2 className="text-base font-semibold text-gray-900">
                        Edit Project
                      </h2>

                      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">

                        {/* Project Name */}

                        <div className="md:col-span-2">

                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            Project Name *
                          </label>

                          <select
                            name="name"
                            value={editForm.name}
                            onChange={
                              handleEditChange
                            }
                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-black"
                          >
                            <option value="">
                              {loadingProjects
                                ? "Loading projects..."
                                : "Select Project"}
                            </option>

                            {!loadingProjects &&
                              projects.map(
                                (projectItem) => (
                                  <option
                                    key={
                                      projectItem.id
                                    }
                                    value={
                                      projectItem.projectName ||
                                      projectItem.name ||
                                      projectItem.id
                                    }
                                  >
                                    {projectItem.projectName ||
                                      projectItem.name ||
                                      projectItem.id}
                                  </option>
                                )
                              )}
                          </select>

                        </div>

                        {/* Client */}

                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            Client
                          </label>

                          <select
                            name="clientId"
                            value={
                              editForm.clientId || ""
                            }
                            onChange={
                              handleClientChange
                            }
                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-black"
                          >
                            <option value="">
                              Select Client
                            </option>

                            {clients.map(
                              (client) => (
                                <option
                                  key={client.id}
                                  value={client.id}
                                >
                                  {client.name ||
                                    client.companyName ||
                                    client.clientName ||
                                    client.clientId ||
                                    client.id}
                                </option>
                              )
                            )}
                          </select>
                        </div>

                        {/* Type */}

                        <div>

                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            Project Type
                          </label>

                          <select
                            name="projectType"
                            value={
                              editForm.projectType
                            }
                            onChange={
                              handleEditChange
                            }
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
                            value={
                              editForm.status
                            }
                            onChange={
                              handleEditChange
                            }
                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-black"
                          >


                            <option value="Active">
                              Active
                            </option>

                            <option value="Completed">
                              Completed
                            </option>

                            <option value="Withdraw">
                              Withdraw
                            </option>

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
                              value={
                                editForm.contractValue
                              }
                              onChange={
                                handleEditChange
                              }
                              className="w-full rounded-lg border border-gray-300 px-8 py-2.5 text-sm outline-none focus:border-black"
                            />

                          </div>

                        </div>

                        {/* Site */}

                        <div className="md:col-span-2">

                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            Site Address
                          </label>

                          <textarea
                            name="siteAddress"
                            value={
                              editForm.siteAddress
                            }
                            onChange={
                              handleEditChange
                            }
                            rows={2}
                            className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-black"
                          />

                        </div>

                        {/* Start Date */}

                        <div>

                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            Start Date
                          </label>

                          <input
                            name="startDate"
                            type="date"
                            value={
                              editForm.startDate
                            }
                            onChange={
                              handleEditChange
                            }
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
                            value={
                              editForm.expectedCompletion
                            }
                            onChange={
                              handleEditChange
                            }
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-black"
                          />

                        </div>

                        {/* Project Manager */}

                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            Project Manager 
                          </label>

                          <select
                            value={editForm.projectManager || ""}
                            onChange={handlePMChange}
                            disabled={!editForm.clientId || clientContacts.length === 0}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-black focus:outline-none disabled:bg-gray-100"
                          >
                            <option value="">Select Project Manager </option>

                            {clientContacts.map((person, index) => (
                              <option
                                key={`${person.contactName}-${index}`}
                                value={person.contactName}
                              >
                                {person.contactName}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* PM Contact */}

                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            PM Contact
                          </label>

                          <select
                            value={editForm.contact || ""}
                            onChange={handlePMContactChange}
                            disabled={!selectedPM}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-black focus:outline-none disabled:bg-gray-100"
                          >
                            <option value="">Select Phone / Email</option>

                            {getContactOptions(selectedPM).map((option, index) => (
                              <option
                                key={`${option.value}-${index}`}
                                value={option.value}
                              >
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                          {/* Contract Admin */}

                          <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                              Contract Admin
                            </label>

                            <select
                              value={editForm.ca || ""}
                              onChange={handleCAChange}
                              disabled={!editForm.clientId || clientContacts.length === 0}
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-black focus:outline-none disabled:bg-gray-100"
                            >
                              <option value="">Select Contract Admin</option>

                              {clientContacts.map((person, index) => (
                                <option
                                  key={`${person.contactName}-${index}`}
                                  value={person.contactName}
                                >
                                  {person.contactName}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Contract Admin Contact */}

                          <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                              Contract Admin Contact
                            </label>

                            <select
                              value={editForm.caContact || ""}
                              onChange={handleCAContactChange}
                              disabled={!selectedCA}
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-black focus:outline-none disabled:bg-gray-100"
                            >
                              <option value="">Select Phone / Email</option>

                              {getContactOptions(selectedCA).map((option, index) => (
                                <option
                                  key={`${option.value}-${index}`}
                                  value={option.value}
                                >
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>

                        {/* Description */}

                        <div className="md:col-span-2">

                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            Description
                          </label>

                          <textarea
                            name="description"
                            value={
                              editForm.description
                            }
                            onChange={
                              handleEditChange
                            }
                            rows={5}
                            className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-black"
                          />

                        </div>

                      </div>

                    </section>

                    {/* Buttons */}

                    <div className="flex justify-end gap-3">

                      <button
                        type="button"
                        onClick={() =>
                          setEditing(false)
                        }
                        disabled={saving}
                        className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-primary cursor-pointer rounded-lg bg-[#14243A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#D6A64B] hover:text-[#14243A] hover:shadow-md"
                      >
                        {saving
                          ? "Saving..."
                          : "Save Changes"}
                      </button>

                    </div>

                  </div>

                ) : (

                  /* =================================================
                     Normal Overview
                  ================================================= */

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                    <InfoSection title="Project Information">

                      <InfoRow
                        label="Project Name"
                        value={project.name}
                      />

                      <InfoRow
                        label="Project Type"
                        value={
                          project.projectType
                        }
                      />

                      <InfoRow
                        label="Site Address"
                        value={
                          project.siteAddress ||
                          "-"
                        }
                      />

                      <InfoRow
                        label="Status"
                        value={
                          project.status
                        }
                      />

                      <InfoRow
                        label="Contract Value"
                        value={formatCurrency(
                          project.contractValue
                        )}
                      />

                      <InfoRow
                        label="Start Date"
                        value={formatDate(
                          project.startDate
                        )}
                      />

                      <InfoRow
                        label="Expected Completion"
                        value={formatDate(
                          project.expectedCompletion
                        )}
                      />

                    </InfoSection>

                    <InfoSection title="Client Contact">

                      <InfoRow
                        label="Client"
                        value={
                          project.clientName ||
                          "-"
                        }
                      />

                      <InfoRow
                        label="Project Manager"
                        value={
                          project.projectManager ||
                          "-"
                        }
                      />

                      <InfoRow
                        label="PM Contact"
                        value={
                          project.contact ||
                          "-"
                        }
                      />

                      <InfoRow
                        label="CA"
                        value={
                          project.ca ||
                          "-"
                        }
                      />

                      <InfoRow
                        label="CA Contact"
                        value={
                          project.caContact ||
                          "-"
                        }
                      />

                    </InfoSection>

                    <div className="lg:col-span-2">

                      <InfoSection title="Description/Notes">

                        <p className="whitespace-pre-wrap text-sm leading-6 text-gray-600">
                          {project.description ||
                            "No description provided."}
                        </p>

                      </InfoSection>

                    </div>

                  </div>

                )}
              </>
            )}

            {/* =================================================
                Purchase Orders
            ================================================= */}

            {activeTab === "Purchase Orders" && (
              <div>

                <div className="mb-5 flex items-center justify-between cursor-pointer">

                  <div>

                    <h2 className="text-base font-semibold text-gray-900">
                      Purchase Orders
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      {purchaseOrders.length} purchase order
                      {purchaseOrders.length !== 1
                        ? "s"
                        : ""}
                    </p>

                  </div>

                </div>

                {purchaseOrders.length === 0 ? (

                  <EmptyState text="No purchase orders for this project." />

                ) : (

                  <div className="overflow-x-auto">

                    <table className="w-full text-left text-sm">

                      <thead>

                        <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">

                          <th className="pb-3 pr-4">
                            PO Number
                          </th>

                          <th className="pb-3 pr-4">
                            Supplier
                          </th>

                          <th className="pb-3 pr-4">
                            Date
                          </th>

                          <th className="pb-3 pr-4">
                            Amount
                          </th>

                          <th className="pb-3">
                            Status
                          </th>

                        </tr>

                      </thead>

                      <tbody>

                        {purchaseOrders.map(
                          (po) => (

                            <tr
                              key={po.id}
                              className="border-b border-gray-100 last:border-0"
                            >

                              <td className="py-4 pr-4 font-medium text-gray-900">
                                {po.poNumber ||
                                  po.number ||
                                  po.id ||
                                  "-"}
                              </td>

                              <td className="py-4 pr-4 text-gray-600">
                                {po.supplier?.name ||
                                  "-"}
                              </td>

                              <td className="py-4 pr-4 text-gray-600">
                                {formatDate(
                                  po.poDate ||
                                    po.createdAt
                                )}
                              </td>

                              <td className="py-4 pr-4 font-medium text-gray-900">
                                {formatCurrency(
                                  po.total ||
                                    po.totalAmount ||
                                    po.amount
                                )}
                              </td>

                              <td className="py-4">

                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                                    po.status
                                  )}`}
                                >
                                  {po.status ||
                                    "Draft"}
                                </span>

                              </td>

                            </tr>

                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                )}

              </div>
            )}

            {/* =================================================
                Invoices
            ================================================= */}

            {activeTab === "Invoices" && (
              <div>

                <div className="mb-5 flex items-center justify-between">

                  <div>

                    <h2 className="text-base font-semibold text-gray-900 cursor-pointer">
                      Invoices
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      {invoices.length} invoice
                      {invoices.length !== 1
                        ? "s"
                        : ""}
                    </p>

                  </div>

                </div>

                {invoices.length === 0 ? (

                  <EmptyState text="No invoices for this project." />

                ) : (

                  <div className="overflow-x-auto">

                    <table className="w-full text-left text-sm">

                      <thead>

                        <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">

                          <th className="pb-3 pr-4">
                            Invoice
                          </th>

                          <th className="pb-3 pr-4">
                            Date
                          </th>

                          <th className="pb-3 pr-4">
                            Due Date
                          </th>

                          <th className="pb-3 pr-4">
                            Amount
                          </th>

                          <th className="pb-3">
                            Status
                          </th>

                        </tr>

                      </thead>

                      <tbody>

                        {invoices.map(
                          (invoice) => (

                            <tr
                              key={invoice.id}
                              className="border-b border-gray-100 last:border-0"
                            >

                              <td className="py-4 pr-4 font-medium text-gray-900">
                                {invoice.invoiceNumber ||
                                  invoice.number ||
                                  invoice.id}
                              </td>

                              <td className="py-4 pr-4 text-gray-600">
                                {formatDate(
                                  invoice.invoiceDate ||
                                    invoice.date ||
                                    invoice.createdAt
                                )}
                              </td>

                              <td className="py-4 pr-4 text-gray-600">
                                {formatDate(
                                  invoice.dueDate
                                )}
                              </td>

                              <td className="py-4 pr-4 font-medium text-gray-900">
                                {formatCurrency(
                                  invoice.total ||
                                    invoice.totalAmount ||
                                    invoice.amount
                                )}
                              </td>

                              <td className="py-4">

                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                                    invoice.status
                                  )}`}
                                >
                                  {invoice.status ||
                                    "Draft"}
                                </span>

                              </td>

                            </tr>

                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                )}

              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}


/* =====================================================
   Summary Card
===================================================== */

function SummaryCard({
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">

      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-2 text-xl font-semibold text-gray-900">
        {value}
      </p>

    </div>
  );
}


/* =====================================================
   Info Section
===================================================== */

function InfoSection({
  title,
  children,
}) {
  return (
    <section className="rounded-xl border border-gray-200 p-5">

      <h2 className="mb-5 text-base font-semibold text-gray-900">
        {title}
      </h2>

      <div className="space-y-4">
        {children}
      </div>

    </section>
  );
}


/* =====================================================
   Info Row
===================================================== */

function InfoRow({
  label,
  value,
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-gray-100 pb-3 last:border-0 last:pb-0">

      <span className="text-sm text-gray-500">
        {label}
      </span>

      <span className="text-right text-sm font-medium text-gray-900">
        {value || "-"}
      </span>

    </div>
  );
}


/* =====================================================
   Empty State
===================================================== */

function EmptyState({ text }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center">

      <p className="text-sm text-gray-500">
        {text}
      </p>

    </div>
  );
}

