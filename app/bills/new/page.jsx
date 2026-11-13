
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

export default function NewBillPage() {
  const router = useRouter();

  /* =====================================================
     Supplier / Subcontractor Data
  ===================================================== */

  const [supplierType, setSupplierType] = useState("Supplier");
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");

  const selectedSupplier = useMemo(
    () =>
      suppliers.find((item) => item.id === selectedSupplierId) || null,
    [suppliers, selectedSupplierId]
  );

  /* =====================================================
     Project Data
  ===================================================== */

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  /* =====================================================
     Purchase Order Data
  ===================================================== */

  const [POs, setPOs] = useState([]);
  const [loadingPOs, setLoadingPOs] = useState(true);

  /* =====================================================
     Bill Form
  ===================================================== */

  const [bill, setBill] = useState({
    billNumber: "",
    billDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    projectId: "",
    projectName: "",
    poId: "",
    poNumber: "",
    notes: "",
  });

  /* =====================================================
     Bill Items

     item tax defaults to false，GST TRUE
  ===================================================== */

  const [items, setItems] = useState([
    {
      description: "",
      quantity: 1,
      rate: 0,
      tax: false,
    },
  ]);

  const [includeGST, setIncludeGST] = useState(true);

  /* =====================================================
     Save State
  ===================================================== */

  const [saving, setSaving] = useState(false);
  const [savedBill, setSavedBill] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* =====================================================
     Load Suppliers / Subcontractors
  ===================================================== */

  useEffect(() => {
    let cancelled = false;

    async function loadSuppliers() {
      setLoadingSuppliers(true);
      setError("");
      setSuppliers([]);

      try {
        const collectionName =
          supplierType === "Subcontractor"
            ? "Subcontractors"
            : "Suppliers";

        const snapshot = await getDocs(
          collection(db, collectionName)
        );

        if (cancelled) return;

        const records = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        setSuppliers(records);
      } catch (err) {
        console.error("Error loading suppliers:", err);

        if (!cancelled) {
          setError(
            `Failed to load ${supplierType.toLowerCase()} records. Please try again.`
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

        if (cancelled) return;

        const records = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        setProjects(records);
      } catch (err) {
        console.error("Error loading projects:", err);

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

    async function loadPurchaseOrders() {
      setLoadingPOs(true);

      try {
        const snapshot = await getDocs(
          collection(db, "purchaseOrders")
        );

        if (cancelled) return;

        const records = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        setPOs(records);
      } catch (err) {
        console.error("Error loading purchase orders:", err);

        if (!cancelled) {
          setError("Failed to load purchase orders.");
        }
      } finally {
        if (!cancelled) {
          setLoadingPOs(false);
        }
      }
    }

    loadPurchaseOrders();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =====================================================
     Purchase Order Helpers
  ===================================================== */

  function getPONumber(po) {
    return (
      po.poNumber
    );
  }

  function getSupplierType(po) {
    const type = (
      po.supplierType
    ).toLowerCase();

    return type.includes("subcontractor")
      ? "Subcontractor"
      : "Supplier";
  }

  function getSupplierId(po) {
    return (
      po.supplierId ||
      po.subcontractorId ||
      po.supplier?.id ||
      po.subcontractor?.id ||
      ""
    );
  }

  function getProjectId(po) {
    return (
      po.projectId ||
      ""
    );
  }

  function getPOItems(po) {
    if (Array.isArray(po.items)) return po.items;
    if (Array.isArray(po.lineItems)) return po.lineItems;
    if (Array.isArray(po.orderItems)) return po.orderItems;

    return [];
  }

  function getPOItemDescription(item) {
    return (
      item.description ||
      ""
    );
  }

  function getPOItemQuantity(item) {
    return Number(
      item.qty ??
      1
    ) || 1;
  }

  function getPOItemRate(item) {
    return Number(
      item.rate ??
      item.unitPrice ??
      0
    ) || 0;
  }

  /* =====================================================
     Select Purchase Order
     Automatically fill Supplier, Project and Items
  ===================================================== */

  function handlePOChange(event) {
    const poId = event.target.value;

    const selectedPO = POs.find(
      (po) => po.id === poId
    );

    // Clear PO selection
    if (!selectedPO) {
      setBill((previous) => ({
        ...previous,
        poId: "",
        poNumber: "",
      }));

      setSavedBill(null);
      setSuccess("");
      return;
    }

    // -----------------------------------------
    // 1. Supplier / Subcontractor
    // -----------------------------------------

    const matchedSupplierType = getSupplierType(selectedPO);
    const matchedSupplierId = getSupplierId(selectedPO);

    // -----------------------------------------
    // 2. Project
    // -----------------------------------------

    const projectId = getProjectId(selectedPO);

    const matchedProject = projects.find(
      (project) => project.id === projectId
    );

    const projectName = matchedProject
      ? matchedProject.projectName ||
        matchedProject.name ||
        ""
      : selectedPO.projectName ||
        "";

    // -----------------------------------------
    // 3. Bill Items
    // -----------------------------------------

    const poItems = getPOItems(selectedPO);

    const matchedItems = poItems.map((item) => ({
      description: getPOItemDescription(item),
      quantity: getPOItemQuantity(item),
      rate: getPOItemRate(item),
      tax: false,
    }));

    // -----------------------------------------
    // 4. Update Supplier Type
    // -----------------------------------------

    setSupplierType(matchedSupplierType);

    // -----------------------------------------
    // 5. Update Supplier ID
    // -----------------------------------------

    setSelectedSupplierId(matchedSupplierId);

    // -----------------------------------------
    // 6. Update Bill Details
    // -----------------------------------------

    setBill((previous) => ({
      ...previous,

      poId: selectedPO.id,
      poNumber: getPONumber(selectedPO),

      projectId,
      projectName,
    }));

    // -----------------------------------------
    // 7. Update Bill Items
    // -----------------------------------------

    if (matchedItems.length > 0) {
      setItems(matchedItems);
    } else {
      setItems([
        {
          description: "",
          quantity: 1,
          rate: 0,
          tax: false,
        },
      ]);
    }

    setSavedBill(null);
    setSuccess("");
    setError("");
  }

  /* =====================================================
     Form Handlers
  ===================================================== */

  function handleBillChange(event) {
    const { name, value } = event.target;

    setBill((previous) => ({
      ...previous,
      [name]: value,
    }));

    setSavedBill(null);
    setSuccess("");
  }

  function handleProjectChange(event) {
    const projectId = event.target.value;

    const selectedProject =
      projects.find((project) => project.id === projectId) || null;

    setBill((previous) => ({
      ...previous,
      projectId,

      projectName: selectedProject
        ? selectedProject.projectName ||
          selectedProject.name ||
          ""
        : "",
    }));

    setSavedBill(null);
    setSuccess("");
  }

  function handleSupplierTypeChange(event) {
    setSupplierType(event.target.value);

    setSelectedSupplierId("");

    setSavedBill(null);
    setSuccess("");
  }

  function handleSupplierChange(event) {
    setSelectedSupplierId(event.target.value);

    setSavedBill(null);
    setSuccess("");
  }

  /* =====================================================
     Bill Item Handlers
  ===================================================== */

  function handleItemChange(index, field, value) {
    setItems((previous) =>
      previous.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        return {
          ...item,

          [field]:
            field === "quantity" || field === "rate"
              ? value === ""
                ? ""
                : Number(value)
              : value,
        };
      })
    );

    setSavedBill(null);
    setSuccess("");
  }

  function addItem() {
    setItems((previous) => [
      ...previous,
      {
        description: "",
        quantity: 1,
        rate: 0,
        tax: false,
      },
    ]);

    setSavedBill(null);
    setSuccess("");
  }

  function removeItem(index) {
    setItems((previous) => {
      if (previous.length === 1) {
        return [
          {
            description: "",
            quantity: 1,
            rate: 0,
            tax: false,
          },
        ];
      }

      return previous.filter(
        (_, itemIndex) => itemIndex !== index
      );
    });

    setSavedBill(null);
    setSuccess("");
  }

  /* =====================================================
     Calculate Totals
  ===================================================== */

    const subtotal = useMemo(
      () =>
        items.reduce(
          (sum, item) =>
            sum +
            (Number(item.quantity) || 0) *
              (Number(item.rate) || 0) * (item.tax ? 1.1 : 1) || 0,
          0
        ),
      [items]
    );

    const gst = includeGST ? subtotal * 0.1 : 0;

    const total = subtotal + gst;

  function formatCurrency(value) {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(Number(value) || 0);
  }

  /* =====================================================
     Save Bill
  ===================================================== */

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!supplierType || !selectedSupplierId || !selectedSupplier) {
      setError("Please select a supplier or subcontractor.");
      return;
    }

    if (!bill.billNumber.trim()) {
      setError("Please enter a bill number.");
      return;
    }

    if (!bill.billDate) {
      setError("Please select a bill date.");
      return;
    }

    if (!bill.dueDate) {
      setError("Please select a due date.");
      return;
    }

    if (!bill.projectId) {
      setError("Please select a project.");
      return;
    }

    const validItems = items
      .map((item) => ({
        description: String(item.description || "").trim(),
        quantity: Number(item.quantity) || 0,
        rate: Number(item.rate) || 0,
        tax: Boolean(item.tax),
      }))
      .filter((item) => item.description);

    if (validItems.length === 0) {
      setError("Please add at least one bill item.");
      return;
    }

    if (
      validItems.some(
        (item) => item.quantity <= 0 || item.rate < 0
      )
    ) {
      setError(
        "Quantity must be greater than zero and rate cannot be negative."
      );
      return;
    }

    // -----------------------------------------
    // Supplier Snapshot
    // -----------------------------------------

    const supplierSnapshot = {
      id: selectedSupplier.id,

      name:
        selectedSupplier.name ||
        selectedSupplier.companyName ||
        "",

      abn: selectedSupplier.abn || "",

      contact:
        selectedSupplier.contact ||
        selectedSupplier.contactName ||
        "",

      email: selectedSupplier.email || "",
      phone: selectedSupplier.phone || "",
      address: selectedSupplier.address || "",
    };

    // -----------------------------------------
    // Bill Data
    // -----------------------------------------

    const billData = {
      billNumber: bill.billNumber.trim(),
      billDate: bill.billDate,
      dueDate: bill.dueDate,

      // Supplier / Subcontractor
      supplierType,
      supplierId: selectedSupplier.id,
      supplier: supplierSnapshot,

      // Flat fields for compatibility
      supplierName: supplierSnapshot.name,
      supplierAddress: supplierSnapshot.address,

      // Project
      projectId: bill.projectId,
      projectName: bill.projectName,

      // Purchase Order
      poId: bill.poId || "",
      poNumber: bill.poNumber || "",

      // Items and totals
      items: validItems,
      subtotal: subtotal,
      gst: gst,
      total: total,
      includeGST: includeGST,
      notes: bill.notes.trim(),

      status: "Awaiting",

      createdAt: serverTimestamp(),
    };

    setSaving(true);

    try {
      await addDoc(
        collection(db, "bills"),
        billData
      );

      setSuccess("Bill saved successfully.");

      router.push("/bills");

    } catch (err) {
      console.error("Error saving bill:", err);

      setError("Failed to save bill. Please try again.");

    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     Render Page
  ===================================================== */

  return (
    <main className="mx-auto max-w-6xl p-6">

      {/* Page Header */}

      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          Create Bill
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Create a bill for a supplier or subcontractor.
        </p>
      </div>

      {/* Error */}

      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Success */}

      {success && (
        <div className="mb-4 rounded border border-green-300 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >

        {/* =================================================
            Purchase Order
        ================================================= */}

        <section className="rounded-lg border bg-white p-5">

          <h2 className="mb-4 text-lg font-semibold">
            Purchase Order
          </h2>

          <div>
            <label
              htmlFor="poId"
              className="mb-1 block text-sm font-medium"
            >
              PO Number
            </label>

            <select
              id="poId"
              value={bill.poId}
              onChange={handlePOChange}
              className="w-full rounded border p-2"
              disabled={loadingPOs}
            >
              <option value="">
                {loadingPOs
                  ? "Loading purchase orders..."
                  : "Select PO (Optional)"}
              </option>

              {POs.map((po) => (
                <option
                  key={po.id}
                  value={po.id}
                >
                  {getPONumber(po)}
                </option>
              ))}
            </select>

            <p className="mt-1 text-xs text-gray-500">
              Selecting a PO will automatically fill supplier,
              project and bill items.
            </p>
          </div>

        </section>

        {/* =================================================
            Supplier / Subcontractor Details
        ================================================= */}

        <section className="rounded-lg border bg-white p-5">

          <h2 className="mb-4 text-lg font-semibold">
            Supplier/Subcontractor Details
          </h2>

          <div className="grid gap-4 md:grid-cols-2">

            {/* Supplier Type */}

            <div>
              <label
                htmlFor="supplierType"
                className="mb-1 block text-sm font-medium"
              >
                Type <span className="text-red-500">*</span>
              </label>

              <select
                id="supplierType"
                value={supplierType}
                onChange={handleSupplierTypeChange}
                className="w-full rounded border p-2"
                required
              >
                <option value="Supplier">
                  Supplier
                </option>

                <option value="Subcontractor">
                  Subcontractor
                </option>
              </select>
            </div>

            {/* Supplier */}

            <div>
              <label
                htmlFor="supplierId"
                className="mb-1 block text-sm font-medium"
              >
                {supplierType}
                {" "}
                <span className="text-red-500">*</span>
              </label>

              <select
                id="supplierId"
                value={selectedSupplierId}
                onChange={handleSupplierChange}
                className="w-full rounded border p-2"
                disabled={loadingSuppliers}
                required
              >
                <option value="">
                  {loadingSuppliers
                    ? "Loading..."
                    : `Select ${supplierType}`}
                </option>

                {suppliers.map((supplier) => (
                  <option
                    key={supplier.id}
                    value={supplier.id}
                  >
                    {supplier.name ||
                      supplier.companyName ||
                      "Unnamed"}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* Supplier Information */}

          {selectedSupplier && (
            <div className="mt-5 grid gap-3 rounded bg-gray-50 p-4 text-sm md:grid-cols-2">

              <p>
                <strong>Name:</strong>
                {" "}
                {selectedSupplier.name ||
                  selectedSupplier.companyName ||
                  "-"}
              </p>

              <p>
                <strong>ABN:</strong>
                {" "}
                {selectedSupplier.abn || "-"}
              </p>

              <p>
                <strong>Contact:</strong>
                {" "}
                {selectedSupplier.contact ||
                  selectedSupplier.contactName ||
                  "-"}
              </p>

              <p>
                <strong>Email:</strong>
                {" "}
                {selectedSupplier.email || "-"}
              </p>

              <p>
                <strong>Phone:</strong>
                {" "}
                {selectedSupplier.phone || "-"}
              </p>

              <p>
                <strong>Address:</strong>
                {" "}
                {selectedSupplier.address || "-"}
              </p>

            </div>
          )}

        </section>

        {/* =================================================
            Bill Details
        ================================================= */}

        <section className="rounded-lg border bg-white p-5">

          <h2 className="mb-4 text-lg font-semibold">
            Bill Details
          </h2>

          <div className="grid gap-4 md:grid-cols-2">

            {/* Bill Number */}

            <div>
              <label
                htmlFor="billNumber"
                className="mb-1 block text-sm font-medium"
              >
                Bill Number
                {" "}
                <span className="text-red-500">*</span>
              </label>

              <input
                id="billNumber"
                name="billNumber"
                value={bill.billNumber}
                onChange={handleBillChange}
                className="w-full rounded border p-2"
                required
              />
            </div>

            {/* Project */}

            <div>
              <label
                htmlFor="projectId"
                className="mb-1 block text-sm font-medium"
              >
                Project
                {" "}
                <span className="text-red-500">*</span>
              </label>

              <select
                id="projectId"
                value={bill.projectId}
                onChange={handleProjectChange}
                className="w-full rounded border p-2"
                disabled={loadingProjects}
                required
              >
                <option value="">
                  {loadingProjects
                    ? "Loading projects..."
                    : "Select Project"}
                </option>

                {projects.map((project) => (
                  <option
                    key={project.id}
                    value={project.id}
                  >
                    {project.projectName ||
                      project.name ||
                      project.title ||
                      project.id}
                  </option>
                ))}
              </select>
            </div>

            {/* Bill Date */}

            <div>
              <label
                htmlFor="billDate"
                className="mb-1 block text-sm font-medium"
              >
                Bill Date
                {" "}
                <span className="text-red-500">*</span>
              </label>

              <input
                id="billDate"
                type="date"
                name="billDate"
                value={bill.billDate}
                onChange={handleBillChange}
                className="w-full rounded border p-2"
                required
              />
            </div>

            {/* Due Date */}

            <div>
              <label
                htmlFor="dueDate"
                className="mb-1 block text-sm font-medium"
              >
                Due Date
                {" "}
                <span className="text-red-500">*</span>
              </label>

              <input
                id="dueDate"
                type="date"
                name="dueDate"
                value={bill.dueDate}
                onChange={handleBillChange}
                className="w-full rounded border p-2"
                required
              />
            </div>

          </div>

        </section>

        {/* =================================================
            Bill Items
        ================================================= */}

        <section className="rounded-lg border bg-white p-5">

          <div className="mb-4 flex items-center justify-between gap-3">

            <h2 className="text-lg font-semibold">
              Bill Items
            </h2>

            <button
              type="button"
              onClick={addItem}
              className="cursor-pointer px-5 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
            >
              + Add Item
            </button>

          </div>

          <div className="space-y-4">

            {items.map((item, index) => (

              <div
                key={index}
                className="grid gap-3 rounded border p-4 md:grid-cols-12"
              >

                {/* Description */}

                <div className="md:col-span-5">

                  <label className="mb-1 block text-sm font-medium">
                    Description
                  </label>

                  <input
                    value={item.description}
                    onChange={(event) =>
                      handleItemChange(
                        index,
                        "description",
                        event.target.value
                      )
                    }
                    className="w-full rounded border p-2"
                    placeholder="Item description"
                    required
                  />

                </div>

                {/* Quantity */}

                <div className="md:col-span-2">

                  <label className="mb-1 block text-sm font-medium">
                    Quantity
                  </label>

                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={item.quantity}
                    onChange={(event) =>
                      handleItemChange(
                        index,
                        "quantity",
                        event.target.value
                      )
                    }
                    className="w-full rounded border p-2"
                    required
                  />

                </div>

                {/* Rate */}

                <div className="md:col-span-2">

                  <label className="mb-1 block text-sm font-medium">
                    Rate (AUD)
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.rate}
                    onChange={(event) =>
                      handleItemChange(
                        index,
                        "rate",
                        event.target.value
                      )
                    }
                    className="w-full rounded border p-2"
                    required
                  />

                </div>

                {/* GST */}

                <div className="md:col-span-1">

                  <label className="mb-1 block text-sm font-medium">
                    TAX
                  </label>

                  <input
                    type="checkbox"
                    checked={item.tax}
                    onChange={(event) =>
                      handleItemChange(
                        index,
                        "tax",
                        event.target.checked
                      )
                    }
                    className="mt-3 h-4 w-4"
                  />

                </div>

                {/* Amount */}

                <div className="md:col-span-2">

                  <label className="mb-1 block text-sm font-medium">
                    Amount
                  </label>

                  <div className="rounded bg-gray-50 p-2 text-sm">
                    {formatCurrency(
                      (Number(item.quantity) || 0) *
                        (Number(item.rate) || 0) *
                          (item.tax ? 1.1 : 1)
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="mt-2 text-sm text-red-600 hover:underline"
                  >
                    Remove
                  </button>

                </div>

              </div>

            ))}

          </div>

          {/* Totals */}

          <div className="ml-auto mt-6 max-w-sm space-y-3 text-sm">

            <div className="flex justify-between">
              <span>Subtotal (excl. GST)</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>

            {/* GST Toggle */}

            <div className="flex items-center justify-between">

              <label
                htmlFor="includeGST"
                className="flex cursor-pointer items-center gap-2"
              >
                <input
                  id="includeGST"
                  type="checkbox"
                  checked={includeGST}
                  onChange={(event) =>
                    setIncludeGST(event.target.checked)
                  }
                  className="h-4 w-4"
                />

                <span>GST (10%)</span>
              </label>

              <span>{formatCurrency(gst)}</span>

            </div>

            {/* Total */}

            <div className="flex justify-between border-t pt-3 text-base font-bold">
              <span>Total {includeGST ? "(incl. GST)" : "(excl. GST)"}</span>
              <span>{formatCurrency(total)}</span>
            </div>

          </div>

        </section>

        {/* =================================================
            Notes
        ================================================= */}

        <section className="rounded-lg border bg-white p-5">

          <h2 className="mb-4 text-lg font-semibold">
            Notes
          </h2>

          <textarea
            name="notes"
            value={bill.notes}
            onChange={handleBillChange}
            rows={3}
            className="w-full rounded border p-2"
            placeholder="Additional notes..."
          />

        </section>

        {/* =================================================
            Submit
        ================================================= */}

        <div className="flex flex-wrap justify-end gap-3">

          <button
            type="submit"
            disabled={
              saving ||
              loadingSuppliers ||
              loadingProjects ||
              loadingPOs ||
              !selectedSupplier
            }
            className="rounded bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Bill"}
          </button>

        </div>

      </form>

    </main>
  );
}
