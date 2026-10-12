"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

export default function BillDetailPage() {
  const params = useParams();
  const billId = params?.id;

  const [bill, setBill] = useState(null);

  /* =====================================================
     Projects
  ===================================================== */

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  /* =====================================================
     Purchase Orders
  ===================================================== */

  const [POs, setPOs] = useState([]);
  const [loadingPOs, setLoadingPOs] = useState(false);

  /* =====================================================
     Supplier / Subcontractor
  ===================================================== */

  const [supplierType, setSupplierType] = useState("Supplier");
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");

  /* =====================================================
     Form
  ===================================================== */

  const emptyContact = {
    id: "",
    name: "",
    abn: "",
    contact: "",
    email: "",
    phone: "",
    address: "",
  };

  const [form, setForm] = useState({
    billNumber: "",
    projectId: "",
    projectName: "",
    status: "Awaiting Payment",
    billDate: "",
    dueDate: "",
    poId: "",
    poNumber: "",
    supplierType: "Supplier",
    supplierId: "",
    supplier: { ...emptyContact },
    client: { ...emptyContact },
    clientId: "",
    items: [],
    notes: "",
    accountManager: "",
    accountManagerEmail: "",
  });

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  /* =====================================================
     Helpers
  ===================================================== */

  function normaliseContact(record) {
    if (typeof record === "string") {
      return {
        ...emptyContact,
        name: record,
      };
    }

    const data =
      record && typeof record === "object" ? record : {};

    return {
      id: data.id || "",
      name: data.name || data.companyName || "",
      abn: data.abn || "",
      contact: data.contact || data.contactName || "",
      email: data.email || "",
      phone: data.phone || "",
      address: data.address || "",
    };
  }

function normaliseItems(items) {
  if (!Array.isArray(items)) return [];

  return items.map((item) => ({
    description: item?.description || "",
    qty: Number(item?.qty ?? item?.quantity) || 0,
    unitPrice: Number(item?.unitPrice ?? item?.rate) || 0,
    // 兼容旧数据：true 或 10 表示勾选 GST
    tax:
      typeof item?.tax === "boolean"
        ? item.tax
        : Number(item?.tax) > 0,
  }));
}

  function getProjectName(project) {
    return (
      project?.projectName ||
      project?.name ||
      project?.title ||
      ""
    );
  }

  function getPONumber(po) {
    return (
      po?.poNumber ||
      po?.purchaseOrderNumber ||
      po?.number ||
      po?.orderNumber ||
      ""
    );
  }

  function getPOValue(po) {
    // Store the PO document ID as the reference.
    return po.id;
  }

  function formatCurrency(value) {
    return Number(value || 0).toLocaleString("en-AU", {
      style: "currency",
      currency: "AUD",
    });
  }

  function getInitialForm(data) {
    const legacyClient = normaliseContact(
      data.client || data.clientName || ""
    );

    const existingSupplier = normaliseContact(
      data.supplier || {}
    );

    const hasSupplier =
      Boolean(data.supplierId) ||
      Boolean(existingSupplier.id) ||
      Boolean(existingSupplier.name);

    const initialSupplierType =
      data.supplierType === "Subcontractor"
        ? "Subcontractor"
        : "Supplier";

    const initialSupplier = hasSupplier
      ? existingSupplier
      : legacyClient;

    const initialSupplierId =
      data.supplierId ||
      existingSupplier.id ||
      data.clientId ||
      legacyClient.id ||
      "";

    return {
      billNumber: data.billNumber || "",
      projectId: data.projectId || "",
      projectName: data.projectName || "",
      status: data.status || "Awaiting Payment",
      billDate: data.billDate || data.date || "",
      dueDate: data.dueDate || "",
      poNumber:
        data.poNumber ||
        data.PONumber ||
        "",
      poId: data.poId || "",
      supplierType: initialSupplierType,
      supplierId: initialSupplierId,
      supplier: {
        ...initialSupplier,
        id: initialSupplierId,
      },
      client: legacyClient,
      clientId: data.clientId || legacyClient.id || "",
      items: normaliseItems(data.items),
      notes: data.notes || "",
      accountManager:
        data.accountManager ||
        data.projectManager ||
        "",
      accountManagerEmail:
        data.accountManagerEmail ||
        data.projectManagerEmail ||
        "",
    };
  }

  /* =====================================================
     Load Projects
  ===================================================== */

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      setLoadingProjects(true);

      try {
        const snapshot = await getDocs(
          collection(db, "projects")
        );

        const data = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        if (!cancelled) {
          setProjects(data);
        }
      } catch (err) {
        console.error("Failed to load projects:", err);

        if (!cancelled) {
          setError("Failed to load projects.");
        }
      } finally {
        if (!cancelled) {
          setLoadingProjects(false);
        }
      }
    }

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =====================================================
     Load Purchase Orders
  ===================================================== */

  useEffect(() => {
    let cancelled = false;

    async function loadPOs() {
      setLoadingPOs(true);

      try {
        const snapshot = await getDocs(
          collection(db, "purchaseOrders")
        );

        const records = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        if (!cancelled) {
          setPOs(records);
        }
      } catch (err) {
        console.error("Failed to load purchase orders:", err);

        if (!cancelled) {
          setError("Failed to load purchase orders.");
        }
      } finally {
        if (!cancelled) {
          setLoadingPOs(false);
        }
      }
    }

    loadPOs();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =====================================================
     Load Bill
  ===================================================== */

  useEffect(() => {
    let cancelled = false;

    async function loadBill() {
      if (!billId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const billRef = doc(db, "bills", billId);
        const snapshot = await getDoc(billRef);

        if (cancelled) return;

        if (!snapshot.exists()) {
          setBill(null);
          setError("Bill not found.");
          return;
        }

        const data = {
          id: snapshot.id,
          ...snapshot.data(),
        };

        const initialForm = getInitialForm(data);

        setBill(data);
        setForm(initialForm);
        setSupplierType(initialForm.supplierType);
        setSelectedSupplierId(initialForm.supplierId);
      } catch (err) {
        console.error("Failed to load bill:", err);

        if (!cancelled) {
          setError(err.message || "Failed to load bill.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadBill();

    return () => {
      cancelled = true;
    };
  }, [billId]);

  /* =====================================================
     Load Suppliers / Subcontractors
  ===================================================== */

  useEffect(() => {
    let cancelled = false;

    async function loadSuppliers() {
      setLoadingSuppliers(true);

      try {
        const collectionName =
          supplierType === "Subcontractor"
            ? "Subcontractors"
            : "Suppliers";

        const snapshot = await getDocs(
          collection(db, collectionName)
        );

        const records = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        if (!cancelled) {
          setSuppliers(records);
        }
      } catch (err) {
        console.error("Failed to load suppliers:", err);

        if (!cancelled) {
          setError(
            `Failed to load ${supplierType.toLowerCase()} records.`
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingSuppliers(false);
        }
      }
    }

    loadSuppliers();

    return () => {
      cancelled = true;
    };
  }, [supplierType]);

  /* =====================================================
     Totals
     Item GST is included in each line total.
     Additional GST is calculated on the pre-GST amount.
  ===================================================== */

  const totals = useMemo(() => {
    const itemSubtotal = form.items.reduce((sum, item) => {
      const qty = Number(item?.qty) || 0;
      const unitPrice = Number(item?.unitPrice) || 0;

      return sum + qty * unitPrice;
    }, 0);

    const itemGST = form.items.reduce((sum, item) => {
      const qty = Number(item?.qty) || 0;
      const unitPrice = Number(item?.unitPrice) || 0;

      return sum + (
        item?.tax === true
          ? qty * unitPrice * 0.1
          : 0
      );
    }, 0);

    return {
      itemSubtotal,
      itemGST,
      total: itemSubtotal + itemGST,
    };
  }, [form.items]);

  /* =====================================================
     Generic Form Update
  ===================================================== */

  function updateForm(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setSaved(false);
  }

  /* =====================================================
     Supplier Type Update
  ===================================================== */

  function handleSupplierTypeChange(value) {
    setSupplierType(value);
    setSelectedSupplierId("");

    setForm((prev) => ({
      ...prev,
      supplierType: value,
      supplierId: "",
      poId: "",
      supplier: { ...emptyContact },
    }));

    setSaved(false);
    setError("");
  }

  /* =====================================================
     Supplier Selection
  ===================================================== */

  function handleSupplierChange(supplierId) {
    setSelectedSupplierId(supplierId);

    const selected =
      suppliers.find((item) => item.id === supplierId) || null;

    const supplier = normaliseContact(selected);

    setForm((prev) => ({
      ...prev,
      supplierType,
      supplierId,
      poId: prev.poId || "",
      supplier: {
        ...supplier,
        id: supplierId,
      },
    }));

    setSaved(false);
    setError("");
  }

  /* =====================================================
     Project Update
  ===================================================== */

  function handleProjectChange(projectId) {
    const project = projects.find(
      (item) => item.id === projectId
    );

    setForm((prev) => ({
      ...prev,
      projectId,
      projectName: getProjectName(project),
    }));

    setSaved(false);
  }

  /* =====================================================
     PO Selection
  ===================================================== */

  function handlePOChange(poId) {
    const selectedPO = POs.find(
      (po) => po.id === poId
    );

    setForm((prev) => ({
      ...prev,
      poId: selectedPO?.id || "",
      poNumber: selectedPO
        ? getPONumber(selectedPO) || selectedPO.id
        : "",
    }));

    setSaved(false);
  }

  /* =====================================================
     Supplier Field Update
  ===================================================== */

  function updateSupplier(field, value) {
    setForm((prev) => ({
      ...prev,
      supplier: {
        ...prev.supplier,
        [field]: value,
      },
    }));

    setSaved(false);
  }

  /* =====================================================
     Item Update
  ===================================================== */

  function updateItem(index, field, value) {
    setForm((prev) => {
      const items = [...prev.items];

      items[index] = {
        ...items[index],
        [field]:
          field === "description" ? value : value,
      };

      return {
        ...prev,
        items,
      };
    });

    setSaved(false);
  }

  /* =====================================================
     Add Item
  ===================================================== */

  function addItem() {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          description: "",
          qty: 1,
          unitPrice: 0,
          tax: true,
        },
      ],
    }));

    setSaved(false);
  }

  /* =====================================================
     Remove Item
  ===================================================== */

  function removeItem(index) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));

    setSaved(false);
  }

  /* =====================================================
     Save
  ===================================================== */

  async function handleSave() {
    try {
      setSaving(true);
      setSaved(false);
      setError("");

      if (!billId) {
        throw new Error("Bill ID is missing.");
      }

      if (!form.projectId) {
        throw new Error("Please select a project.");
      }

      if (!form.billNumber.trim()) {
        throw new Error("Please enter a bill number.");
      }

      if (!form.supplierType) {
        throw new Error("Please select a supplier type.");
      }

      if (!form.supplierId) {
        throw new Error(
          "Please select a supplier or subcontractor before saving."
        );
      }

      const selectedRecord = suppliers.find(
        (item) => item.id === form.supplierId
      );

      if (!selectedRecord) {
        throw new Error(
          "The selected supplier or subcontractor could not be found. Please select it again."
        );
      }

      const cleanSupplier = {
        id: selectedRecord.id,
        name:
          form.supplier.name ||
          selectedRecord.name ||
          selectedRecord.companyName ||
          "",
        abn:
          form.supplier.abn ||
          selectedRecord.abn ||
          "",
        contact:
          form.supplier.contact ||
          selectedRecord.contact ||
          selectedRecord.contactName ||
          "",
        email:
          form.supplier.email ||
          selectedRecord.email ||
          "",
        phone:
          form.supplier.phone ||
          selectedRecord.phone ||
          "",
        address:
          form.supplier.address ||
          selectedRecord.address ||
          "",
      };


      const cleanItems = form.items.map((item) => {
        const qty = Number(item?.qty) || 0;
        const unitPrice = Number(item?.unitPrice) || 0;
        const tax = Boolean(item?.tax);

        const lineSubtotal = qty * unitPrice;
        const lineGST = tax ? lineSubtotal * 0.1 : 0;

        return {
          description: item?.description || "",
          qty,
          unitPrice,
          tax,
          total: lineSubtotal + lineGST,
        };
      });

      const cleanItemSubtotal = cleanItems.reduce(
        (sum, item) => sum + item.qty * item.unitPrice,
        0
      );

      const cleanGst = cleanItems.reduce(
        (sum, item) =>
          sum +
          (item.tax
            ? item.qty * item.unitPrice * 0.1
            : 0),
        0
      );

      const cleanTotal = cleanItemSubtotal + cleanGst;


      const selectedProject = projects.find(
        (project) => project.id === form.projectId
      );

      const projectName =
        getProjectName(selectedProject) ||
        form.projectName ||
        "";

      const updatedData = {
        billNumber: form.billNumber.trim(),
        projectId: form.projectId,
        projectName: projectName.trim(),
        status: form.status || "Awaiting Payment",
        billDate: form.billDate || "",
        dueDate: form.dueDate || "",
        supplierType: form.supplierType,
        supplierId: cleanSupplier.id,
        supplier: cleanSupplier,
        poId: form.poId || "",
        poNumber: form.poNumber || "",
        items: cleanItems,
        notes: form.notes || "",
        accountManager: form.accountManager || "",
        accountManagerEmail: form.accountManagerEmail || "",
        subtotal: cleanItemSubtotal,
        gst: cleanGst,
        total: cleanTotal,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, "bills", billId), updatedData);

      setBill((prev) => ({
        ...prev,
        ...updatedData,
        updatedAt: new Date().toISOString(),
      }));

      setForm((prev) => ({
        ...prev,
        projectName,
        supplierType: form.supplierType,
        supplierId: cleanSupplier.id,
        poId: form.poId || "",
        supplier: cleanSupplier,
        items: cleanItems,
      }));

      setSelectedSupplierId(cleanSupplier.id);
      setEditing(false);
      setSaved(true);
    } catch (err) {
      console.error("Failed to save bill:", err);
      setError(err.message || "Failed to save bill.");
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     Cancel Editing
  ===================================================== */

  function handleCancel() {
    if (!bill) return;

    const initialForm = getInitialForm(bill);

    setForm(initialForm);
    setSupplierType(initialForm.supplierType);
    setSelectedSupplierId(initialForm.supplierId);

    setEditing(false);
    setSaved(false);
    setError("");
  }

  /* =====================================================
     Loading
  ===================================================== */

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-gray-500">Loading bill...</p>
        </div>
      </div>
    );
  }

  /* =====================================================
     Error / Not Found
  ===================================================== */

  if (!bill) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/bills"
            className="text-sm text-gray-500 hover:text-black"
          >
            ← Bills
          </Link>

          <div className="mt-6 rounded-xl bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold">Bill Not Found</h1>

            <p className="mt-2 text-gray-500">
              {error || "This bill could not be found."}
            </p>

            <p className="mt-4 text-sm text-gray-400">
              Bill ID: {billId}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* =====================================================
     Render
  ===================================================== */

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}

        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <Link
              href="/bills"
              className="text-sm text-gray-500 hover:text-black"
            >
              ← Bills
            </Link>

            <h1 className="mt-3 text-3xl font-bold">
              {form.billNumber || "Bill"}
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Bill ID: {bill.id}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                  setSaved(false);
                  setError("");
                }}
                className="cursor-pointer rounded-lg bg-indigo-800 px-5 py-2.5 text-sm font-medium text-gray-100 transition hover:bg-amber-400 hover:text-black"
              >
                Edit
              </button>
            )}

            {editing && (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={
                    saving ||
                    loadingProjects ||
                    loadingSuppliers ||
                    loadingPOs
                  }
                  className="cursor-pointer rounded-lg bg-indigo-800 px-5 py-2.5 text-sm font-medium text-gray-100 transition hover:bg-amber-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Saved Message */}

        {saved && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            Bill changes saved successfully.
          </div>
        )}

        {/* Error */}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Bill Management */}

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold">
              Bill Management
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Project and bill status
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Project */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Project Name (Reference)
              </label>

              {editing ? (
                loadingProjects ? (
                  <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                    Loading projects...
                  </p>
                ) : (
                  <select
                    value={form.projectId}
                    onChange={(e) =>
                      handleProjectChange(e.target.value)
                    }
                    className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-black focus:ring-1 focus:ring-black"
                  >
                    <option value="">Select project</option>

                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {getProjectName(project) || "Unnamed Project"}
                      </option>
                    ))}
                  </select>
                )
              ) : (
                <p className="rounded-lg bg-gray-50 px-4 py-3">
                  {form.projectName || "-"}
                </p>
              )}
            </div>

            {/* Status */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Status
              </label>

              {editing ? (
                <select
                  value={form.status}
                  onChange={(e) => updateForm("status", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3"
                >
                  <option value="Awaiting">Awaiting Payment</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Void">Void</option>
                </select>
              ) : (
                <p className="rounded-lg bg-gray-50 px-4 py-3">
                  {form.status || "-"}
                </p>
              )}
            </div>

          </div>
        </section>

        {/* Bill Information */}

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold">
            Bill Information
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
            <Field
              label="Bill Number"
              value={form.billNumber}
              editing={editing}
              onChange={(value) =>
                updateForm("billNumber", value)
              }
            />

            <Field
              label="Bill Date"
              type="date"
              value={form.billDate}
              editing={editing}
              onChange={(value) =>
                updateForm("billDate", value)
              }
            />

            <Field
              label="Due Date"
              type="date"
              value={form.dueDate}
              editing={editing}
              onChange={(value) =>
                updateForm("dueDate", value)
              }
            />

            {/* PO Number */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                PO Number
              </label>

              {editing ? (
                loadingPOs ? (
                  <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                    Loading POs...
                  </p>
                ) : (
                  <select
                    value={form.poId || ""}
                    onChange={(e) => handlePOChange(e.target.value)}
                    className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-black focus:ring-1 focus:ring-black"
                  >
                    <option value="">Select PO</option>

                    {POs.map((po) => (
                      <option key={po.id} value={po.id}>
                        {getPONumber(po) || po.id}
                      </option>
                    ))}
                  </select>
                )
              ) : form.poNumber ? (
                form.poId ? (
                  <Link
                    href={`/purchase-orders/${form.poId}`}
                    className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-4 py-3 text-indigo-700 transition hover:bg-indigo-50 hover:text-indigo-900"
                  >
                    <span className="break-words font-medium underline decoration-indigo-300 underline-offset-2">
                      {form.poNumber}
                    </span>

                    <span className="shrink-0 text-xs">
                      ↗ View PO
                    </span>
                  </Link>
                ) : (
                  <p className="rounded-lg bg-gray-50 px-4 py-3">
                    {form.poNumber}
                    <span className="ml-2 text-xs text-amber-700">
                      (PO link unavailable)
                    </span>
                  </p>
                )
              ) : (
                <p className="rounded-lg bg-gray-50 px-4 py-3 text-gray-500">
                  -
                </p>
              )}
            </div>

          </div>
        </section>

        {/* Supplier / Subcontractor */}

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold">
              Supplier / Subcontractor
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Select the supplier or subcontractor associated with this bill.
            </p>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Type */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Type
              </label>

              {editing ? (
                <select
                  value={supplierType}
                  onChange={(e) =>
                    handleSupplierTypeChange(e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
                >
                  <option value="Supplier">Supplier</option>
                  <option value="Subcontractor">
                    Subcontractor
                  </option>
                </select>
              ) : (
                <p className="rounded-lg bg-gray-50 px-4 py-3">
                  {form.supplierType || "Supplier"}
                </p>
              )}
            </div>

            {/* Record Selector */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {supplierType}
              </label>

              {editing ? (
                loadingSuppliers ? (
                  <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                    Loading {supplierType.toLowerCase()} records...
                  </p>
                ) : (
                  <select
                    value={selectedSupplierId}
                    onChange={(e) =>
                      handleSupplierChange(e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
                  >
                    <option value="">
                      Select {supplierType}
                    </option>

                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name ||
                          supplier.companyName ||
                          "Unnamed"}
                      </option>
                    ))}
                  </select>
                )
              ) : (
                <p className="rounded-lg bg-gray-50 px-4 py-3">
                  {form.supplier.name || "-"}
                </p>
              )}
            </div>
          </div>

          {!editing && !form.supplier.name && (
            <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              This bill may be an older record that only contains client
              information. Select a supplier or subcontractor while editing
              to migrate it to the new format.
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field
              label="Name"
              value={form.supplier.name}
              editing={editing}
              onChange={(value) =>
                updateSupplier("name", value)
              }
            />

            <Field
              label="ABN"
              value={form.supplier.abn}
              editing={editing}
              onChange={(value) =>
                updateSupplier("abn", value)
              }
            />

            <Field
              label="Contact"
              value={form.supplier.contact}
              editing={editing}
              onChange={(value) =>
                updateSupplier("contact", value)
              }
            />

            <Field
              label="Email"
              type="email"
              value={form.supplier.email}
              editing={editing}
              onChange={(value) =>
                updateSupplier("email", value)
              }
            />

            <Field
              label="Phone"
              value={form.supplier.phone}
              editing={editing}
              onChange={(value) =>
                updateSupplier("phone", value)
              }
            />

            <Field
              label="Address"
              value={form.supplier.address}
              editing={editing}
              onChange={(value) =>
                updateSupplier("address", value)
              }
            />
          </div>
        </section>

        {/* Bill Items */}

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Bill Items</h2>

              <p className="mt-1 text-sm text-gray-500">
                Services, quantities and pricing
              </p>
            </div>

            {editing && (
              <button
                type="button"
                onClick={addItem}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                + Add Item
              </button>
            )}
          </div>

          {form.items.length === 0 ? (
            <p className="text-gray-500">No items.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4">Description</th>
                    <th className="pb-3 pr-4">Qty</th>
                    <th className="pb-3 pr-4">Unit Price</th>
                    <th className="pb-3 pr-4">GST</th>
                    <th className="pb-3 text-right">Line Total</th>

                    {editing && (
                      <th className="pb-3 pl-4">Action</th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {form.items.map((item, index) => {
                    const qty = Number(item?.qty) || 0;
                    const unitPrice =
                      Number(item?.unitPrice) || 0;
                    const hasGST = Boolean(item?.tax);
                    const lineSubtotal = qty * unitPrice;
                    const lineGST = hasGST ? lineSubtotal * 0.1 : 0;
                    const lineTotal = lineSubtotal + lineGST;

                    return (
                      <tr
                        key={index}
                        className="border-b last:border-0"
                      >
                        <td className="py-4 pr-4">
                          {editing ? (
                            <input
                              type="text"
                              value={item.description || ""}
                              onChange={(e) =>
                                updateItem(
                                  index,
                                  "description",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-lg border border-gray-300 px-3 py-2"
                              placeholder="Description"
                            />
                          ) : (
                            item.description || "-"
                          )}
                        </td>

                        <td className="py-4 pr-4">
                          {editing ? (
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.qty}
                              onChange={(e) =>
                                updateItem(
                                  index,
                                  "qty",
                                  e.target.value
                                )
                              }
                              className="w-24 rounded-lg border border-gray-300 px-3 py-2"
                            />
                          ) : (
                            qty
                          )}
                        </td>

                        <td className="py-4 pr-4">
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
                              className="w-32 rounded-lg border border-gray-300 px-3 py-2"
                            />
                          ) : (
                            formatCurrency(unitPrice)
                          )}
                        </td>

                        <td className="py-4 pr-4">
                          {editing ? (
                            <label className="flex items-center gap-2 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={Boolean(item.tax)}
                                onChange={(e) =>
                                  updateItem(index, "tax", e.target.checked)
                                }
                                className="h-4 w-4 cursor-pointer"
                              />
                              <span>GST (10%)</span>
                            </label>
                          ) : (
                            <span>{item.tax ? "Yes (10%)" : "No (0%)"}</span>
                          )}
                        </td>

                        <td className="py-4 text-right font-medium">
                          {formatCurrency(lineTotal)}
                        </td>

                        {editing && (
                          <td className="py-4 pl-4">
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="text-sm text-red-600 hover:underline"
                            >
                              Remove
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}


          {/* Totals */}

          <div className="ml-auto mt-6 max-w-sm border-t pt-5">
            <div className="mb-3 flex justify-between gap-4">
              <span className="text-gray-600">
                Item Subtotal (excl. GST)
              </span>
              <span>{formatCurrency(totals.itemSubtotal)}</span>
            </div>

            <div className="mb-3 flex justify-between gap-4">
              <span className="text-gray-600">GST</span>
              <span>{formatCurrency(totals.itemGST)}</span>
            </div>

            <div className="flex justify-between gap-4 text-lg font-bold">
              <span>Total (incl. GST)</span>
              <span>{formatCurrency(totals.total)}</span>
            </div>
          </div>

        </section>

        {/* Notes */}

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold">Notes</h2>

          {editing ? (
            <textarea
              value={form.notes}
              onChange={(e) =>
                updateForm("notes", e.target.value)
              }
              rows={6}
              className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3"
              placeholder="Enter notes"
            />
          ) : (
            <div className="rounded-lg bg-gray-50 p-5">
              {form.notes ? (
                <p className="whitespace-pre-line leading-7">
                  {form.notes}
                </p>
              ) : (
                <p className="text-gray-500">
                  No notes provided.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* =====================================================
   Reusable Field
===================================================== */

function Field({
  label,
  value,
  editing,
  onChange,
  type = "text",
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

      {editing ? (
        <input
          type={type}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-3"
        />
      ) : (
        <p className="break-words rounded-lg bg-gray-50 px-4 py-3">
          {value || "-"}
        </p>
      )}
    </div>
  );
}