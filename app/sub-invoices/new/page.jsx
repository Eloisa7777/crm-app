
"use client";

// ============================================================
// Sub-Invoice - Create Page
// Uses the same invoice fields and calculations as the existing
// Invoice page, but does not collect Client or Project information.
// Saves to Firestore collection: subInvoices
// ============================================================

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";

import { db } from "@/lib/firebase";
import InvoicePDF from "@/components/InvoicePDF";

const DEFAULT_ACCOUNT_MANAGER = "Leo";
const DEFAULT_ACCOUNT_MANAGER_EMAIL = "leo.l@yjliningscreation.com.au";

const today = () => new Date().toISOString().split("T")[0];

const money = (value) =>
  Number(value || 0).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function NewSubInvoicePage() {
  // ==========================================================
  // 1. Form state - no Client or Project fields
  // ==========================================================
  const [form, setForm] = useState({
    invoiceNumber: "",
    invoiceDate: today(),
    dueDate: "",
    status: "Draft",
    poNumber: "",
    notes: "",
    accountManager: DEFAULT_ACCOUNT_MANAGER,
    accountManagerEmail: DEFAULT_ACCOUNT_MANAGER_EMAIL,
  });

  // ==========================================================
  // 2. Invoice items
  // ==========================================================
  const [items, setItems] = useState([
    { description: "", qty: 1, unitPrice: "", tax: 0 },
  ]);

  // ==========================================================
  // 2A. Load PO Numbers from Firestore
  // Collection: purchaseOrders
  // ==========================================================
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loadingPOs, setLoadingPOs] = useState(true);
  const [poLoadError, setPoLoadError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPurchaseOrders() {
      try {
        setLoadingPOs(true);
        setPoLoadError("");

        const snapshot = await getDocs(collection(db, "purchaseOrders"));
        const orders = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            const poNumber =
              data.poNumber ||
              data.purchaseOrderNumber ||
              data.orderNumber ||
              data.number ||
              "";

            return {
              id: doc.id,
              ...data,
              poNumber: String(poNumber).trim(),
            };
          })
          .filter((order) => order.poNumber)
          .sort((a, b) => a.poNumber.localeCompare(b.poNumber));

        if (active) setPurchaseOrders(orders);
      } catch (err) {
        console.error("Failed to load purchase orders:", err);
        if (active) setPoLoadError("Failed to load PO Numbers from Firebase.");
      } finally {
        if (active) setLoadingPOs(false);
      }
    }

    loadPurchaseOrders();

    return () => {
      active = false;
    };
  }, []);

  const selectedPurchaseOrder = purchaseOrders.find(
    (order) => order.poNumber === form.poNumber
  );

  const calculatedItems = useMemo(
    () =>
      items.map((item) => {
        const qty = Number(item.qty) || 0;
        const unitPrice = Number(item.unitPrice) || 0;
        const tax = Number(item.tax) || 0;

        return {
          ...item,
          qty,
          unitPrice,
          tax,
          total: qty * unitPrice * (1 + tax / 100),
        };
      }),
    [items]
  );

  const subtotal = useMemo(
    () => calculatedItems.reduce((sum, item) => sum + item.total, 0),
    [calculatedItems]
  );

  // Match the original Invoice page: GST is calculated as 10% of subtotal.
  const gst = subtotal * 0.1;
  const total = subtotal + gst;

  // ==========================================================
  // 3. Form and item handlers
  // ==========================================================
  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function updateItem(index, field, value) {
    setItems((previous) =>
      previous.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  }

  function addItem() {
    setItems((previous) => [
      ...previous,
      { description: "", qty: 1, unitPrice: "", tax: 0 },
    ]);
  }

  function removeItem(index) {
    setItems((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
  }

  // ==========================================================
  // 4. Save Sub-Invoice
  // ==========================================================
  const [saving, setSaving] = useState(false);
  const [savedInvoice, setSavedInvoice] = useState(null);
  const [error, setError] = useState("");

  async function handleSave() {
    setError("");

    if (!form.invoiceNumber.trim()) {
      setError("Please enter an invoice number.");
      return;
    }

    if (!form.invoiceDate) {
      setError("Please select an invoice date.");
      return;
    }

    try {
      setSaving(true);

      const invoiceData = {
        // Identify this document as a Sub-Invoice.
        invoiceType: "sub-invoice",
        invoiceNumber: form.invoiceNumber.trim(),
        invoiceDate: form.invoiceDate,
        dueDate: form.dueDate,
        status: form.status || "Draft",
        poNumber: form.poNumber.trim(),
        purchaseOrderId: selectedPurchaseOrder?.id || "",

        // Intentionally no clientId, client, clientName,
        // clientAddress, projectId, or projectName fields.
        items: calculatedItems,
        subtotal,
        gst,
        total,
        notes: form.notes,
        accountManager: form.accountManager,
        accountManagerEmail: form.accountManagerEmail,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(
        collection(db, "subInvoices"),
        invoiceData
      );

      setSavedInvoice({
        id: docRef.id,
        ...invoiceData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (saveError) {
      console.error("Failed to create Sub-Invoice:", saveError);
      setError("Failed to create Sub-Invoice. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ==========================================================
  // 5. PDF data
  // No Client or Project data is passed to the existing template.
  // Check InvoicePDF.jsx for hard-coded Client/Project sections.
  // ==========================================================
  const pdfData = savedInvoice || {
    invoiceType: "sub-invoice",
    invoiceNumber: form.invoiceNumber,
    invoiceDate: form.invoiceDate,
    dueDate: form.dueDate,
    status: form.status,
    poNumber: form.poNumber,
    purchaseOrderId: selectedPurchaseOrder?.id || "",
    items: calculatedItems,
    subtotal,
    gst,
    total,
    notes: form.notes,
    accountManager: form.accountManager,
    accountManagerEmail: form.accountManagerEmail,
  };

  // ==========================================================
  // 6. Page UI
  // ==========================================================
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              New Invoice
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Create a new invoice
            </p>
          </div>

          <Link
            href="/sub-invoices"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to Invoices
          </Link>
        </div>

        <div className="space-y-6">
          {/* Invoice Information */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-semibold text-gray-900">
              Invoice Information
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Invoice Number
                </label>
                <input
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

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  PO Number
                </label>

                {loadingPOs ? (
                  <div className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                    Loading PO Numbers...
                  </div>
                ) : (
                  <select
                    name="poNumber"
                    value={form.poNumber}
                    onChange={handleChange}
                    className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                  >
                    <option value="">Select PO Number</option>
                    {purchaseOrders.map((order) => (
                      <option key={order.id} value={order.poNumber}>
                        {order.poNumber}
                      </option>
                    ))}
                  </select>
                )}

                {poLoadError ? (
                  <p className="mt-1 text-sm text-red-600">{poLoadError}</p>
                ) : !loadingPOs && purchaseOrders.length === 0 ? (
                  <p className="mt-1 text-sm text-amber-700">
                    No PO Numbers found. Check the purchaseOrders collection and PO number field.
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          {/* Invoice Items */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
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
                    <th className="pb-3 pr-3 font-medium text-gray-600">Description</th>
                    <th className="w-24 pb-3 pr-3 font-medium text-gray-600">Qty</th>
                    <th className="w-36 pb-3 pr-3 font-medium text-gray-600">Unit Price</th>
                    <th className="w-24 pb-3 pr-3 font-medium text-gray-600">Tax %</th>
                    <th className="w-36 pb-3 pr-3 font-medium text-gray-600">Total</th>
                    <th className="w-20 pb-3 font-medium text-gray-600"></th>
                  </tr>
                </thead>

                <tbody>
                  {calculatedItems.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-3 pr-3">
                        <input
                          value={item.description}
                          onChange={(event) =>
                            updateItem(index, "description", event.target.value)
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
                          onChange={(event) =>
                            updateItem(index, "qty", event.target.value)
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
                          onChange={(event) =>
                            updateItem(index, "unitPrice", event.target.value)
                          }
                          placeholder="0.00"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-black"
                        />
                      </td>

                      <td className="py-3 pr-3">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={item.tax}
                          onChange={(event) =>
                            updateItem(index, "tax", event.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-black"
                        />
                      </td>

                      <td className="py-3 pr-3 font-medium">
                        ${money(item.total)}
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
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">${money(subtotal)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">GST (10%)</span>
                  <span className="font-medium">${money(gst)}</span>
                </div>

                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>${money(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Notes */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-semibold text-gray-900">Notes</h2>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={5}
              placeholder="Payment instructions, additional notes, etc."
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
            />
          </section>

          {/* YJ Contact */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-semibold text-gray-900">YJ Contact</h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Contact Name
                </label>
                <input
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
          </section>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Link
              href="/sub-invoices"
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="cursor-pointer rounded-lg bg-indigo-800 px-5 py-2.5 text-sm font-medium text-gray-100 transition hover:bg-amber-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Create Invoice"}
            </button>
          </div>

          {/* PDF Preview and Download */}
          {savedInvoice && (
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-gray-900">
                  Invoice PDF
                </h2>

                <PDFDownloadLink
                  document={<InvoicePDF invoice={pdfData} />}
                  fileName={`${form.invoiceNumber || "newinvoice"}.pdf`}
                  className="cursor-pointer rounded-lg bg-indigo-800 px-5 py-2.5 text-sm font-medium text-gray-100 transition hover:bg-amber-400 hover:text-black"
                >
                  {({ loading }) =>
                    loading ? "Preparing PDF..." : "Download PDF"
                  }
                </PDFDownloadLink>
              </div>

              <div className="overflow-hidden rounded-lg border border-gray-200">
                <PDFViewer width="100%" height={800} showToolbar>
                  <InvoicePDF invoice={pdfData} />
                </PDFViewer>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
