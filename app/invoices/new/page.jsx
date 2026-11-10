
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

import {
  PDFDownloadLink,
  PDFViewer,
} from "@react-pdf/renderer";

import { db } from "@/lib/firebase";
import InvoicePDF from "@/components/InvoicePDF";

export default function NewInvoicePage() {
  /* =====================================================
     Clients
  ===================================================== */

  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);

  useEffect(() => {
    async function loadClients() {
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
        console.error("Failed to load clients:", error);
      } finally {
        setLoadingClients(false);
      }
    }

    loadClients();
  }, []);

  /* =====================================================
     Projects
  ===================================================== */

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    async function loadProjects() {
      try {
        const snapshot = await getDocs(
          collection(db, "projects")
        );

        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setProjects(data);
      } catch (error) {
        console.error("Failed to load projects:", error);
      } finally {
        setLoadingProjects(false);
      }
    }

    loadProjects();
  }, []);

  /* =====================================================
     Form
  ===================================================== */

  const [form, setForm] = useState({
    invoiceNumber: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    status: "Draft",

    clientId: "",
    clientName: "",
    clientAddress: "",

    projectId: "",
    projectName: "",

    poNumber: "",
    notes: "",

    accountManager: "Leo",
    accountManagerEmail: "leo.l@yjliningscreation.com.au",
  });

  /* =====================================================
     Selected Contact
  ===================================================== */

  const [selectedContactIndex, setSelectedContactIndex] =
    useState("");

  const selectedClient = clients.find(
    (client) => client.id === form.clientId
  );

  const clientContacts = Array.isArray(selectedClient?.contacts)
    ? selectedClient.contacts
    : [];

  const selectedContact =
    selectedContactIndex !== ""
      ? clientContacts[Number(selectedContactIndex)] || null
      : null;

  /* =====================================================
     Invoice Items
  ===================================================== */

  const [items, setItems] = useState([
    {
      description: "",
      qty: 1,
      unitPrice: "",
      tax: 0,
    },
  ]);

  /* =====================================================
     Select Client
  ===================================================== */

  function handleClientChange(clientId) {
    const client = clients.find(
      (item) => item.id === clientId
    );

    // Clear the previous contact when changing client
    setSelectedContactIndex("");

    setForm((prev) => ({
      ...prev,
      clientId,
      clientName: client?.name || "",
      clientAddress: client?.address || "",
    }));
  }

  /* =====================================================
     Select Contact
  ===================================================== */

  function handleContactChange(index) {
    setSelectedContactIndex(index);
  }

  /* =====================================================
     Select Project
  ===================================================== */

  function handleProjectChange(projectId) {
    const project = projects.find(
      (item) => item.id === projectId
    );

    setForm((prev) => ({
      ...prev,
      projectId,
      projectName:
        project?.projectName ||
        project?.name ||
        "",
    }));
  }

  /* =====================================================
     Handle Form Change
  ===================================================== */

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  /* =====================================================
     Handle Item Change
  ===================================================== */

  function updateItem(index, field, value) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        description: "",
        qty: 1,
        unitPrice: "",
        tax: 0,
      },
    ]);
  }

  function removeItem(index) {
    setItems((prev) =>
      prev.filter((_, i) => i !== index)
    );
  }

  /* =====================================================
     Totals
  ===================================================== */

  const calculatedItems = useMemo(() => {
    return items.map((item) => {
      const qty = Number(item.qty) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const tax = Number(item.tax) || 0;

      const lineSubtotal = qty * unitPrice;

      return {
        ...item,
        qty,
        unitPrice,
        tax,
        total: lineSubtotal * (1 + tax / 100),
      };
    });
  }, [items]);

  // Subtotal includes each item's own tax setting
  const subtotal = useMemo(() => {
    return calculatedItems.reduce(
      (sum, item) => sum + item.total,
      0
    );
  }, [calculatedItems]);

  // Additional GST calculated at 10%
  const gst = subtotal * 0.1;
  const total = subtotal + gst;

  /* =====================================================
     Save
  ===================================================== */

  const [saving, setSaving] = useState(false);
  const [savedInvoice, setSavedInvoice] = useState(null);
  const [error, setError] = useState("");

  async function handleSave() {
    setError("");

    // Validate invoice number
    if (!form.invoiceNumber.trim()) {
      setError("Please enter an invoice number.");
      return;
    }

    // Validate client
    if (!form.clientId || !selectedClient) {
      setError("Please select a client.");
      return;
    }

    // Validate contact
    if (!selectedContact) {
      setError("Please select a contact.");
      return;
    }

    // Validate project
    if (!form.projectId) {
      setError("Please select a project.");
      return;
    }

    // Validate invoice date
    if (!form.invoiceDate) {
      setError("Please select an invoice date.");
      return;
    }

    try {
      setSaving(true);

      const selectedProject = projects.find(
        (project) => project.id === form.projectId
      );

      /* -----------------------------------------------
         Client Snapshot
      ----------------------------------------------- */

        const clientData = {
          id: selectedClient.id,
          name: selectedClient.name || "",
          abn: selectedClient.abn || "",
          address: selectedClient.address || "",
          selectedContact: {
            contactName: selectedContact.contactName || "",
            email: selectedContact.email || "",
            phone: selectedContact.phone || "",
          },
        };

      /* -----------------------------------------------
         Project
      ----------------------------------------------- */

      const projectName =
        selectedProject?.projectName ||
        selectedProject?.name ||
        form.projectName ||
        "";

      /* -----------------------------------------------
        Invoice Data
      ----------------------------------------------- */

      const invoiceData = {
        invoiceNumber: form.invoiceNumber.trim(),

        invoiceDate: form.invoiceDate,
        dueDate: form.dueDate,
        status: form.status || "Draft",

        // Client
        clientId: form.clientId,
        clientName: clientData.name,
        client: clientData,
        clientAddress: clientData.address,

        // Project
        projectId: form.projectId,
        projectName: projectName.trim(),
        poNumber: form.poNumber,

        // Items
        items: calculatedItems,

        // Totals
        subtotal,
        gst,
        total,

        // Notes
        notes: form.notes,

        // YJ Contact
        accountManager: form.accountManager,
        accountManagerEmail: form.accountManagerEmail,

        // Firebase
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      /* -----------------------------------------------
         Save to Firestore
      ----------------------------------------------- */

      const docRef = await addDoc(
        collection(db, "invoices"),
        invoiceData
      );

      /* -----------------------------------------------
         Local PDF Data
      ----------------------------------------------- */

      const finalInvoice = {
        id: docRef.id,
        ...invoiceData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setSavedInvoice(finalInvoice);

    } catch (err) {
      console.error("Failed to create invoice:", err);

      setError(
        "Failed to create invoice. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

    /* =====================================================
      PDF Client Data
    ===================================================== */

    const pdfClient = selectedClient
      ? {
          id: selectedClient.id,
          name: selectedClient.name || "",
          abn: selectedClient.abn || "",
          address: selectedClient.address || "",
          selectedContact: {
            contactName: selectedContact?.contactName || "",
            email: selectedContact?.email || "",
            phone: selectedContact?.phone || "",
          },
        }
      : {
          id: "",
          name: "",
          abn: "",
          address: "",
          selectedContact: {
            contactName: "",
            email: "",
            phone: "",
          },
        };

  /* =====================================================
     PDF Data
  ===================================================== */

  const pdfData = savedInvoice || {
    invoiceNumber: form.invoiceNumber,
    invoiceDate: form.invoiceDate,
    dueDate: form.dueDate,
    status: form.status,

    clientName: form.clientName,
    client: pdfClient,
    clientAddress: form.clientAddress,

    projectName: form.projectName,
    poNumber: form.poNumber,

    items: calculatedItems,

    subtotal,
    gst,
    total,

    notes: form.notes,

    accountManager: form.accountManager,
    accountManagerEmail: form.accountManagerEmail,
  };

  /* =====================================================
     Currency Formatter
  ===================================================== */

  function formatCurrency(value) {
    return Number(value || 0).toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">

        {/* =================================================
            Header
        ================================================= */}

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              New Invoice
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Create a new invoice
            </p>
          </div>

          <Link
            href="/invoices"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to Invoices
          </Link>
        </div>

        {/* =================================================
            Main Content
        ================================================= */}

        <div className="relative space-y-6">

          {/* =================================================
              Invoice Information
          ================================================= */}

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-semibold text-gray-900">
              Invoice Information
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Invoice Number
                </label>

                <input
                  type="text"
                  name="invoiceNumber"
                  value={form.invoiceNumber}
                  onChange={handleChange}
                  placeholder="INV-0001"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Status
                </label>

                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                >
                  <option value="Draft">Draft</option>
                  <option value="Issued">Issued</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Invoice Date
                </label>

                <input
                  type="date"
                  name="invoiceDate"
                  value={form.invoiceDate}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Due Date
                </label>

                <input
                  type="date"
                  name="dueDate"
                  value={form.dueDate}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                />
              </div>

            </div>
          </div>

          {/* =================================================
              Client & Contact
          ================================================= */}

          <div className="relative z-50 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

            <h2 className="mb-5 text-lg font-semibold text-gray-900">
              Client (Account contact)
            </h2>

            {/* Client Dropdown */}

            {loadingClients ? (
              <p className="text-sm text-gray-500">
                Loading clients...
              </p>
            ) : clients.length === 0 ? (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                No clients found. Please add a client first.
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Select Client
                </label>

                <select
                  value={form.clientId}
                  onChange={(e) =>
                    handleClientChange(e.target.value)
                  }
                  className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-black focus:ring-1 focus:ring-black"
                >
                  <option value="">
                    Select a client
                  </option>

                  {clients.map((client) => (
                    <option
                      key={client.id}
                      value={client.id}
                    >
                      {client.name || "Unnamed Client"}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Selected Client Details */}

            {selectedClient && (
              <div className="mt-4 rounded-lg bg-gray-50 p-4">

                <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">

                  <div>
                    <span className="font-medium text-gray-700">
                      Name:
                    </span>{" "}
                    {selectedClient.name || "-"}
                  </div>

                  <div>
                    <span className="font-medium text-gray-700">
                      ABN:
                    </span>{" "}
                    {selectedClient.abn || "-"}
                  </div>

                  <div>
                    <span className="font-medium text-gray-700">
                      Address:
                    </span>{" "}
                    {selectedClient.address || "-"}
                  </div>

                </div>
              </div>
            )}

            {/* =================================================
                Contact Information
            ================================================= */}

            {form.clientId && (
              <div className="mt-5 border-t border-gray-200 pt-5">

                <h3 className="mb-4 text-sm font-semibold text-gray-900">
                  Account Contact Info
                </h3>

                {clientContacts.length === 0 ? (

                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                    No contacts found for this client.
                    Please add a contact in Client settings first.
                  </div>

                ) : (

                  <div className="space-y-4">

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Select Contact
                      </label>

                      <select
                        value={selectedContactIndex}
                        onChange={(e) =>
                          handleContactChange(e.target.value)
                        }
                        className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-black focus:ring-1 focus:ring-black"
                      >
                        <option value="">
                          Select a contact
                        </option>

                        {clientContacts.map((contact, index) => (
                          <option
                            key={index}
                            value={index}
                          >
                            {contact.contactName || "Unnamed Contact"}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Selected Contact Details */}

                    {selectedContact && (
                      <div className="grid grid-cols-1 gap-3 rounded-lg bg-gray-50 p-4 text-sm md:grid-cols-3">

                        <div>
                          <span className="font-medium text-gray-700">
                            Contact Name:
                          </span>

                          <div className="mt-1 text-gray-900">
                            {selectedContact.contactName || "-"}
                          </div>
                        </div>

                        <div>
                          <span className="font-medium text-gray-700">
                            Email:
                          </span>

                          <div className="mt-1 text-gray-900">
                            {selectedContact.email || "-"}
                          </div>
                        </div>

                        <div>
                          <span className="font-medium text-gray-700">
                            Phone:
                          </span>

                          <div className="mt-1 text-gray-900">
                            {selectedContact.phone || "-"}
                          </div>
                        </div>

                      </div>
                    )}

                  </div>
                )}
              </div>
            )}

          </div>

          {/* =================================================
              Project Information
          ================================================= */}

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

            <h2 className="mb-5 text-lg font-semibold text-gray-900">
              Project Information
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Project Name (Reference)
                </label>

                {loadingProjects ? (
                  <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                    Loading projects...
                  </p>
                ) : projects.length === 0 ? (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
                    No projects found.
                  </div>
                ) : (
                  <select
                    value={form.projectId}
                    onChange={(e) =>
                      handleProjectChange(e.target.value)
                    }
                    className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-black focus:ring-1 focus:ring-black"
                  >
                    <option value="">
                      Select project
                    </option>

                    {projects.map((project) => {
                      const projectName =
                        project.projectName ||
                        project.name ||
                        "";

                      return (
                        <option
                          key={project.id}
                          value={project.id}
                        >
                          {projectName || "Unnamed Project"}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  PO Number
                </label>

                <input
                  type="text"
                  name="poNumber"
                  value={form.poNumber}
                  onChange={handleChange}
                  placeholder="Purchase order number"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                />
              </div>

            </div>
          </div>

          {/* =================================================
              Invoice Items
          ================================================= */}

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Invoice Items
              </h2>

              <button
                type="button"
                onClick={addItem}
                className="cursor-pointer rounded-lg bg-indigo-800 px-5 py-2.5 text-sm font-medium text-gray-100 transition hover:bg-amber-400 hover:text-black"
              >
                + Add Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">

                <thead>
                  <tr className="border-b border-gray-200 text-left">

                    <th className="pb-3 pr-3 font-medium text-gray-600">
                      Description
                    </th>

                    <th className="w-24 pb-3 pr-3 font-medium text-gray-600">
                      Qty
                    </th>

                    <th className="w-36 pb-3 pr-3 font-medium text-gray-600">
                      Unit Price
                    </th>

                    <th className="w-24 pb-3 pr-3 font-medium text-gray-600">
                      Tax %
                    </th>

                    <th className="w-36 pb-3 pr-3 font-medium text-gray-600">
                      Total
                    </th>

                    <th className="w-20 pb-3 font-medium text-gray-600">
                    </th>

                  </tr>
                </thead>

                <tbody>
                  {calculatedItems.map((item, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-100"
                    >

                      <td className="py-3 pr-3">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "description",
                              e.target.value
                            )
                          }
                          placeholder="Description"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-black"
                        />
                      </td>

                      <td className="py-3 pr-3">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.qty}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "qty",
                              e.target.value
                            )
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-black"
                        />
                      </td>

                      <td className="py-3 pr-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "unitPrice",
                              e.target.value
                            )
                          }
                          placeholder=" "
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-black"
                        />
                      </td>

                      <td className="py-3 pr-3">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={item.tax || 0}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "tax",
                              e.target.value
                            )
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-black"
                        />
                      </td>

                      <td className="py-3 pr-3 font-medium">
                        ${formatCurrency(item.total)}
                      </td>

                      <td className="py-3">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        )}
                      </td>

                    </tr>
                  ))}
                </tbody>

              </table>
            </div>

            {/* Totals */}

            <div className="mt-6 flex justify-end">
              <div className="w-full max-w-sm space-y-3">

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Subtotal
                  </span>

                  <span className="font-medium">
                    ${formatCurrency(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    GST (10%)
                  </span>

                  <span className="font-medium">
                    ${formatCurrency(gst)}
                  </span>
                </div>

                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>

                    <span>
                      ${formatCurrency(total)}
                    </span>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* =================================================
              Notes
          ================================================= */}

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

            <h2 className="mb-5 text-lg font-semibold text-gray-900">
              Notes
            </h2>

            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={5}
              placeholder="Payment instructions, additional notes, etc."
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
            />

          </div>

          {/* =================================================
              YJ Contact
          ================================================= */}

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

            <h2 className="mb-5 text-lg font-semibold text-gray-900">
              YJ Contact
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Contact Name
                </label>

                <input
                  type="text"
                  name="accountManager"
                  value={form.accountManager}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Contact Email
                </label>

                <input
                  type="email"
                  name="accountManagerEmail"
                  value={form.accountManagerEmail}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                />
              </div>

            </div>
          </div>

          {/* =================================================
              Error
          ================================================= */}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* =================================================
              Actions
          ================================================= */}

          <div className="flex items-center justify-end gap-3">

            <Link
              href="/invoices"
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>

            <button
              type="button"
              onClick={handleSave}
              disabled={
                saving ||
                loadingProjects ||
                loadingClients
              }
              className="cursor-pointer rounded-lg bg-indigo-800 px-5 py-2.5 text-sm font-medium text-gray-100 transition hover:bg-amber-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Create Invoice"}
            </button>

          </div>

          {/* =================================================
              PDF
          ================================================= */}

          {savedInvoice && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

              <div className="mb-5 flex items-center justify-between">

                <h2 className="text-lg font-semibold text-gray-900">
                  Invoice PDF
                </h2>

                <PDFDownloadLink
                  document={
                    <InvoicePDF invoice={pdfData} />
                  }
                  fileName={`${
                    form.invoiceNumber || "invoice"
                  }.pdf`}
                  className="cursor-pointer rounded-lg bg-indigo-800 px-5 py-2.5 text-sm font-medium text-gray-100 transition hover:bg-amber-400 hover:text-black"
                >
                  {({ loading }) =>
                    loading
                      ? "Preparing PDF..."
                      : "Download PDF"
                  }
                </PDFDownloadLink>

              </div>

              <div className="overflow-hidden rounded-lg border border-gray-200">
                <PDFViewer
                  width="100%"
                  height="800"
                  showToolbar={true}
                >
                  <InvoicePDF invoice={pdfData} />
                </PDFViewer>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}

