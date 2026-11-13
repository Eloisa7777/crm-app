
"use client";

// ============================================================
// Sub-Invoice - Detail / Edit Page
//
// Authentication:
// 1. Use /api/me to read verified server session (yj_session).
// 2. Do not depend on Firebase client auth.currentUser.
// 3. Only load the current user's Issued POs.
// 4. Verify invoice ownership before displaying/editing.
// 5. Re-verify PO ownership and status before saving.
//
// Firestore collection: subInvoices
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

  return `INV-${String(short).trim()}${day}${month}${year.slice(-2)}`;
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

const normaliseItems = (items) =>
  Array.isArray(items) && items.length
    ? items.map((item) => ({
        description: item?.description || "",
        qty: Number(item?.qty) || 0,
        unitPrice: item?.unitPrice ?? "",
        tax: Number(item?.tax) || 0,
      }))
    : [{ description: "", qty: 1, unitPrice: "", tax: 0 }];

function getPONumber(data) {
  return String(
    data.poNumber ||
      data.purchaseOrderNumber ||
      data.orderNumber ||
      data.number ||
      ""
  ).trim();
}

// ============================================================
// 2. Component
// ============================================================

export default function SubInvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params?.id;

  // ----------------------------------------------------------
  // Verified server session
  // ----------------------------------------------------------

  const [sessionUser, setSessionUser] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState("");

  // ----------------------------------------------------------
  // Invoice state
  // ----------------------------------------------------------

  const [invoice, setInvoice] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // ----------------------------------------------------------
  // Purchase Orders
  // ----------------------------------------------------------

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loadingPOs, setLoadingPOs] = useState(true);
  const [poLoadError, setPoLoadError] = useState("");

  // ----------------------------------------------------------
  // Supplier
  // ----------------------------------------------------------

  const [supplier, setSupplier] = useState(EMPTY_SUPPLIER);

  // ----------------------------------------------------------
  // Form
  // ----------------------------------------------------------

  const [form, setForm] = useState({
    invoiceNumber: "",
    invoiceDate: "",
    dueDate: "",
    status: "Draft",
    poNumber: "",
    purchaseOrderId: "",
    projectId: "",
    projectName: "",
    siteAddress: "",
    scopeOfWork: "",
    items: [{ description: "", qty: 1, unitPrice: "", tax: 0 }],
    notes: "",
  });

  // ==========================================================
  // 3. Load verified server session
  //
  // Reads UID and role from /api/me.
  // /api/me verifies the HttpOnly yj_session cookie.
  // ==========================================================

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        setSessionLoading(true);
        setSessionError("");

        const response = await fetch("/api/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || !data.authenticated || !data.uid) {
          throw new Error(
            data.error || "Your login session is invalid or expired."
          );
        }

        if (!active) return;

        setSessionUser({
          uid: data.uid,
          email: data.email || "",
          role: data.role || "",
        });
      } catch (err) {
        console.error("Failed to load CRM session:", err);

        if (active) {
          setSessionUser(null);
          setSessionError(
            err.message || "Unable to verify your login session."
          );
        }
      } finally {
        if (active) {
          setSessionLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      active = false;
    };
  }, []);

  // ==========================================================
  // 4. Load current user's Issued Purchase Orders
  //
  // Only show POs where:
  // 1. PO status === Issued
  // 2. Supplier/Subcontractor UID === session UID
  // 3. supplierType matches the correct collection
  // ==========================================================

  useEffect(() => {
    let active = true;

    async function loadPurchaseOrders() {
      if (!sessionUser?.uid) {
        setPurchaseOrders([]);
        setLoadingPOs(false);
        return;
      }

      try {
        setLoadingPOs(true);
        setPoLoadError("");

        const currentUID = sessionUser.uid;

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

        // Supplier documents owned by current user.
        const ownSuppliers = new Set(
          suppliersSnapshot.docs
            .filter((supplierDoc) => {
              return supplierDoc.data().uid === currentUID;
            })
            .map((supplierDoc) => supplierDoc.id)
        );

        // Subcontractor documents owned by current user.
        const ownSubcontractors = new Set(
          subcontractorsSnapshot.docs
            .filter((supplierDoc) => {
              return supplierDoc.data().uid === currentUID;
            })
            .map((supplierDoc) => supplierDoc.id)
        );

        const orders = poSnapshot.docs
          .map((poDoc) => {
            const data = poDoc.data();

            return {
              id: poDoc.id,
              ...data,
              poNumber: getPONumber(data),
            };
          })
          .filter((order) => {
            if (order.status !== "Issued") return false;

            if (!order.supplierId || !order.poNumber) {
              return false;
            }

            if (order.supplierType === "Supplier") {
              return ownSuppliers.has(order.supplierId);
            }

            if (order.supplierType === "Subcontractor") {
              return ownSubcontractors.has(order.supplierId);
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
        console.error("Failed to load Purchase Orders:", err);

        if (active) {
          setPoLoadError(
            err.message || "Failed to load Purchase Orders."
          );
        }
      } finally {
        if (active) {
          setLoadingPOs(false);
        }
      }
    }

    if (sessionLoading) return;

    if (!sessionUser?.uid) {
      setPurchaseOrders([]);
      setLoadingPOs(false);
      return;
    }

    loadPurchaseOrders();

    return () => {
      active = false;
    };
  }, [sessionUser, sessionLoading]);

  // ==========================================================
  // 5. Load current Sub-Invoice
  //
  // Ordinary users can only access their own invoices.
  // Admin can access all invoices.
  // ==========================================================

  useEffect(() => {
    let active = true;

    async function loadSubInvoice() {
      if (sessionLoading) return;

      if (!sessionUser?.uid) {
        setLoading(false);
        setError(
          sessionError || "Please log in to view this invoice."
        );
        return;
      }

      if (!invoiceId) {
        setLoading(false);
        setError("Invoice ID is missing.");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const snapshot = await getDoc(
          doc(db, "subInvoices", String(invoiceId))
        );

        if (!snapshot.exists()) {
          if (active) {
            setInvoice(null);
            setError("Invoice not found.");
          }
          return;
        }

        const data = {
          id: snapshot.id,
          ...snapshot.data(),
        };

        if (!active) return;

        // Verify invoice ownership.
        const isAdmin = sessionUser.role === "admin";
        const isOwner = data.uid === sessionUser.uid;

        if (!isAdmin && !isOwner) {
          setInvoice(null);
          setError(
            "You do not have permission to access this invoice."
          );
          return;
        }

        setInvoice(data);

        setSupplier({
          ...EMPTY_SUPPLIER,
          ...(data.supplier || {}),
          accountName:
            data.supplier?.accountName ||
            data.supplier?.bankName ||
            data.supplier?.name ||
            "",
        });

        setForm({
          invoiceNumber: data.invoiceNumber || "",
          invoiceDate: data.invoiceDate || data.date || "",
          dueDate: data.dueDate || "",
          status: data.status || "Draft",
          poNumber: data.poNumber || "",
          purchaseOrderId: data.purchaseOrderId || "",
          projectId: data.projectId || "",
          projectName: data.projectName || "",
          siteAddress: data.siteAddress || "",
          scopeOfWork: data.scopeOfWork || "",
          items: normaliseItems(data.items),
          notes: data.notes || "",
        });
      } catch (err) {
        console.error("Failed to load Sub-Invoice:", err);

        if (active) {
          setError(err.message || "Failed to load Invoice.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSubInvoice();

    return () => {
      active = false;
    };
  }, [invoiceId, sessionUser, sessionLoading, sessionError]);

  // ==========================================================
  // 6. Selected Purchase Order
  // ==========================================================

  const selectedPurchaseOrder = purchaseOrders.find(
    (order) => order.id === form.purchaseOrderId
  );

  // ==========================================================
  // 7. Form handlers
  // ==========================================================

  function updateForm(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setSaved(false);
  }

  function handleInvoiceDateChange(value) {
    setForm((previous) => ({
      ...previous,
      invoiceDate: value,
      dueDate: addDaysToDate(value, 20),
      invoiceNumber: supplier.short
        ? generateInvoiceNumber(supplier.short, value)
        : previous.invoiceNumber,
    }));

    setSaved(false);
  }

  function updateSupplier(field, value) {
    setSupplier((previous) => ({
      ...previous,
      [field]: value,
    }));

    setSaved(false);
  }

  function updateItem(index, field, value) {
    setForm((previous) => ({
      ...previous,
      items: previous.items.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [field]: value }
          : item
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
      items: previous.items.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));

    setSaved(false);
  }

  // ==========================================================
  // 8. Verify PO ownership and status
  //
  // Uses verified session UID, not Firebase client auth.
  // ==========================================================

  async function verifyPurchaseOrder(purchaseOrderId) {
    if (!sessionUser?.uid) {
      throw new Error("You must be logged in.");
    }

    if (!purchaseOrderId) {
      throw new Error("Please select a Purchase Order.");
    }

    const poRef = doc(
      db,
      "purchaseOrders",
      purchaseOrderId
    );

    const poSnapshot = await getDoc(poRef);

    if (!poSnapshot.exists()) {
      throw new Error("Purchase Order not found.");
    }

    const order = {
      id: poSnapshot.id,
      ...poSnapshot.data(),
    };

    // Check latest PO status.
    if (order.status !== "Issued") {
      throw new Error(
        "Only Issued Purchase Orders can be used for Sub-Invoices."
      );
    }

    if (!order.supplierId) {
      throw new Error(
        "The selected PO does not have a supplierId."
      );
    }

    const collectionName =
      order.supplierType === "Subcontractor"
        ? "Subcontractors"
        : order.supplierType === "Supplier"
          ? "Suppliers"
          : "";

    if (!collectionName) {
      throw new Error("Invalid Purchase Order supplierType.");
    }

    const supplierSnapshot = await getDoc(
      doc(db, collectionName, order.supplierId)
    );

    if (!supplierSnapshot.exists()) {
      throw new Error(
        `${collectionName} document not found.`
      );
    }

    const supplierData = supplierSnapshot.data();

    // Check linked supplier UID against verified session UID.
    if (
      !supplierData.uid ||
      supplierData.uid !== sessionUser.uid
    ) {
      throw new Error(
        "You do not have permission to access this Purchase Order."
      );
    }

    return {
      order: {
        ...order,
        poNumber: getPONumber(order),
      },
      supplierData,
      collectionName,
    };
  }

  // ==========================================================
  // 9. Change PO and reload linked information
  // ==========================================================

  async function handlePurchaseOrderChange(purchaseOrderId) {
    if (!purchaseOrderId) {
      setError("Please select a Purchase Order.");
      return;
    }

    // Only allow PO currently shown in the filtered dropdown.
    const allowedPO = purchaseOrders.find(
      (order) => order.id === purchaseOrderId
    );

    if (!allowedPO) {
      setError(
        "This Purchase Order is not available for your account."
      );
      return;
    }

    try {
      setError("");
      setSaved(false);

      const { order, supplierData } =
        await verifyPurchaseOrder(purchaseOrderId);

      const poItems = Array.isArray(order.items)
        ? order.items
        : [];

      const nextSupplier = {
        name: supplierData.name || "",
        short: supplierData.short || "",
        abn: supplierData.abn || "",
        address: supplierData.address || "",
        contact: order.supplier?.contact || "",
        email: order.supplier?.email || "",
        phone: order.supplier?.phone || "",
        bankName: supplierData.bankName || "",
        bankAccount: supplierData.bankAccount || "",
        BSB: supplierData.BSB || "",
        accountName:
          supplierData.accountName ||
          supplierData.bankName ||
          supplierData.name ||
          "",
      };

      setSupplier(nextSupplier);

      setForm((previous) => ({
        ...previous,
        purchaseOrderId: order.id,
        poNumber: order.poNumber,
        projectId: order.projectId || "",
        projectName: order.projectName || "",
        siteAddress: order.siteAddress || "",
        scopeOfWork: order.scopeOfWork || "",

        items: poItems.length
          ? poItems.map((item) => ({
              description: item.description || "",
              qty: Number(item.qty) || 0,
              unitPrice: item.unitPrice ?? "",
              tax: Number(item.tax) || 0,
            }))
          : [
              {
                description: "",
                qty: 1,
                unitPrice: "",
                tax: 0,
              },
            ],

        invoiceNumber: nextSupplier.short
          ? generateInvoiceNumber(
              nextSupplier.short,
              previous.invoiceDate
            )
          : previous.invoiceNumber,
      }));
    } catch (err) {
      console.error("Failed to reload Supplier:", err);

      setSupplier(EMPTY_SUPPLIER);

      setForm((previous) => ({
        ...previous,
        purchaseOrderId: "",
        poNumber: "",
        invoiceNumber: "",
      }));

      setError(
        err.message || "Failed to load Supplier information."
      );
    }
  }

  // ==========================================================
  // 10. Calculations
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
  // 11. PDF data
  // ==========================================================

  const pdfData = {
    id: invoice?.id || invoiceId || "",
    invoiceType: "sub-invoice",
    invoiceNumber: form.invoiceNumber,
    invoiceDate: form.invoiceDate,
    dueDate: form.dueDate,
    status: form.status,
    poNumber: form.poNumber,
    purchaseOrderId: form.purchaseOrderId,

    supplierType:
      selectedPurchaseOrder?.supplierType ||
      invoice?.supplierType ||
      "",

    supplierId:
      selectedPurchaseOrder?.supplierId ||
      invoice?.supplierId ||
      "",

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
  // 12. Cancel editing
  // ==========================================================

  function handleCancel() {
    if (!invoice) return;

    setSupplier({
      ...EMPTY_SUPPLIER,
      ...(invoice.supplier || {}),
      accountName:
        invoice.supplier?.accountName ||
        invoice.supplier?.bankName ||
        invoice.supplier?.name ||
        "",
    });

    setForm({
      invoiceNumber: invoice.invoiceNumber || "",
      invoiceDate: invoice.invoiceDate || invoice.date || "",
      dueDate: invoice.dueDate || "",
      status: invoice.status || "Draft",
      poNumber: invoice.poNumber || "",
      purchaseOrderId: invoice.purchaseOrderId || "",
      projectId: invoice.projectId || "",
      projectName: invoice.projectName || "",
      siteAddress: invoice.siteAddress || "",
      scopeOfWork: invoice.scopeOfWork || "",
      items: normaliseItems(invoice.items),
      notes: invoice.notes || "",
    });

    setEditing(false);
    setError("");
    setSaved(false);
  }

  // ==========================================================
  // 13. Save changes
  // ==========================================================

  async function handleSave() {
    setError("");

    if (!sessionUser?.uid) {
      setError("Your login session has expired. Please log in again.");
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

    if (!invoiceId || !invoice) {
      setError("Invoice ID is missing.");
      return;
    }

    try {
      setSaving(true);

      // ------------------------------------------------------
      // Re-check invoice ownership before updating.
      // ------------------------------------------------------

      const latestInvoiceSnapshot = await getDoc(
        doc(db, "subInvoices", String(invoiceId))
      );

      if (!latestInvoiceSnapshot.exists()) {
        throw new Error("This invoice no longer exists.");
      }

      const latestInvoice = latestInvoiceSnapshot.data();

      const isAdmin = sessionUser.role === "admin";
      const isOwner = latestInvoice.uid === sessionUser.uid;

      if (!isAdmin && !isOwner) {
        throw new Error(
          "You do not have permission to edit this invoice."
        );
      }

      // ------------------------------------------------------
      // Re-verify PO ownership and status before saving.
      // ------------------------------------------------------

      let verifiedOrder = null;
      let verifiedSupplierData = null;

      if (form.purchaseOrderId) {
        const verification = await verifyPurchaseOrder(
          form.purchaseOrderId
        );

        verifiedOrder = verification.order;
        verifiedSupplierData = verification.supplierData;
      }

      // ------------------------------------------------------
      // Recalculate invoice items.
      // ------------------------------------------------------

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

      const cleanSubtotal = cleanItems.reduce(
        (sum, item) => sum + item.total,
        0
      );

      const cleanGst = cleanSubtotal * 0.1;
      const cleanTotal = cleanSubtotal + cleanGst;

      // ------------------------------------------------------
      // Save updated invoice.
      //
      // Keep original uid. Do not replace invoice owner UID
      // with another value during editing.
      // ------------------------------------------------------

      const updatedData = {
        invoiceType: "sub-invoice",

        invoiceNumber: form.invoiceNumber.trim(),
        invoiceDate: form.invoiceDate,
        dueDate: form.dueDate || "",
        status: form.status || "Draft",

        purchaseOrderId: verifiedOrder?.id || "",
        poNumber: verifiedOrder?.poNumber || "",

        supplierType:
          verifiedOrder?.supplierType || "",

        supplierId:
          verifiedOrder?.supplierId || "",

        supplier: {
          name: supplier.name || "",
          short: supplier.short || "",
          abn: supplier.abn || "",
          address: supplier.address || "",
          contact: supplier.contact || "",
          email: supplier.email || "",
          phone: supplier.phone || "",
          bankName:
            supplier.bankName ||
            verifiedSupplierData?.bankName ||
            "",
          bankAccount:
            supplier.bankAccount ||
            verifiedSupplierData?.bankAccount ||
            "",
          BSB:
            supplier.BSB ||
            verifiedSupplierData?.BSB ||
            "",
          accountName: supplier.accountName || "",
        },

        projectId: form.projectId || "",
        projectName: form.projectName || "",
        siteAddress: form.siteAddress || "",
        scopeOfWork: form.scopeOfWork || "",

        items: cleanItems,
        subtotal: cleanSubtotal,
        gst: cleanGst,
        total: cleanTotal,

        notes: form.notes || "",
        updatedAt: serverTimestamp(),
      };

      await updateDoc(
        doc(db, "subInvoices", String(invoiceId)),
        updatedData
      );

      // ------------------------------------------------------
      // Update local state.
      // ------------------------------------------------------

      const localUpdatedData = {
        ...updatedData,
        updatedAt: new Date(),
      };

      setInvoice((previous) => ({
        ...previous,
        ...localUpdatedData,
      }));

      setForm((previous) => ({
        ...previous,
        items: cleanItems.map(
          ({ description, qty, unitPrice, tax }) => ({
            description,
            qty,
            unitPrice,
            tax,
          })
        ),
      }));

      setEditing(false);
      setSaved(true);
    } catch (err) {
      console.error("Failed to save Sub-Invoice:", err);

      setError(
        err.message || "Failed to save Invoice."
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================================
  // 14. Loading / authentication / not found
  // ==========================================================

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <p className="text-gray-500">
          {sessionLoading
            ? "Verifying login session..."
            : "Loading Invoice..."}
        </p>
      </div>
    );
  }

  if (!sessionUser) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-3xl rounded-xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">
            Login Required
          </h1>

          <p className="mt-3 text-sm text-red-600">
            {sessionError || "Please log in to continue."}
          </p>

          <Link
            href="/login"
            className="mt-5 inline-block rounded-lg bg-indigo-800 px-5 py-2.5 text-sm text-white"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="general-page min-h-screen p-8">
        <Link
          href="/sub-invoices"
          className="text-sm text-gray-500"
        >
          ← Invoices
        </Link>

        <div className="mt-6 rounded-xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">
            Invoice Not Found
          </h1>

          <p className="mt-2 text-gray-500">
            {error || "This Invoice could not be found."}
          </p>

          <p className="mt-4 text-sm text-gray-400">
            Document ID: {invoiceId}
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // 15. Reusable field
  // ==========================================================

  function renderField(
    label,
    value,
    onChange,
    multiline = false
  ) {
    return (
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {label}
        </label>

        {editing ? (
          multiline ? (
            <textarea
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          ) : (
            <input
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          )
        ) : (
          <p className="whitespace-pre-wrap rounded-lg bg-gray-50 px-3 py-2 text-sm">
            {value || "-"}
          </p>
        )}
      </div>
    );
  }

  // ==========================================================
  // 16. Page UI
  // ==========================================================

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/sub-invoices"
              className="text-sm text-gray-500 hover:text-black"
            >
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
                className="btn-primary cursor-pointer rounded-lg bg-[#14243A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#D6A64B] hover:text-[#14243A] hover:shadow-md"
              >
                Edit
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary cursor-pointer rounded-lg bg-[#14243A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#D6A64B] hover:text-[#14243A] hover:shadow-md"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Success message */}
        {saved && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            Invoice changes saved successfully.
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Invoice Information */}
        <section className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold">
            Invoice Information
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {renderField(
              "Invoice Number",
              form.invoiceNumber,
              (v) => updateForm("invoiceNumber", v)
            )}

            <div>
              <label className="mb-1 block text-sm font-medium">
                Status
              </label>

              {editing ? (
                <select
                  value={form.status}
                  onChange={(e) =>
                    updateForm("status", e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  {[
                    "Draft",
                    "Issued",
                    "Paid",
                    "Overdue",
                    "Cancelled",
                  ].map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  {form.status}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Invoice Date
              </label>

              {editing ? (
                <input
                  type="date"
                  value={form.invoiceDate}
                  onChange={(e) =>
                    handleInvoiceDateChange(e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              ) : (
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  {form.invoiceDate || "-"}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Due Date
              </label>

              {editing ? (
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    updateForm("dueDate", e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              ) : (
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  {form.dueDate || "-"}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                PO Number
              </label>

              {editing && !loadingPOs ? (
                <select
                  value={form.purchaseOrderId}
                  onChange={(e) =>
                    handlePurchaseOrderChange(e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">
                    Select PO Number
                  </option>

                  {purchaseOrders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.poNumber}
                    </option>
                  ))}
                </select>
              ) : editing && loadingPOs ? (
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500">
                  Loading Purchase Orders...
                </p>
              ) : (
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  {form.poNumber || "-"}
                </p>
              )}

              {editing && poLoadError && (
                <p className="mt-1 text-sm text-red-600">
                  {poLoadError}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Send From */}
        <section className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold">
            Send From
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
                {renderField(
                  label,
                  supplier[field],
                  (value) => updateSupplier(field, value)
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Project Information */}
        <section className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold">
            Project Information
          </h2>

          <div className="space-y-4">
            {renderField(
              "Project",
              form.projectName,
              (v) => updateForm("projectName", v)
            )}

            {renderField(
              "Site Address",
              form.siteAddress,
              (v) => updateForm("siteAddress", v)
            )}

            {renderField(
              "Scope of Work",
              form.scopeOfWork,
              (v) => updateForm("scopeOfWork", v),
              true
            )}
          </div>
        </section>

        {/* Invoice Items */}
        <section className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Invoice Items
            </h2>

            {editing && (
              <button
                type="button"
                onClick={addItem}
                className="rounded-lg bg-indigo-800 px-4 py-2 text-sm text-white"
              >
                + Add Item
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 pr-3">Description</th>
                  <th className="w-24 pb-3 pr-3">Qty</th>
                  <th className="w-36 pb-3 pr-3">Unit Price</th>
                  <th className="w-24 pb-3 pr-3">Tax %</th>
                  <th className="w-36 pb-3 pr-3">Total</th>

                  {editing && (
                    <th className="w-20 pb-3"></th>
                  )}
                </tr>
              </thead>

              <tbody>
                {calculatedItems.map((item, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-100"
                  >
                    <td className="py-3 pr-3">
                      {editing ? (
                        <input
                          value={item.description}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "description",
                              e.target.value
                            )
                          }
                          className="w-full rounded-lg border px-3 py-2"
                        />
                      ) : (
                        item.description || "-"
                      )}
                    </td>

                    <td className="py-3 pr-3">
                      {editing ? (
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
                          className="w-full rounded-lg border px-3 py-2"
                        />
                      ) : (
                        item.qty
                      )}
                    </td>

                    <td className="py-3 pr-3">
                      {editing ? (
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
                          className="w-full rounded-lg border px-3 py-2"
                        />
                      ) : (
                        `$${money(item.unitPrice)}`
                      )}
                    </td>

                    <td className="py-3 pr-3">
                      {editing ? (
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
                          className="w-full rounded-lg border px-3 py-2"
                        />
                      ) : (
                        `${item.tax}%`
                      )}
                    </td>

                    <td className="py-3 pr-3 font-medium">
                      ${money(item.total)}
                    </td>

                    {editing && (
                      <td className="py-3">
                        {form.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600"
                          >
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
        <section className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold">
            Notes
          </h2>

          {editing ? (
            <textarea
              value={form.notes}
              onChange={(e) =>
                updateForm("notes", e.target.value)
              }
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm">
              {form.notes || "-"}
            </p>
          )}
        </section>

        {/* PDF Preview */}
        {!editing && (
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Invoice PDF
              </h2>

              <PDFDownloadLink
                document={
                  <SubinvoicePDF invoice={pdfData} />
                }
                fileName={`${form.invoiceNumber || "invoice"}.pdf`}
                className="rounded-lg bg-indigo-800 px-5 py-2.5 text-sm text-white"
              >
                {({ loading: pdfLoading }) =>
                  pdfLoading
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
  );
}
