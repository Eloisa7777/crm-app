
"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";

import { db } from "@/lib/firebase";
import PurchaseOrderPDF from "@/components/PurchaseOrderPDF";

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  /* =====================================================
     Supplier / Subcontractor Type
  ===================================================== */

  const [supplierType, setSupplierType] = useState("");

  /* =====================================================
     Suppliers / Subcontractors
  ===================================================== */

  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");

  /* =====================================================
     Projects
  ===================================================== */

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  /* =====================================================
     Form
  ===================================================== */

  const [form, setForm] = useState({
    poNumber: "",
    projectName: "",
    status: "Draft",
    poDate: new Date().toISOString().split("T")[0],
    deliveryDate: "",
    siteAddress: "",
    scopeOfWork: "",
    projectManager: "Eason",
    projectManagerEmail: "eason.z@yjliningscreation.com.au",
    siteManager: "",
    siteManagerEmail: "",
  });

  /* =====================================================
     Items
  ===================================================== */

  const [items, setItems] = useState([
    {
      description: "Ground Floor",
      qty: 1,
      unitPrice: "",
    },
  ]);

  /* =====================================================
     UI State
  ===================================================== */

  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* =====================================================
     Load Projects
  ===================================================== */

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoadingProjects(true);
        setError("");

        const snapshot = await getDocs(
          collection(db, "projects")
        );

        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setProjects(data);

        // Do not automatically select the first project
        setSelectedProjectId("");

        setForm((prev) => ({
          ...prev,
          projectName: "",
        }));
      } catch (err) {
        console.error("Error loading projects:", err);
        setError("Failed to load projects.");
      } finally {
        setLoadingProjects(false);
      }
    };

    loadProjects();
  }, []);

  /* =====================================================
     Load Supplier / Subcontractor
     
     Supplier      -> Suppliers
     Subcontractor -> Subcontractors
  ===================================================== */

  useEffect(() => {
    const loadSupplierData = async () => {
      if (!supplierType) {
        setSuppliers([]);
        setSelectedSupplierId("");
        return;
      }

      try {
        setLoadingSuppliers(true);
        setError("");

        const collectionName =
          supplierType === "Supplier"
            ? "Suppliers"
            : "Subcontractors";

        const snapshot = await getDocs(
          collection(db, collectionName)
        );

        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setSuppliers(data);

        // Do not automatically select the first record
        setSelectedSupplierId("");
      } catch (err) {
        console.error(
          `Error loading ${supplierType.toLowerCase()}s:`,
          err
        );

        setError(
          `Failed to load ${supplierType.toLowerCase()}s.`
        );
      } finally {
        setLoadingSuppliers(false);
      }
    };

    loadSupplierData();
  }, [supplierType]);

  /* =====================================================
     Selected Supplier / Subcontractor
  ===================================================== */

  const selectedSupplier = useMemo(() => {
    return suppliers.find(
      (supplier) => supplier.id === selectedSupplierId
    );
  }, [suppliers, selectedSupplierId]);

  /* =====================================================
     Selected Project
  ===================================================== */

  const selectedProject = useMemo(() => {
    return projects.find(
      (project) => project.id === selectedProjectId
    );
  }, [projects, selectedProjectId]);

  /* =====================================================
     Supplier Type Change
  ===================================================== */

  const handleSupplierTypeChange = (e) => {
    const type = e.target.value;

    // Clear the current supplier/subcontractor
    setSupplierType(type);
    setSelectedSupplierId("");
    setSuppliers([]);
    setError("");
  };

  /* =====================================================
     Supplier / Subcontractor Change
  ===================================================== */

  const handleSupplierChange = (e) => {
    setSelectedSupplierId(e.target.value);
  };

  /* =====================================================
     Project Change
  ===================================================== */

  const handleProjectChange = (e) => {
    const projectId = e.target.value;

    const project = projects.find(
      (item) => item.id === projectId
    );

    setSelectedProjectId(projectId);

    setForm((prev) => ({
      ...prev,
      projectName:
        project?.name ||
        project?.projectName ||
        "",
      siteAddress:
        project?.siteAddress ||
        project?.address ||
        "",
    }));
  };

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
     Item Change
  ===================================================== */

  const handleItemChange = (index, field, value) => {
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
  };

  /* =====================================================
     Add Item
  ===================================================== */

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        description: "",
        qty: 1,
        unitPrice: "",
      },
    ]);
  };

  /* =====================================================
     Remove Item
  ===================================================== */

  const removeItem = (index) => {
    setItems((prev) => {
      if (prev.length === 1) {
        return prev;
      }

      return prev.filter((_, i) => i !== index);
    });
  };

  /* =====================================================
     Totals
  ===================================================== */

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const qty = Number(item.qty) || 0;
      const unitPrice = Number(item.unitPrice) || 0;

      return sum + qty * unitPrice;
    }, 0);
  }, [items]);

  const gst = subtotal * 0.1;

  const total = subtotal + gst;

  /* =====================================================
     Scope Line Limit
  ===================================================== */

  const scopeLineCount = form.scopeOfWork
    ? form.scopeOfWork.split("\n").length
    : 0;

  /* =====================================================
     Generate / Save PO
  ===================================================== */

  const handleGeneratePO = async () => {
    try {
      setError("");

      if (!selectedProject) {
        setError("Please select a project.");
        return;
      }

      if (!supplierType) {
        setError(
          "Please select Supplier or Subcontractor."
        );
        return;
      }

      if (!selectedSupplier) {
        setError(
          `Please select a ${supplierType.toLowerCase()}.`
        );
        return;
      }

      if (!form.poNumber.trim()) {
        setError("Please enter a PO number.");
        return;
      }

      setSaving(true);

      const poData = {
        /* ---------------------------------------------
           PO Information
        --------------------------------------------- */

        poNumber: form.poNumber.trim(),
        poDate: form.poDate,
        deliveryDate: form.deliveryDate,

        /* ---------------------------------------------
           Project
           projectId = relationship
           projectName = snapshot/display value
        --------------------------------------------- */

        projectId: selectedProject.id,

        projectName:
          selectedProject.name ||
          selectedProject.projectName ||
          "",

        status: form.status,

        siteAddress: form.siteAddress,
        scopeOfWork: form.scopeOfWork,

        /* ---------------------------------------------
           YJ Site Contact
        --------------------------------------------- */

        projectManager: form.projectManager,
        projectManagerEmail: form.projectManagerEmail,

        siteManager: form.siteManager,
        siteManagerEmail: form.siteManagerEmail,

        /* ---------------------------------------------
           Supplier / Subcontractor
           
           supplierType tells us which collection
           the selected record came from.
           
           Supplier      -> Suppliers
           Subcontractor -> Subcontractors
        --------------------------------------------- */

        supplierType,

        supplierId: selectedSupplier.id,

        supplier: {
          id: selectedSupplier.id,
          name: selectedSupplier.name || "",
          abn: selectedSupplier.abn || "",
          contact: selectedSupplier.contact || "",
          email: selectedSupplier.email || "",
          phone: selectedSupplier.phone || "",
          address: selectedSupplier.address || "",
        },

        /* ---------------------------------------------
           Items
        --------------------------------------------- */

        items: items.map((item) => {
          const qty = Number(item.qty) || 0;
          const unitPrice = Number(item.unitPrice) || 0;

          return {
            description: item.description || "",
            qty,
            unitPrice,
            total: qty * unitPrice,
          };
        }),

        /* ---------------------------------------------
           Totals
        --------------------------------------------- */

        subtotal,
        gst,
        total,

        /* ---------------------------------------------
           Created
        --------------------------------------------- */

        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(
        collection(db, "purchaseOrders"),
        poData
      );

      console.log("PO created:", docRef.id);
      router.push("/purchase-orders");
      
      setShowPreview(true);
    } catch (err) {
      console.error("Error creating PO:", err);

      setError(
        err.message ||
          "Failed to create purchase order."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     PDF Data
  ===================================================== */

  const poDataForPDF = {
    poNumber: form.poNumber,
    poDate: form.poDate,
    deliveryDate: form.deliveryDate,

    projectName:
      selectedProject?.name ||
      selectedProject?.projectName ||
      "",

    siteAddress: form.siteAddress,

    scopeOfWork: form.scopeOfWork,

    projectManager: form.projectManager,
    projectManagerEmail: form.projectManagerEmail,

    siteManager: form.siteManager,
    siteManagerEmail: form.siteManagerEmail,

    supplier: selectedSupplier
      ? {
          id: selectedSupplier.id,
          name: selectedSupplier.name || "",
          abn: selectedSupplier.abn || "",
          contact: selectedSupplier.contact || "",
          email: selectedSupplier.email || "",
          phone: selectedSupplier.phone || "",
          address: selectedSupplier.address || "",
        }
      : null,

    items: items.map((item) => {
      const qty = Number(item.qty) || 0;
      const unitPrice = Number(item.unitPrice) || 0;

      return {
        description: item.description || "",
        qty,
        unitPrice,
        total: qty * unitPrice,
      };
    }),

    subtotal,
    gst,
    total,

    status: form.status,

    supplierType,
  };

  /* =====================================================
     Render
  ===================================================== */

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">

        {/* =================================================
            Header
        ================================================= */}

        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link
              href="/purchase-orders"
              className="text-sm text-gray-500 hover:text-black"
            >
              ← Purchase Orders
            </Link>

            <h1 className="mt-2 text-3xl font-bold">
              New Purchase Order
            </h1>

            <p className="mt-1 text-gray-500">
              Create a new purchase order
            </p>
          </div>
        </div>

        {/* =================================================
            Error
        ================================================= */}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* =================================================
            PO Management
        ================================================= */}

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold">
            PO Management
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            {/* Project Name */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Project Name
              </label>

              {loadingProjects ? (
                <p className="rounded-lg border px-4 py-3 text-sm text-gray-500">
                  Loading projects...
                </p>
              ) : projects.length === 0 ? (
                <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
                  No projects found.
                </div>
              ) : (
                <select
                  value={selectedProjectId}
                  onChange={handleProjectChange}
                  className="w-full rounded-lg border px-4 py-3"
                >
                  <option value="">
                    Select project
                  </option>

                  {projects.map((project) => (
                    <option
                      key={project.id}
                      value={project.id}
                    >
                      {project.name ||
                        project.projectName ||
                        "Unnamed project"}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Status */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Status
              </label>

              <select
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    status: e.target.value,
                  }))
                }
                className="w-full rounded-lg border px-4 py-3"
              >
                <option value="Draft">
                  Draft
                </option>

                <option value="Issued">
                  Issued
                </option>

                <option value="Approved">
                  Approved
                </option>

                <option value="Completed">
                  Completed
                </option>

                <option value="Cancelled">
                  Cancelled
                </option>
              </select>
            </div>

          </div>
        </section>

        {/* =================================================
            PO Information
        ================================================= */}

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold">
            PO Information
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

            <div>
              <label className="mb-2 block text-sm font-medium">
                PO Number
              </label>

              <input
                type="text"
                name="poNumber"
                value={form.poNumber}
                onChange={handleChange}
                placeholder="PO-2026-001"
                className="w-full rounded-lg border px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                PO Date
              </label>

              <input
                type="date"
                name="poDate"
                value={form.poDate}
                onChange={handleChange}
                className="w-full rounded-lg border px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Delivery Date
              </label>

              <input
                type="date"
                name="deliveryDate"
                value={form.deliveryDate}
                onChange={handleChange}
                className="w-full rounded-lg border px-4 py-3"
              />
            </div>

          </div>
        </section>

        {/* =================================================
            Supplier / Subcontractor
        ================================================= */}

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">

          <h2 className="mb-5 text-xl font-semibold">
            Supplier / Subcontractor
          </h2>

          {/* ---------------------------------------------
              Step 1 - Select Type
          --------------------------------------------- */}

          <div className="mb-5">
            <label className="mb-2 block text-sm font-medium">
              Type
            </label>

            <select
              value={supplierType}
              onChange={handleSupplierTypeChange}
              className="w-full rounded-lg border px-4 py-3"
            >
              <option value="">
                Select Supplier or Subcontractor
              </option>

              <option value="Supplier">
                Supplier
              </option>

              <option value="Subcontractor">
                Subcontractor
              </option>
            </select>
          </div>

          {/* ---------------------------------------------
              Step 2 - Load Selected Collection
          --------------------------------------------- */}

          {supplierType && (
            <div>
              <label className="mb-2 block text-sm font-medium">
                Select {supplierType}
              </label>

              {loadingSuppliers ? (
                <p className="rounded-lg border px-4 py-3 text-sm text-gray-500">
                  Loading {supplierType.toLowerCase()}s...
                </p>
              ) : suppliers.length === 0 ? (
                <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
                  No {supplierType.toLowerCase()}s found.
                  Please create one first.
                </div>
              ) : (
                <select
                  value={selectedSupplierId}
                  onChange={handleSupplierChange}
                  className="w-full rounded-lg border px-4 py-3"
                >
                  <option value="">
                    Select {supplierType.toLowerCase()}
                  </option>

                  {suppliers.map((supplier) => (
                    <option
                      key={supplier.id}
                      value={supplier.id}
                    >
                      {supplier.name || "Unnamed"}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* ---------------------------------------------
              Selected Information
          --------------------------------------------- */}

          {selectedSupplier && (
            <div className="mt-5 rounded-lg bg-gray-50 p-5">

              <div className="mb-4">
                <p className="text-xs text-gray-500">
                  Type
                </p>

                <p className="font-medium">
                  {supplierType}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                <div>
                  <p className="text-xs text-gray-500">
                    Name
                  </p>

                  <p className="font-medium">
                    {selectedSupplier.name || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    ABN
                  </p>

                  <p>
                    {selectedSupplier.abn || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Contact
                  </p>

                  <p>
                    {selectedSupplier.contact || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Email
                  </p>

                  <p>
                    {selectedSupplier.email || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Phone
                  </p>

                  <p>
                    {selectedSupplier.phone || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Address
                  </p>

                  <p>
                    {selectedSupplier.address || "-"}
                  </p>
                </div>

              </div>
            </div>
          )}

        </section>

        {/* =================================================
            Site Address
        ================================================= */}

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">

          <h2 className="mb-5 text-xl font-semibold">
            Site Address
          </h2>

          <textarea
            name="siteAddress"
            value={form.siteAddress}
            onChange={handleChange}
            rows={3}
            placeholder="Enter project/site address"
            className="w-full rounded-lg border px-4 py-3"
          />

        </section>

        {/* =================================================
            Order Items
        ================================================= */}

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">

          <div className="mb-5 flex items-center justify-between">

            <h2 className="text-xl font-semibold">
              Order Items
            </h2>

            <button
              type="button"
              onClick={addItem}
              className="cursor-pointer rounded-lg bg-indigo-800 px-5 py-2.5 text-sm text-gray-100 transition hover:bg-amber-400 hover:text-black"
            >
              + Add Item
            </button>

          </div>

          <div className="space-y-4">

            {items.map((item, index) => {

              const itemTotal =
                (Number(item.qty) || 0) *
                (Number(item.unitPrice) || 0);

              return (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-3"
                >

                  <div className="col-span-5">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        handleItemChange(
                          index,
                          "description",
                          e.target.value
                        )
                      }
                      placeholder="Description"
                      className="w-full rounded-lg border px-4 py-3"
                    />
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      min="0"
                      value={item.qty}
                      onChange={(e) =>
                        handleItemChange(
                          index,
                          "qty",
                          e.target.value
                        )
                      }
                      placeholder="Qty"
                      className="w-full rounded-lg border px-4 py-3"
                    />
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) =>
                        handleItemChange(
                          index,
                          "unitPrice",
                          e.target.value
                        )
                      }
                      placeholder="Unit Price"
                      className="w-full rounded-lg border px-4 py-3"
                    />
                  </div>

                  <div className="col-span-2 flex items-center rounded-lg bg-gray-50 px-4">
                    ${itemTotal.toFixed(2)}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      removeItem(index)
                    }
                    className="col-span-1 text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>

                </div>
              );
            })}

          </div>

          <div className="mt-8 ml-auto max-w-sm space-y-3 border-t pt-5">

            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>
                ${subtotal.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between">
              <span>GST (10%)</span>
              <span>
                ${gst.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>
                ${total.toFixed(2)}
              </span>
            </div>

          </div>

        </section>

        {/* =================================================
            Scope of Work
        ================================================= */}

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">

          <div className="mb-3 flex items-center justify-between">

            <h2 className="text-xl font-semibold">
              Scope of Work
            </h2>

            <span className="text-sm text-gray-500">
              {scopeLineCount}/20 lines
            </span>

          </div>

          <textarea
            name="scopeOfWork"
            value={form.scopeOfWork}
            onChange={(e) => {
              const lines =
                e.target.value.split("\n");

              if (lines.length <= 20) {
                setForm((prev) => ({
                  ...prev,
                  scopeOfWork: e.target.value,
                }));
              }
            }}
            rows={10}
            placeholder="Enter scope of work..."
            className="w-full rounded-lg border px-4 py-3"
          />

        </section>

        {/* =================================================
            YJ Site Contact
        ================================================= */}

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">

          <h2 className="mb-5 text-xl font-semibold">
            YJ Site Contact
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            <div>
              <label className="mb-2 block text-sm font-medium">
                Project Manager
              </label>

              <input
                type="text"
                name="projectManager"
                value={form.projectManager}
                onChange={handleChange}
                className="w-full rounded-lg border px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Project Manager Email
              </label>

              <input
                type="email"
                name="projectManagerEmail"
                value={form.projectManagerEmail}
                onChange={handleChange}
                className="w-full rounded-lg border px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Site Manager
              </label>

              <input
                type="text"
                name="siteManager"
                value={form.siteManager}
                onChange={handleChange}
                className="w-full rounded-lg border px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Site Manager Email
              </label>

              <input
                type="email"
                name="siteManagerEmail"
                value={form.siteManagerEmail}
                onChange={handleChange}
                className="w-full rounded-lg border px-4 py-3"
              />
            </div>

          </div>

        </section>

        {/* =================================================
            Actions
        ================================================= */}

        <div className="flex justify-end gap-3">

          <Link
            href="/purchase-orders"
            className="rounded-lg border bg-white px-6 py-3 font-medium"
          >
            Cancel
          </Link>

          <button
            type="button"
            onClick={handleGeneratePO}
            disabled={
              saving ||
              loadingProjects ||
              loadingSuppliers
            }
            className="cursor-pointer rounded-lg bg-indigo-800 px-5 py-2.5 text-sm font-medium text-gray-100 transition hover:bg-amber-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : "Generate PO"}
          </button>

        </div>

        {/* =================================================
            PDF Preview
        ================================================= */}

        {showPreview && (
          <section className="mt-10 rounded-xl bg-white p-6 shadow-sm">

            <div className="mb-5 flex items-center justify-between">

              <h2 className="text-xl font-semibold">
                Purchase Order Preview
              </h2>

              <PDFDownloadLink
                document={
                  <PurchaseOrderPDF
                    data={poDataForPDF}
                  />
                }
                fileName={`${
                  form.poNumber ||
                  "purchase-order"
                }.pdf`}
                className="rounded-lg bg-black px-5 py-3 text-sm font-medium text-white"
              >
                {({ loading }) =>
                  loading
                    ? "Preparing PDF..."
                    : "Download PDF"
                }
              </PDFDownloadLink>

            </div>

            <div className="h-[900px] overflow-hidden rounded-lg border">

              <PDFViewer
                width="100%"
                height="100%"
                showToolbar
              >
                <PurchaseOrderPDF
                  data={poDataForPDF}
                />
              </PDFViewer>

            </div>

          </section>
        )}

      </div>
    </div>
  );
}

