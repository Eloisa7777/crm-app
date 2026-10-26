
"use client";

// ============================================================
// Sub-Invoice - Detail / Edit Page
// Based on the New Sub-Invoice page.
// Reads and updates Firestore collection: subInvoices.
// No Client or Project fields.
// ============================================================

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";

import { db } from "@/lib/firebase";
import InvoicePDF from "@/components/InvoicePDF";

const money = (value) =>
  Number(value || 0).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const normaliseItems = (items) =>
  Array.isArray(items)
    ? items.map((item) => ({
        description: item?.description || "",
        qty: Number(item?.qty) || 0,
        unitPrice: Number(item?.unitPrice) || 0,
        tax: Number(item?.tax) || 0,
      }))
    : [{ description: "", qty: 1, unitPrice: "", tax: 0 }];

export default function SubInvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params?.id;

  // ==========================================================
  // 1. State
  // ==========================================================
  const [invoice, setInvoice] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loadingPOs, setLoadingPOs] = useState(true);
  const [poLoadError, setPoLoadError] = useState("");

  const [form, setForm] = useState({
    invoiceNumber: "",
    invoiceDate: "",
    dueDate: "",
    status: "Draft",
    poNumber: "",
    purchaseOrderId: "",
    items: [{ description: "", qty: 1, unitPrice: "", tax: 0 }],
    notes: "",
    accountManager: "Leo",
    accountManagerEmail: "leo.l@yjliningscreation.com.au",
  });

  // ==========================================================
  // 2. Load PO Numbers from purchaseOrders
  // ==========================================================
  useEffect(() => {
    let active = true;

    async function loadPurchaseOrders() {
      try {
        setLoadingPOs(true);
        setPoLoadError("");

        const snapshot = await getDocs(collection(db, "purchaseOrders"));
        const orders = snapshot.docs
          .map((poDoc) => {
            const data = poDoc.data();
            const poNumber =
              data.poNumber ||
              data.purchaseOrderNumber ||
              data.orderNumber ||
              data.number ||
              "";

            return {
              id: poDoc.id,
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

  // ==========================================================
  // 3. Load Sub-Invoice by document ID
  // ==========================================================
  useEffect(() => {
    let active = true;

    async function loadSubInvoice() {
      if (!invoiceId) {
        setLoading(false);
        setError("Invoice ID is missing.");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const invoiceRef = doc(db, "subInvoices", String(invoiceId));
        const snapshot = await getDoc(invoiceRef);

        if (!snapshot.exists()) {
          if (active) setError("Invoice not found.");
          return;
        }

        const data = { id: snapshot.id, ...snapshot.data() };
        if (!active) return;

        setInvoice(data);
        setForm({
          invoiceNumber: data.invoiceNumber || "",
          invoiceDate: data.invoiceDate || data.date || "",
          dueDate: data.dueDate || "",
          status: data.status || "Draft",
          poNumber: data.poNumber || "",
          purchaseOrderId: data.purchaseOrderId || "",
          items: normaliseItems(data.items),
          notes: data.notes || "",
          accountManager: data.accountManager || "Leo",
          accountManagerEmail:
            data.accountManagerEmail || "leo.l@yjliningscreation.com.au",
        });
      } catch (err) {
        console.error("Failed to load Invoice:", err);
        if (active) setError(err.message || "Failed to load Invoice.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSubInvoice();
    return () => {
      active = false;
    };
  }, [invoiceId]);

  // Resolve the selected PO by Firestore document ID, avoiding duplicate-number ambiguity.
  const selectedPurchaseOrder = purchaseOrders.find(
    (order) => order.id === form.purchaseOrderId
  );

  // ==========================================================
  // 4. Calculations and PDF data
  // ==========================================================
  const calculatedItems = useMemo(
    () =>
      form.items.map((item) => {
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
    [form.items]
  );

  const subtotal = useMemo(
    () => calculatedItems.reduce((sum, item) => sum + item.total, 0),
    [calculatedItems]
  );

  // Match the New Sub-Invoice page: GST is 10% of subtotal.
  const gst = subtotal * 0.1;
  const total = subtotal + gst;

  const pdfData = useMemo(
    () => ({
      id: invoice?.id || invoiceId || "",
      invoiceType: "sub-invoice",
      invoiceNumber: form.invoiceNumber,
      invoiceDate: form.invoiceDate,
      dueDate: form.dueDate,
      status: form.status,
      poNumber: selectedPurchaseOrder?.poNumber || form.poNumber,
      purchaseOrderId: selectedPurchaseOrder?.id || form.purchaseOrderId || "",
      items: calculatedItems,
      subtotal,
      gst,
      total,
      notes: form.notes,
      accountManager: form.accountManager,
      accountManagerEmail: form.accountManagerEmail,
    }),
    [
      invoice,
      invoiceId,
      form.invoiceNumber,
      form.invoiceDate,
      form.dueDate,
      form.status,
      form.poNumber,
      form.purchaseOrderId,
      form.notes,
      form.accountManager,
      form.accountManagerEmail,
      selectedPurchaseOrder,
      calculatedItems,
      subtotal,
      gst,
      total,
    ]
  );

  // ==========================================================
  // 5. Form handlers
  // ==========================================================
  function updateForm(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setSaved(false);
  }

  function handlePurchaseOrderChange(purchaseOrderId) {
    const selected = purchaseOrders.find((order) => order.id === purchaseOrderId);

    setForm((previous) => ({
      ...previous,
      purchaseOrderId,
      poNumber: selected?.poNumber || "",
    }));
    setSaved(false);
  }

  function updateItem(index, field, value) {
    setForm((previous) => ({
      ...previous,
      items: previous.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
    setSaved(false);
  }

  function addItem() {
    setForm((previous) => ({
      ...previous,
      items: [
        ...previous.items,
        { description: "", qty: 1, unitPrice: "", tax: 0 },
      ],
    }));
    setSaved(false);
  }

  function removeItem(index) {
    setForm((previous) => ({
      ...previous,
      items: previous.items.filter((_, itemIndex) => itemIndex !== index),
    }));
    setSaved(false);
  }

  function handleCancel() {
    if (!invoice) return;

    setForm({
      invoiceNumber: invoice.invoiceNumber || "",
      invoiceDate: invoice.invoiceDate || invoice.date || "",
      dueDate: invoice.dueDate || "",
      status: invoice.status || "Draft",
      poNumber: invoice.poNumber || "",
      purchaseOrderId: invoice.purchaseOrderId || "",
      items: normaliseItems(invoice.items),
      notes: invoice.notes || "",
      accountManager: invoice.accountManager || "Leo",
      accountManagerEmail:
        invoice.accountManagerEmail || "leo.l@yjliningscreation.com.au",
    });

    setEditing(false);
    setError("");
    setSaved(false);
  }

  // ==========================================================
  // 6. Save changes to subInvoices/{id}
  // ==========================================================
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

    if (!invoiceId) {
      setError("Invoice ID is missing.");
      return;
    }

    try {
      setSaving(true);

      const cleanItems = form.items.map((item) => {
        const qty = Number(item.qty) || 0;
        const unitPrice = Number(item.unitPrice) || 0;
        const tax = Number(item.tax) || 0;

        return {
          description: item.description || "",
          qty,
          unitPrice,
          tax,
          total: qty * unitPrice * (1 + tax / 100),
        };
      });

      const cleanSubtotal = cleanItems.reduce((sum, item) => sum + item.total, 0);
      const cleanGst = cleanSubtotal * 0.1;
      const cleanTotal = cleanSubtotal + cleanGst;
      const cleanPONumber = selectedPurchaseOrder?.poNumber || form.poNumber.trim();
      const cleanPurchaseOrderId =
        selectedPurchaseOrder?.id || form.purchaseOrderId || "";

      const updatedData = {
        invoiceType: "sub-invoice",
        invoiceNumber: form.invoiceNumber.trim(),
        invoiceDate: form.invoiceDate,
        dueDate: form.dueDate || "",
        status: form.status || "Draft",
        poNumber: cleanPONumber,
        purchaseOrderId: cleanPurchaseOrderId,
        items: cleanItems,
        subtotal: cleanSubtotal,
        gst: cleanGst,
        total: cleanTotal,
        notes: form.notes || "",
        accountManager: form.accountManager || "",
        accountManagerEmail: form.accountManagerEmail || "",
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, "subInvoices", String(invoiceId)), updatedData);

      const localUpdatedData = {
        ...updatedData,
        items: cleanItems,
        subtotal: cleanSubtotal,
        gst: cleanGst,
        total: cleanTotal,
        updatedAt: new Date(),
      };

      setInvoice((previous) => ({ ...previous, ...localUpdatedData }));
      setForm((previous) => ({
        ...previous,
        poNumber: cleanPONumber,
        purchaseOrderId: cleanPurchaseOrderId,
        items: cleanItems.map(({ description, qty, unitPrice, tax }) => ({
          description,
          qty,
          unitPrice,
          tax,
        })),
      }));
      setEditing(false);
      setSaved(true);
    } catch (err) {
      console.error("Failed to save Sub-Invoice:", err);
      setError(err.message || "Failed to save Invoice.");
    } finally {
      setSaving(false);
    }
  }

  // ==========================================================
  // 7. Loading / not found
  // ==========================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-gray-500">Loading Invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-6xl">
          <Link href="/sub-invoices" className="text-sm text-gray-500 hover:text-black">
            ← Invoices
          </Link>
          <div className="mt-6 rounded-xl bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold">Invoice Not Found</h1>
            <p className="mt-2 text-gray-500">{error || "This Invoice could not be found."}</p>
            <p className="mt-4 text-sm text-gray-400">Document ID: {invoiceId}</p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // 8. Page UI
  // ==========================================================
  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/sub-invoices" className="text-sm text-gray-500 hover:text-black">
              ← Invoices
            </Link>
            <h1 className="mt-3 text-3xl font-bold">
              {form.invoiceNumber || "Sub-Invoice"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Invoice ID: {invoice.id}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!editing ? (
              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                  setSaved(false);
                }}
                className="cursor-pointer rounded-lg bg-indigo-800 px-5 py-2.5 text-sm font-medium text-gray-100 transition hover:bg-amber-400 hover:text-black"
              >
                Edit
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="cursor-pointer rounded-lg bg-indigo-800 px-5 py-2.5 text-sm font-medium text-gray-100 transition hover:bg-amber-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </>
            )}
          </div>
        </div>

        {saved && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            Invoice changes saved successfully.
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Invoice Information */}
        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-gray-900">Invoice Information</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Invoice Number</label>
              {editing ? (
                <input
                  value={form.invoiceNumber}
                  onChange={(e) => updateForm("invoiceNumber", e.target.value)}
                  placeholder="INV-0001"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                />
              ) : (
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm">{form.invoiceNumber || "-"}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
              {editing ? (
                <select
                  value={form.status}
                  onChange={(e) => updateForm("status", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                >
                  <option value="Draft">Draft</option>
                  <option value="Issued">Issued</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              ) : (
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm">{form.status || "-"}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Invoice Date</label>
              {editing ? (
                <input
                  type="date"
                  value={form.invoiceDate}
                  onChange={(e) => updateForm("invoiceDate", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                />
              ) : (
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm">{form.invoiceDate || "-"}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Due Date</label>
              {editing ? (
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => updateForm("dueDate", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                />
              ) : (
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm">{form.dueDate || "-"}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">PO Number</label>
              {editing ? (
                loadingPOs ? (
                  <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">Loading PO Numbers...</p>
                ) : purchaseOrders.length > 0 ? (
                  <select
                    value={form.purchaseOrderId}
                    onChange={(e) => handlePurchaseOrderChange(e.target.value)}
                    className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                  >
                    <option value="">Select PO Number</option>
                    {purchaseOrders.map((order) => (
                      <option key={order.id} value={order.id}>{order.poNumber}</option>
                    ))}
                    {form.purchaseOrderId === "" && form.poNumber && !purchaseOrders.some((order) => order.poNumber === form.poNumber) && (
                      <option value="">Current PO: {form.poNumber} (not found in purchaseOrders)</option>
                    )}
                  </select>
                ) : (
                  <div>
                    <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">No PO Numbers found.</p>
                    {form.poNumber && <p className="mt-1 text-sm text-gray-600">Saved PO Number: {form.poNumber}</p>}
                  </div>
                )
              ) : (
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm">{form.poNumber || "-"}</p>
              )}
              {editing && poLoadError && <p className="mt-1 text-sm text-red-600">{poLoadError}</p>}
            </div>
          </div>
        </section>

        {/* Invoice Items */}
        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Invoice Items</h2>
            {editing && (
              <button
                type="button"
                onClick={addItem}
                className="cursor-pointer rounded-lg bg-indigo-800 px-5 py-2.5 text-sm font-medium text-gray-100 transition hover:bg-amber-400 hover:text-black"
              >
                + Add Item
              </button>
            )}
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
                  {editing && <th className="w-20 pb-3 font-medium text-gray-600"></th>}
                </tr>
              </thead>
              <tbody>
                {calculatedItems.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 pr-3">
                      {editing ? (
                        <input
                          value={item.description}
                          onChange={(e) => updateItem(index, "description", e.target.value)}
                          placeholder="Description"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-black"
                        />
                      ) : (
                        <span>{item.description || "-"}</span>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      {editing ? (
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.qty}
                          onChange={(e) => updateItem(index, "qty", e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-black"
                        />
                      ) : (
                        <span>{item.qty}</span>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      {editing ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-black"
                        />
                      ) : (
                        <span>${money(item.unitPrice)}</span>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      {editing ? (
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={item.tax}
                          onChange={(e) => updateItem(index, "tax", e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-black"
                        />
                      ) : (
                        <span>{item.tax}%</span>
                      )}
                    </td>
                    <td className="py-3 pr-3 font-medium">${money(item.total)}</td>
                    {editing && (
                      <td className="py-3">
                        {form.items.length > 1 && (
                          <button type="button" onClick={() => removeItem(index)} className="text-sm text-red-600 hover:text-red-800">
                            Remove
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-gray-900">Notes</h2>
          {editing ? (
            <textarea
              value={form.notes}
              onChange={(e) => updateForm("notes", e.target.value)}
              rows={5}
              placeholder="Payment instructions, additional notes, etc."
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm text-gray-700">{form.notes || "-"}</p>
          )}
        </section>

        {/* YJ Contact */}
        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-gray-900">YJ Contact</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Contact Name</label>
              {editing ? (
                <input
                  value={form.accountManager}
                  onChange={(e) => updateForm("accountManager", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                />
              ) : (
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm">{form.accountManager || "-"}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Contact Email</label>
              {editing ? (
                <input
                  type="email"
                  value={form.accountManagerEmail}
                  onChange={(e) => updateForm("accountManagerEmail", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                />
              ) : (
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm">{form.accountManagerEmail || "-"}</p>
              )}
            </div>
          </div>
        </section>

        {/* PDF Preview and Download */}
        {!editing && (
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">-Invoice PDF</h2>
              <PDFDownloadLink
                document={<InvoicePDF invoice={pdfData} />}
                fileName={`${form.invoiceNumber || "newinvoice"}.pdf`}
                className="cursor-pointer rounded-lg bg-indigo-800 px-5 py-2.5 text-sm font-medium text-gray-100 transition hover:bg-amber-400 hover:text-black"
              >
                {({ loading: pdfLoading }) => pdfLoading ? "Preparing PDF..." : "Download PDF"}
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
  );
}
