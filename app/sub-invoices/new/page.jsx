
"use client";

// ============================================================
// Sub-Invoice - Create Page
// PO auto-fill + Supplier / Subcontractor matching
// UID source: verified server session through /api/me
// ============================================================

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

import {
  PDFDownloadLink,
  PDFViewer,
} from "@react-pdf/renderer";

import { db } from "@/lib/firebase";
import SubinvoicePDF from "@/components/SubinvoicePDF";

// ============================================================
// 1. Helpers
// ============================================================

function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDaysToDate(dateString, days = 20) {
  if (!dateString) return "";

  const [year, month, day] = dateString.split("-").map(Number);

  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);

  return localDate(date);
}

function generateInvoiceNumber(short, dateString) {
  if (!short || !dateString) return "";

  const [year, month, day] = dateString.split("-");
  const shortDate = `${day}${month}${year.slice(-2)}`;

  return `INV-${String(short).trim()}${shortDate}`;
}

const money = (value) =>
  Number(value || 0).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const EMPTY_SUPPLIER = {
  name: "",
  short: "",
  abn: "",
  address: "",
  contact: "",
  email: "",
  phone: "",
  bankName: "",
  bankAccount: "",
  BSB: "",
  accountName: "",
};

// ============================================================
// 2. Component
// ============================================================

export default function NewSubInvoicePage() {
  const initialDate = localDate();

  // Current UID from verified server session (/api/me)
  const [currentUID, setCurrentUID] = useState("");

  const [form, setForm] = useState({
    invoiceNumber: "",
    invoiceDate: initialDate,
    dueDate: addDaysToDate(initialDate, 20),
    status: "Draft",
    poNumber: "",
    purchaseOrderId: "",
    projectId: "",
    projectName: "",
    siteAddress: "",
    scopeOfWork: "",
    notes: "",
  });

  const [items, setItems] = useState([
    {
      description: "",
      qty: 1,
      unitPrice: "",
      tax: 0,
    },
  ]);

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loadingPOs, setLoadingPOs] = useState(true);
  const [poLoadError, setPoLoadError] = useState("");

  const [supplier, setSupplier] = useState(EMPTY_SUPPLIER);
  const [loadingSupplier, setLoadingSupplier] = useState(false);
  const [supplierLoadError, setSupplierLoadError] = useState("");

  const [saving, setSaving] = useState(false);
  const [savedInvoice, setSavedInvoice] = useState(null);
  const [error, setError] = useState("");

  // ==========================================================
  // 3. Load current UID and Purchase Orders
  //
  // UID comes from the same /api/me endpoint used by Sidebar.
  // Only load this user's Issued Purchase Orders.
  // ==========================================================

  useEffect(() => {
    let active = true;

    async function loadPurchaseOrders() {
      try {
        setLoadingPOs(true);
        setPoLoadError("");
        setPurchaseOrders([]);

        // Get current user from verified server session
        const meResponse = await fetch("/api/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const meData = await meResponse.json();

        if (
          !meResponse.ok ||
          !meData.authenticated ||
          !meData.uid
        ) {
          throw new Error(
            meData.error ||
              "Please log in to view Purchase Orders."
          );
        }

        // Same UID as Sidebar
        const uid = meData.uid;

        if (!active) return;

        setCurrentUID(uid);

        console.log("[New Sub-Invoice] Current UID:", uid);

        // Load Supplier, Subcontractor and PO records
        const [
          suppliersSnapshot,
          subcontractorsSnapshot,
          poSnapshot,
        ] = await Promise.all([
          getDocs(collection(db, "Suppliers")),
          getDocs(collection(db, "Subcontractors")),
          getDocs(collection(db, "purchaseOrders")),
        ]);

        if (!active) return;

        // Supplier documents belonging to current UID
        const supplierIds = new Set(
          suppliersSnapshot.docs
            .filter((item) => item.data().uid === uid)
            .map((item) => item.id)
        );

        // Subcontractor documents belonging to current UID
        const subcontractorIds = new Set(
          subcontractorsSnapshot.docs
            .filter((item) => item.data().uid === uid)
            .map((item) => item.id)
        );

        // Filter Purchase Orders
        const orders = poSnapshot.docs
          .map((item) => {
            const data = item.data();

            const poNumber =
              data.poNumber ||
              data.purchaseOrderNumber ||
              data.orderNumber ||
              data.number ||
              "";

            return {
              id: item.id,
              ...data,
              poNumber: String(poNumber).trim(),
            };
          })
          .filter((order) => {
            // Only Issued POs
            if (order.status !== "Issued") {
              return false;
            }

            if (!order.supplierId || !order.poNumber) {
              return false;
            }

            // Match Supplier UID
            if (order.supplierType === "Supplier") {
              return supplierIds.has(order.supplierId);
            }

            // Match Subcontractor UID
            if (order.supplierType === "Subcontractor") {
              return subcontractorIds.has(order.supplierId);
            }

            return false;
          })
          .sort((a, b) =>
            a.poNumber.localeCompare(b.poNumber)
          );

        if (active) {
          setPurchaseOrders(orders);
        }

      } catch (err) {
        console.error(
          "[New Sub-Invoice] Failed to load POs:",
          err
        );

        if (active) {
          setPoLoadError(
            err.message ||
              "Failed to load Purchase Orders."
          );
        }
      } finally {
        if (active) {
          setLoadingPOs(false);
        }
      }
    }

    loadPurchaseOrders();

    return () => {
      active = false;
    };
  }, []);

  // Currently selected Purchase Order
  const selectedPurchaseOrder = purchaseOrders.find(
    (order) => order.id === form.purchaseOrderId
  );

  // ==========================================================
  // 4. Load Supplier / Subcontractor from selected PO
  // ==========================================================

  async function loadSupplierForPO(order) {
    if (!order) {
      setSupplier(EMPTY_SUPPLIER);
      setSupplierLoadError("");
      return;
    }

    try {
      setLoadingSupplier(true);
      setSupplierLoadError("");

      if (!currentUID) {
        throw new Error(
          "User UID is not available. Please log in again."
        );
      }

      if (order.status !== "Issued") {
        throw new Error(
          "Only Issued Purchase Orders can be selected."
        );
      }

      if (!order.supplierId) {
        throw new Error(
          "The selected PO does not have a supplierId."
        );
      }

      let collectionName;

      if (order.supplierType === "Supplier") {
        collectionName = "Suppliers";
      } else if (order.supplierType === "Subcontractor") {
        collectionName = "Subcontractors";
      } else {
        throw new Error(
          "Invalid Supplier Type on the selected PO."
        );
      }

      const supplierRef = doc(
        db,
        collectionName,
        order.supplierId
      );

      const snapshot = await getDoc(supplierRef);

      if (!snapshot.exists()) {
        throw new Error(
          `${collectionName} document not found.`
        );
      }

      const data = snapshot.data();

      // Verify Supplier / Subcontractor UID
      if (data.uid !== currentUID) {
        throw new Error(
          "You do not have permission to access this Purchase Order."
        );
      }

      const poSupplier = order.supplier || {};

      const supplierData = {
        name: data.name || "",
        short: data.short || "",
        abn: data.abn || "",
        address: data.address || "",
        contact: poSupplier.contact || "",
        email: poSupplier.email || "",
        phone: poSupplier.phone || "",
        bankName: data.bankName || "",
        bankAccount: data.bankAccount || "",
        BSB: data.BSB || "",
        accountName: data.accountName || data.name || "",
      };

      setSupplier(supplierData);

      setForm((previous) => ({
        ...previous,
        invoiceNumber: supplierData.short
          ? generateInvoiceNumber(
              supplierData.short,
              previous.invoiceDate
            )
          : "",
      }));

    } catch (err) {
      console.error(
        "Failed to load Supplier:",
        err
      );

      setSupplier(EMPTY_SUPPLIER);

      setSupplierLoadError(
        err.message ||
          "Failed to load Supplier information."
      );

      setForm((previous) => ({
        ...previous,
        invoiceNumber: "",
      }));
    } finally {
      setLoadingSupplier(false);
    }
  }

  // ==========================================================
  // 5. Select PO and automatically fill invoice information
  // ==========================================================

  async function handlePurchaseOrderChange(purchaseOrderId) {
    const selected = purchaseOrders.find(
      (order) => order.id === purchaseOrderId
    );

    setSavedInvoice(null);
    setError("");

    if (!selected) {
      setForm((previous) => ({
        ...previous,
        purchaseOrderId: "",
        poNumber: "",
        projectId: "",
        projectName: "",
        siteAddress: "",
        scopeOfWork: "",
        invoiceNumber: "",
      }));

      setItems([
        {
          description: "",
          qty: 1,
          unitPrice: "",
          tax: 0,
        },
      ]);

      setSupplier(EMPTY_SUPPLIER);
      setSupplierLoadError("");

      return;
    }

    setForm((previous) => ({
      ...previous,
      purchaseOrderId: selected.id,
      poNumber: selected.poNumber || "",
      projectId: selected.projectId || "",
      projectName: selected.projectName || "",
      siteAddress: selected.siteAddress || "",
      scopeOfWork: selected.scopeOfWork || "",
    }));

    const poItems = Array.isArray(selected.items)
      ? selected.items
      : [];

    setItems(
      poItems.length
        ? poItems.map((item) => ({
            description: item.description || "",
            qty: Number(item.qty) || 0,
            unitPrice:
              item.unitPrice === undefined ||
              item.unitPrice === null
                ? ""
                : item.unitPrice,
            tax: Number(item.tax) || 0,
          }))
        : [
            {
              description: "",
              qty: 1,
              unitPrice: "",
              tax: 0,
            },
          ]
    );

    await loadSupplierForPO(selected);
  }

  // ==========================================================
  // 6. Editable form handlers
  // ==========================================================

  function updateForm(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setSavedInvoice(null);
  }

  function handleInvoiceDateChange(value) {
    setForm((previous) => ({
      ...previous,
      invoiceDate: value,
      dueDate: addDaysToDate(value, 20),
      invoiceNumber: supplier.short
        ? generateInvoiceNumber(supplier.short, value)
        : "",
    }));

    setSavedInvoice(null);
  }

  function updateSupplier(field, value) {
    setSupplier((previous) => ({
      ...previous,
      [field]: value,
    }));

    setSavedInvoice(null);
  }

  function updateItem(index, field, value) {
    setItems((previous) =>
      previous.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [field]: value }
          : item
      )
    );

    setSavedInvoice(null);
  }

  function addItem() {
    setItems((previous) => [
      ...previous,
      {
        description: "",
        qty: 1,
        unitPrice: "",
        tax: 0,
      },
    ]);

    setSavedInvoice(null);
  }

  function removeItem(index) {
    setItems((previous) =>
      previous.filter(
        (_, itemIndex) => itemIndex !== index
      )
    );

    setSavedInvoice(null);
  }

  // ==========================================================
  // 7. Calculations
  // ==========================================================

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
    () =>
      calculatedItems.reduce(
        (sum, item) => sum + item.total,
        0
      ),
    [calculatedItems]
  );

  const gst = subtotal * 0.1;
  const total = subtotal + gst;

  // ==========================================================
  // 8. Save Sub-Invoice
  // UID comes from /api/me, not Firebase Client Auth.
  // ==========================================================

  async function handleSave() {
    setError("");

    if (!currentUID) {
      setError(
        "User UID is not available. Please log in again."
      );
      return;
    }

    if (!form.invoiceNumber.trim()) {
      setError("Please enter an invoice number.");
      return;
    }

    if (!form.invoiceDate) {
      setError("Please select an Invoice Date.");
      return;
    }

    if (!selectedPurchaseOrder) {
      setError("Please select a Purchase Order.");
      return;
    }

    if (!selectedPurchaseOrder.supplierId) {
      setError(
        "The selected PO does not have a supplierId."
      );
      return;
    }

    if (loadingSupplier) {
      setError(
        "Please wait for Supplier information to load."
      );
      return;
    }

    if (supplierLoadError) {
      setError(supplierLoadError);
      return;
    }

    if (!supplier.name) {
      setError(
        "The Supplier record has no company name."
      );
      return;
    }

    try {
      setSaving(true);

      // Re-check the PO from Firestore before saving
      const latestPORef = doc(
        db,
        "purchaseOrders",
        selectedPurchaseOrder.id
      );

      const latestPOSnapshot = await getDoc(latestPORef);

      if (!latestPOSnapshot.exists()) {
        throw new Error(
          "The selected Purchase Order no longer exists."
        );
      }

      const latestPO = latestPOSnapshot.data();

      if (latestPO.status !== "Issued") {
        throw new Error(
          "This Purchase Order is no longer Issued."
        );
      }

      if (
        latestPO.supplierId !==
          selectedPurchaseOrder.supplierId ||
        latestPO.supplierType !==
          selectedPurchaseOrder.supplierType
      ) {
        throw new Error(
          "The Purchase Order supplier information has changed. Please reload the page."
        );
      }

      // Determine Supplier collection
      const supplierCollection =
        latestPO.supplierType === "Supplier"
          ? "Suppliers"
          : latestPO.supplierType === "Subcontractor"
            ? "Subcontractors"
            : null;

      if (!supplierCollection) {
        throw new Error(
          "Invalid Supplier Type on the selected PO."
        );
      }

      // Re-check Supplier / Subcontractor UID
      const latestSupplierSnapshot = await getDoc(
        doc(
          db,
          supplierCollection,
          latestPO.supplierId
        )
      );

      if (
        !latestSupplierSnapshot.exists() ||
        latestSupplierSnapshot.data().uid !== currentUID
      ) {
        throw new Error(
          "You do not have permission to create an invoice for this Purchase Order."
        );
      }

      // Prepare invoice data
      const invoiceData = {
        // UID from verified server session
        uid: currentUID,

        invoiceType: "sub-invoice",
        invoiceNumber: form.invoiceNumber.trim(),
        invoiceDate: form.invoiceDate,
        dueDate: form.dueDate || "",
        status: form.status || "Draft",

        purchaseOrderId: selectedPurchaseOrder.id,
        poNumber: selectedPurchaseOrder.poNumber,
        supplierType: selectedPurchaseOrder.supplierType || "",
        supplierId: selectedPurchaseOrder.supplierId,

        supplier: {
          name: supplier.name,
          short: supplier.short,
          abn: supplier.abn,
          address: supplier.address,
          contact: supplier.contact,
          email: supplier.email,
          phone: supplier.phone,
          bankName: supplier.bankName,
          bankAccount: supplier.bankAccount,
          BSB: supplier.BSB,
          accountName: supplier.accountName || supplier.name,
        },

        projectId: form.projectId,
        projectName: form.projectName,
        siteAddress: form.siteAddress,
        scopeOfWork: form.scopeOfWork,

        items: calculatedItems,
        subtotal,
        gst,
        total,

        notes: form.notes || "",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Save to Firestore
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

    } catch (err) {
      console.error(
        "Failed to create Sub-Invoice:",
        err
      );

      setError(
        err.message || "Failed to create Sub-Invoice."
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================================
  // 9. PDF data
  // ==========================================================

  const pdfData = savedInvoice || {
    invoiceType: "sub-invoice",
    invoiceNumber: form.invoiceNumber,
    invoiceDate: form.invoiceDate,
    dueDate: form.dueDate,
    status: form.status,
    poNumber: form.poNumber,
    purchaseOrderId: form.purchaseOrderId,
    supplierType:
      selectedPurchaseOrder?.supplierType || "",
    supplierId:
      selectedPurchaseOrder?.supplierId || "",
    supplier,
    projectId: form.projectId,
    projectName: form.projectName,
    siteAddress: form.siteAddress,
    scopeOfWork: form.scopeOfWork,
    items: calculatedItems,
    subtotal,
    gst,
    total,
    notes: form.notes,
  };

  // ==========================================================
  // 10. UI
  // ==========================================================

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              New Sub-Invoice
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Create an invoice from a Purchase Order
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
            <h2 className="mb-5 text-lg font-semibold">
              Invoice Information
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Invoice Number
                </label>

                <input
                  value={form.invoiceNumber}
                  onChange={(e) =>
                    updateForm("invoiceNumber", e.target.value)
                  }
                  placeholder="INV-SHORTDDMMYY"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Status
                </label>

                <select
                  value={form.status}
                  onChange={(e) =>
                    updateForm("status", e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="Draft">Draft</option>
                  <option value="Issued">Issued</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Invoice Date
                </label>

                <input
                  type="date"
                  value={form.invoiceDate}
                  onChange={(e) =>
                    handleInvoiceDateChange(e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Due Date
                </label>

                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    updateForm("dueDate", e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  PO Number
                </label>

                <select
                  value={form.purchaseOrderId}
                  onChange={(e) =>
                    handlePurchaseOrderChange(e.target.value)
                  }
                  disabled={
                    loadingPOs ||
                    purchaseOrders.length === 0
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="">
                    {loadingPOs
                      ? "Loading Purchase Orders..."
                      : purchaseOrders.length === 0
                        ? "No PO Available"
                        : "Select PO Number"}
                  </option>

                  {purchaseOrders.map((order) => (
                    <option
                      key={order.id}
                      value={order.id}
                    >
                      {order.poNumber}
                    </option>
                  ))}
                </select>

                {poLoadError && (
                  <p className="mt-1 text-sm text-red-600">
                    {poLoadError}
                  </p>
                )}
              </div>

            </div>
          </section>

          {/* Send From */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Send From
              </h2>

              <span className="text-xs text-gray-500">
                {selectedPurchaseOrder?.supplierType || ""}
              </span>
            </div>

            {loadingSupplier ? (
              <p className="text-sm text-gray-500">
                Loading Supplier information...
              </p>
            ) : supplierLoadError ? (
              <p className="text-sm text-red-600">
                {supplierLoadError}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                {[
                  ["Company Name", "name"],
                  ["ABN", "abn"],
                  ["Contact", "contact"],
                  ["Email", "email"],
                  ["Phone", "phone"],
                  ["Address", "address"],
                  ["Account Name", "accountName"],
                  ["BSB", "BSB"],
                  ["Account Number", "bankAccount"],
                ].map(([label, field]) => (
                  <div key={field}>
                    <label className="mb-1 block text-sm text-gray-500">
                      {label}
                    </label>

                    <input
                      value={
                        field === "accountName"
                          ? supplier.accountName ?? supplier.name
                          : supplier[field] || ""
                      }
                      onChange={(e) =>
                        updateSupplier(
                          field,
                          e.target.value
                        )
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                ))}

              </div>
            )}
          </section>

          {/* Project Information */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-semibold">
              Project Information
            </h2>

            <div className="space-y-4">

              {[
                ["Project", "projectName"],
                ["Site Address", "siteAddress"],
                ["Scope of Work", "scopeOfWork"],
              ].map(([label, field]) => (
                <div key={field}>
                  <label className="mb-1 block text-sm text-gray-500">
                    {label}
                  </label>

                  {field === "scopeOfWork" ? (
                    <textarea
                      value={form[field]}
                      onChange={(e) =>
                        updateForm(field, e.target.value)
                      }
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  ) : (
                    <input
                      value={form[field]}
                      onChange={(e) =>
                        updateForm(field, e.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  )}
                </div>
              ))}

            </div>
          </section>

          {/* Invoice Items */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Invoice Items
              </h2>

              <button
                type="button"
                onClick={addItem}
                className="cursor-pointer px-5 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
              >
                + Add Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">

                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-3">
                      Description
                    </th>
                    <th className="w-24 pb-3 pr-3">
                      Qty
                    </th>
                    <th className="w-36 pb-3 pr-3">
                      Unit Price
                    </th>
                    <th className="w-24 pb-3 pr-3">
                      Tax %
                    </th>
                    <th className="w-36 pb-3 pr-3">
                      Total
                    </th>
                    <th className="w-20 pb-3"></th>
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
                          value={item.description}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "description",
                              e.target.value
                            )
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        />
                      </td>

                      <td className="py-3 pr-3">
                        <input
                          type="number"
                          min="0"
                          value={item.qty}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "qty",
                              e.target.value
                            )
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2"
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
                          className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        />
                      </td>

                      <td className="py-3 pr-3">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={item.tax}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "tax",
                              e.target.value
                            )
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2"
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
                            className="text-red-600 hover:text-red-800"
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
                  <span>Subtotal</span>
                  <span>${money(subtotal)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span>GST (10%)</span>
                  <span>${money(gst)}</span>
                </div>

                <div className="flex justify-between border-t pt-3 text-lg font-semibold">
                  <span>Total</span>
                  <span>${money(total)}</span>
                </div>

              </div>
            </div>

          </section>

          {/* Notes */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-semibold">
              Notes
            </h2>

            <textarea
              value={form.notes}
              onChange={(e) =>
                updateForm("notes", e.target.value)
              }
              rows={4}
              placeholder="Payment instructions, additional notes, etc."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </section>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">

            <Link
              href="/sub-invoices"
              className="cursor-pointer rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm"
            >
              Cancel
            </Link>

            <button
              type="button"
              onClick={handleSave}
              disabled={
                saving ||
                loadingSupplier ||
                loadingPOs ||
                !currentUID
              }
              className="btn-primary cursor-pointer rounded-lg bg-[#14243A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#D6A64B] hover:text-[#14243A] hover:shadow-md"
            >
              {saving ? "Creating..." : "Create Invoice"}
            </button>

          </div>

          {/* PDF */}
          {savedInvoice && (
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Invoice PDF
                </h2>

                <PDFDownloadLink
                  document={
                    <SubinvoicePDF invoice={pdfData} />
                  }
                  fileName={`${form.invoiceNumber || "invoice"}.pdf`}
                  className="btn-primary cursor-pointer rounded-lg bg-[#14243A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#D6A64B] hover:text-[#14243A] hover:shadow-md"
                >
                  {({ loading }) =>
                    loading
                      ? "Preparing PDF..."
                      : "Download PDF"
                  }
                </PDFDownloadLink>
              </div>

              <div className="overflow-hidden rounded-lg border">
                <PDFViewer
                  width="100%"
                  height={800}
                  showToolbar
                >
                  <SubinvoicePDF invoice={pdfData} />
                </PDFViewer>
              </div>

            </section>
          )}

        </div>
      </div>
    </div>
  );
}
