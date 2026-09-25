
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
        console.error(
          "Failed to load clients:",
          error
        );
      } finally {
        setLoadingClients(false);
      }
    }

    loadClients();
  }, []);

  /* =====================================================
     Form
  ===================================================== */

  const [form, setForm] = useState({
    invoiceNumber: "",
    invoiceDate: new Date()
      .toISOString()
      .split("T")[0],
    dueDate: "",
    status: "Draft",

    clientId: "",
    clientName: "",
    clientAddress: "",

    projectName: "",
    poNumber: "",

    notes: "",

    accountManager: "Leo",
    accountManagerEmail:
      "leo.l@yjliningscreation.com.au",
  });

  /* =====================================================
     Invoice Items
  ===================================================== */

  const [items, setItems] = useState([
    {
      description: "",
      qty: 1,
      unitPrice: "",
      Tax: 0,
    },
  ]);

  /* =====================================================
     Select Client
  ===================================================== */

  function handleClientChange(clientId) {
    const client = clients.find(
      (item) => item.id === clientId
    );

    setForm((prev) => ({
      ...prev,

      clientId,

      clientName:
        client?.name || "",

      clientAddress:
        client?.address || "",
    }));
  }

  /* =====================================================
     Handle Form Change
  ===================================================== */

  function handleChange(e) {
    const {
      name,
      value,
    } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  /* =====================================================
     Handle Item Change
  ===================================================== */

  function updateItem(
    index,
    field,
    value
  ) {
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
        Tax: 0,
      },
    ]);
  }

  function removeItem(index) {
    setItems((prev) =>
      prev.filter(
        (_, i) => i !== index
      )
    );
  }

  /* =====================================================
     Totals
  ===================================================== */

  const calculatedItems = useMemo(() => {
    return items.map((item) => {
      const qty =
        Number(item.qty) || 0;

      const unitPrice =
        Number(item.unitPrice) || 0;

      const tax =
        Number(item.tax) || 0;

      return {
        ...item,
        qty,
        unitPrice,
        tax,
        total: qty * unitPrice * (1 + tax / 100),
      };
    });
  }, [items]);

  const subtotal = useMemo(() => {
    return calculatedItems.reduce(
      (sum, item) =>
        sum + item.total,
      0
    );
  }, [calculatedItems]);

  const gst = subtotal * 0.1;

  const total = subtotal + gst;

  /* =====================================================
     Save
  ===================================================== */

  const [saving, setSaving] =
    useState(false);

  const [savedInvoice, setSavedInvoice] =
    useState(null);

  const [error, setError] =
    useState("");

  async function handleSave() {
    setError("");

    if (!form.invoiceNumber.trim()) {
      setError(
        "Please enter an invoice number."
      );
      return;
    }

    if (!form.clientId) {
      setError(
        "Please select a client."
      );
      return;
    }

    if (!form.invoiceDate) {
      setError(
        "Please select an invoice date."
      );
      return;
    }

    try {
      setSaving(true);

      const selectedClient =
        clients.find(
          (client) =>
            client.id ===
            form.clientId
        );

      const clientData =
        selectedClient
          ? {
              id: selectedClient.id,

              name:
                selectedClient.name ||
                "",

              abn:
                selectedClient.abn ||
                "",

              contact:
                selectedClient.contact ||
                "",

              email:
                selectedClient.email ||
                "",

              phone:
                selectedClient.phone ||
                "",

              address:
                selectedClient.address ||
                "",
            }
          : {
              id: form.clientId,

              name:
                form.clientName ||
                "",

              abn: "",
              contact: "",
              email: "",
              phone: "",

              address:
                form.clientAddress ||
                "",
            };

      const invoiceData = {
        invoiceNumber:
          form.invoiceNumber.trim(),

        invoiceDate:
          form.invoiceDate,

        dueDate:
          form.dueDate,

        status:
          form.status || "Draft",

        /* Client */

        clientId:
          form.clientId,

        clientName:
          clientData.name,

        client:
          clientData,

        /* Project */

        projectName:
          form.projectName,

        clientAddress:
          form.clientAddress,

        poNumber:
          form.poNumber,

        /* Items */

        items:
          calculatedItems,

        /* Totals */

        subtotal,
        gst,
        total,

        /* Notes */

        notes:
          form.notes,

        /* YJ Contact */

        accountManager:
          form.accountManager,

        accountManagerEmail:
          form.accountManagerEmail,

        /* Firebase */

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp(),
      };

      const docRef =
        await addDoc(
          collection(
            db,
            "invoices"
          ),
          invoiceData
        );

      const finalInvoice = {
        id: docRef.id,

        ...invoiceData,

        createdAt:
          new Date(),

        updatedAt:
          new Date(),
      };

      setSavedInvoice(
        finalInvoice
      );
    } catch (err) {
      console.error(
        "Failed to create invoice:",
        err
      );

      setError(
        "Failed to create invoice. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     PDF Data
  ===================================================== */

  const selectedClient =
    clients.find(
      (client) =>
        client.id ===
        form.clientId
    );

  const pdfClient =
    selectedClient
      ? {
          id:
            selectedClient.id,

          name:
            selectedClient.name ||
            "",

          abn:
            selectedClient.abn ||
            "",

          contact:
            selectedClient.contact ||
            "",

          email:
            selectedClient.email ||
            "",

          phone:
            selectedClient.phone ||
            "",

          address:
            selectedClient.address ||
            "",
        }
      : {
          id:
            form.clientId,

          name:
            form.clientName ||
            "",

          abn: "",
          contact: "",
          email: "",
          phone: "",

          address:
            form.clientAddress ||
            "",
        };

  const pdfData =
    savedInvoice || {
      invoiceNumber:
        form.invoiceNumber,

      invoiceDate:
        form.invoiceDate,

      dueDate:
        form.dueDate,

      status:
        form.status,

      clientName:
        form.clientName,

      client:
        pdfClient,

      projectName:
        form.projectName,

      poNumber:
        form.poNumber,

      items:
        calculatedItems,

      subtotal,
      gst,
      total,

      notes:
        form.notes,

      accountManager:
        form.accountManager,

      accountManagerEmail:
        form.accountManagerEmail,
    };

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

              {/* Invoice Number */}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Invoice Number
                </label>

                <input
                  type="text"
                  name="invoiceNumber"
                  value={
                    form.invoiceNumber
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="INV-0001"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                />
              </div>

              {/* Status */}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Status
                </label>

                <select
                  name="status"
                  value={
                    form.status
                  }
                  onChange={
                    handleChange
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                >
                  <option value="Draft">
                    Draft
                  </option>

                  <option value="Issued">
                    Issued
                  </option>

                  <option value="Paid">
                    Paid
                  </option>

                  <option value="Overdue">
                    Overdue
                  </option>

                  <option value="Cancelled">
                    Cancelled
                  </option>
                </select>
              </div>

              {/* Invoice Date */}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Invoice Date
                </label>

                <input
                  type="date"
                  name="invoiceDate"
                  value={
                    form.invoiceDate
                  }
                  onChange={
                    handleChange
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                />
              </div>

              {/* Due Date */}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Due Date
                </label>

                <input
                  type="date"
                  name="dueDate"
                  value={
                    form.dueDate
                  }
                  onChange={
                    handleChange
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                />
              </div>

            </div>
          </div>

          {/* =================================================
              Client
          ================================================= */}

          <div className="relative z-50 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

            <h2 className="mb-5 text-lg font-semibold text-gray-900">
              Client
            </h2>

            {loadingClients ? (
              <p className="text-sm text-gray-500">
                Loading clients...
              </p>
            ) : clients.length === 0 ? (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                No clients found. Please add a client first.
              </div>
            ) : (
              <div className="relative z-50">

                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Select Client
                </label>

                <select
                  value={
                    form.clientId
                  }
                  onChange={(e) =>
                    handleClientChange(
                      e.target.value
                    )
                  }
                  className="relative z-50 w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-black focus:ring-1 focus:ring-black"
                >
                  <option value="">
                    Select a client
                  </option>

                  {clients.map(
                    (client) => (
                      <option
                        key={
                          client.id
                        }
                        value={
                          client.id
                        }
                      >
                        {client.name ||
                          "Unnamed Client"}
                      </option>
                    )
                  )}
                </select>
              </div>
            )}

            {/* Selected Client Details */}

            {form.clientId && (
              <div className="relative z-10 mt-4 rounded-lg bg-gray-50 p-4">

                {(() => {
                  const client =
                    clients.find(
                      (item) =>
                        item.id ===
                        form.clientId
                    );

                  if (!client) {
                    return null;
                  }

                  return (
                    <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">

                      <div>
                        <span className="font-medium text-gray-700">
                          Name:
                        </span>{" "}
                        {client.name ||
                          "-"}
                      </div>

                      <div>
                        <span className="font-medium text-gray-700">
                          ABN:
                        </span>{" "}
                        {client.abn ||
                          "-"}
                      </div>

                      <div>
                        <span className="font-medium text-gray-700">
                          Contact:
                        </span>{" "}
                        {client.contact ||
                          "-"}
                      </div>

                      <div>
                        <span className="font-medium text-gray-700">
                          Email:
                        </span>{" "}
                        {client.email ||
                          "-"}
                      </div>

                      <div>
                        <span className="font-medium text-gray-700">
                          Phone:
                        </span>{" "}
                        {client.phone ||
                          "-"}
                      </div>

                      <div>
                        <span className="font-medium text-gray-700">
                          Address:
                        </span>{" "}
                        {client.address ||
                          "-"}
                      </div>

                    </div>
                  );
                })()}

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

                <input
                  type="text"
                  name="projectName"
                  value={
                    form.projectName
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Project name (reference)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  PO Number
                </label>

                <input
                  type="text"
                  name="poNumber"
                  value={
                    form.poNumber
                  }
                  onChange={
                    handleChange
                  }
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
                onClick={
                  addItem
                }
                className="rounded-lg bg-indigo-800 px-5 py-2.5 text-sm font-medium text-gray-100 transition hover:bg-amber-400 hover:text-black cursor-pointer"
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

                  {calculatedItems.map(
                    (item, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-100"
                      >

                        <td className="py-3 pr-3">

                          <input
                            type="text"
                            value={
                              item.description
                            }
                            onChange={(e) =>
                              updateItem(
                                index,
                                "description",
                                e.target
                                  .value
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
                            value={
                              item.qty
                            }
                            onChange={(e) =>
                              updateItem(
                                index,
                                "qty",
                                e.target
                                  .value
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
                            value={
                              item.unitPrice
                            }
                            onChange={(e) =>
                              updateItem(
                                index,
                                "unitPrice",
                                e.target
                                  .value
                              )
                            }
                            placeholder=" "
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-black"
                          />

                        </td>

                        <td className="py-3 pr-3">

                          <input
                            type="percent"
                            min="0"
                            step="0.1"
                            value={
                              item.tax || 0
                            }
                            onChange={(e) =>
                              updateItem(
                                index,
                                "tax",
                                e.target
                                  .value
                              )
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-black"
                          />

                        </td>

                        <td className="py-3 pr-3 font-medium">

                          $
                          {item.total.toLocaleString(
                            "en-AU",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}

                        </td>

                        <td className="py-3">

                          {items.length >
                            1 && (
                            <button
                              type="button"
                              onClick={() =>
                                removeItem(
                                  index
                                )
                              }
                              className="text-sm text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                          )}

                        </td>

                      </tr>
                    )
                  )}

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
                    $
                    {subtotal.toLocaleString(
                      "en-AU",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </span>

                </div>

                <div className="flex justify-between text-sm">

                  <span className="text-gray-600">
                    GST (10%)
                  </span>

                  <span className="font-medium">
                    $
                    {gst.toLocaleString(
                      "en-AU",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </span>

                </div>

                <div className="border-t border-gray-200 pt-3">

                  <div className="flex justify-between text-lg font-semibold">

                    <span>
                      Total
                    </span>

                    <span>
                      $
                      {total.toLocaleString(
                        "en-AU",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
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
              value={
                form.notes
              }
              onChange={
                handleChange
              }
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
                  value={
                    form.accountManager
                  }
                  onChange={
                    handleChange
                  }
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
                  value={
                    form.accountManagerEmail
                  }
                  onChange={
                    handleChange
                  }
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
              onClick={
                handleSave
              }
              disabled={
                saving
              }
              className="rounded-lg bg-indigo-800 px-5 py-2.5 text-sm font-medium text-gray-100 transition hover:bg-amber-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {saving
                ? "Saving..."
                : "Create Invoice"}
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
                    <InvoicePDF
                      invoice={
                        pdfData
                      }
                    />
                  }
                  fileName={`${
                    form.invoiceNumber ||
                    "invoice"
                  }.pdf`}
                  className="rounded-lg bg-indigo-800 px-5 py-2.5 text-sm font-medium text-gray-100 transition hover:bg-amber-400 hover:text-black cursor-pointer"
                >
                  {({
                    loading,
                  }) =>
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
                  <InvoicePDF
                    invoice={
                      pdfData
                    }
                  />
                </PDFViewer>

              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}

