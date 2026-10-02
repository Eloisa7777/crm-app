
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  PDFDownloadLink,
  PDFViewer,
} from "@react-pdf/renderer";

import { db } from "@/lib/firebase";
import PurchaseOrderPDF from "@/components/PurchaseOrderPDF";

export default function PurchaseOrderDetailPage() {
  const params = useParams();

  const [purchaseOrder, setPurchaseOrder] = useState(null);

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  /* =====================================================
     Supplier / Subcontractor
  ===================================================== */

  const [parties, setParties] = useState([]);
  const [loadingParties, setLoadingParties] = useState(false);

  const [form, setForm] = useState({
    poNumber: "",

    projectId: "",
    projectName: "",

    status: "Draft",

    poDate: "",
    deliveryDate: "",

    supplierType: "Supplier",

    supplier: {
      id: "",
      name: "",
      abn: "",
      contact: "",
      email: "",
      phone: "",
      address: "",
    },

    supplierId: "",

    siteAddress: "",

    items: [],

    scopeOfWork: "",

    projectManager: "",
    projectManagerEmail: "",

    siteManager: "",
    siteManagerEmail: "",
  });

  const [editing, setEditing] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  /* =====================================================
     Collection Mapping
  ===================================================== */

  const PARTY_COLLECTIONS = {
    Supplier: "Suppliers",
    Subcontractor: "Subcontractors",
  };

  /* =====================================================
     Load PO
  ===================================================== */

  useEffect(() => {
    const loadPurchaseOrder = async () => {
      if (!params?.id) return;

      try {
        setLoading(true);
        setError("");

        const poRef = doc(
          db,
          "purchaseOrders",
          params.id
        );

        const snapshot = await getDoc(poRef);

        if (!snapshot.exists()) {
          setError("Purchase order not found.");
          return;
        }

        const data = {
          id: snapshot.id,
          ...snapshot.data(),
        };

        setPurchaseOrder(data);

        /* -----------------------------------------------
           Supplier / Subcontractor
        ------------------------------------------------ */

        const supplier =
          typeof data.supplier === "object" &&
          data.supplier !== null
            ? data.supplier
            : {
                name: data.supplier || "",
              };

        /*
         * Old PO data may not have supplierType.
         * Default to Supplier for backward compatibility.
         */
        const supplierType =
          data.supplierType === "Subcontractor"
            ? "Subcontractor"
            : "Supplier";

        /* -----------------------------------------------
           Items
        ------------------------------------------------ */

        const items = Array.isArray(data.items)
          ? data.items.map((item) => ({
              description:
                item.description || "",

              qty:
                Number(item.qty) || 0,

              unitPrice:
                Number(item.unitPrice) || 0,
            }))
          : [];

        /* -----------------------------------------------
           Form
        ------------------------------------------------ */

        setForm({
          poNumber:
            data.poNumber || "",

          projectId:
            data.projectId || "",

          projectName:
            data.projectName || "",

          status:
            data.status || "Draft",

          poDate:
            data.poDate || "",

          deliveryDate:
            data.deliveryDate || "",

          supplierType,

          supplier: {
            id:
              supplier.id || "",

            name:
              supplier.name || "",

            abn:
              supplier.abn || "",

            contact:
              supplier.contact || "",

            email:
              supplier.email || "",

            phone:
              supplier.phone || "",

            address:
              supplier.address || "",
          },

          supplierId:
            data.supplierId ||
            supplier.id ||
            "",

          siteAddress:
            data.siteAddress || "",

          items,

          scopeOfWork:
            data.scopeOfWork || "",

          projectManager:
            data.projectManager || "",

          projectManagerEmail:
            data.projectManagerEmail || "",

          siteManager:
            data.siteManager || "",

          siteManagerEmail:
            data.siteManagerEmail || "",
        });

      } catch (err) {
        console.error(err);

        setError(
          err.message ||
            "Failed to load purchase order."
        );
      } finally {
        setLoading(false);
      }
    };

    loadPurchaseOrder();
  }, [params?.id]);

  /* =====================================================
     Load Projects
  ===================================================== */

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoadingProjects(true);

        const snapshot = await getDocs(
          collection(db, "projects")
        );

        const data = snapshot.docs.map(
          (projectDoc) => {
            const projectData =
              projectDoc.data();

            return {
              id: projectDoc.id,
              ...projectData,
            };
          }
        );

        console.log("PROJECTS:", data);

        setProjects(data);

      } catch (err) {
        console.error(
          "Error loading projects:",
          err
        );

        setError(
          "Failed to load projects."
        );
      } finally {
        setLoadingProjects(false);
      }
    };

    loadProjects();
  }, []);

  /* =====================================================
     Load Supplier / Subcontractor
  ===================================================== */

  async function loadParties(type) {
    const collectionName =
      PARTY_COLLECTIONS[type];

    if (!collectionName) {
      setParties([]);
      return;
    }

    try {
      setLoadingParties(true);
      setError("");

      const snapshot = await getDocs(
        collection(db, collectionName)
      );

      const data = snapshot.docs.map(
        (partyDoc) => {
          const partyData =
            partyDoc.data();

          return {
            id: partyDoc.id,
            ...partyData,
          };
        }
      );

      console.log(
        `${type.toUpperCase()}S:`,
        data
      );

      setParties(data);

    } catch (err) {
      console.error(
        `Error loading ${type}:`,
        err
      );

      setParties([]);

      setError(
        `Failed to load ${type.toLowerCase()}s.`
      );
    } finally {
      setLoadingParties(false);
    }
  }

  /* =====================================================
     Load Party When Editing Starts
  ===================================================== */

  useEffect(() => {
    if (!editing) return;

    if (!form.supplierType) return;

    loadParties(form.supplierType);
  }, [editing]);

  /* =====================================================
     Generic Form Update
  ===================================================== */

  function updateForm(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  /* =====================================================
     Project Update
  ===================================================== */

  function handleProjectChange(e) {
    const projectId =
      e.target.value;

    const selectedProject =
      projects.find(
        (project) =>
          project.id === projectId
      );

    console.log(
      "Selected project:",
      selectedProject
    );

    setForm((prev) => ({
      ...prev,

      projectId:
        selectedProject?.id || "",

      projectName:
        selectedProject?.projectName ||
        selectedProject?.name ||
        "",
    }));
  }

  /* =====================================================
     Supplier / Subcontractor Type Change
  ===================================================== */

  async function handleSupplierTypeChange(
    e
  ) {
    const supplierType =
      e.target.value;

    setForm((prev) => ({
      ...prev,

      supplierType,

      supplierId: "",

      supplier: {
        id: "",
        name: "",
        abn: "",
        contact: "",
        email: "",
        phone: "",
        address: "",
      },
    }));

    setParties([]);

    if (supplierType) {
      await loadParties(
        supplierType
      );
    }
  }

  /* =====================================================
     Supplier / Subcontractor Selection
  ===================================================== */

  function handlePartyChange(e) {
    const supplierId =
      e.target.value;

    const selectedParty =
      parties.find(
        (party) =>
          party.id === supplierId
      );

    console.log(
      "Selected party:",
      selectedParty
    );

    if (!selectedParty) {
      setForm((prev) => ({
        ...prev,

        supplierId: "",

        supplier: {
          id: "",
          name: "",
          abn: "",
          contact: "",
          email: "",
          phone: "",
          address: "",
        },
      }));

      return;
    }

    setForm((prev) => ({
      ...prev,

      supplierId:
        selectedParty.id,

      supplier: {
        id:
          selectedParty.id || "",

        name:
          selectedParty.name ||
          selectedParty.companyName ||
          "",

        abn:
          selectedParty.abn || "",

        contact:
          selectedParty.contact ||
          selectedParty.contactName ||
          "",

        email:
          selectedParty.email || "",

        phone:
          selectedParty.phone ||
          selectedParty.mobile ||
          "",

        address:
          selectedParty.address || "",
      },
    }));
  }

  /* =====================================================
     Supplier / Subcontractor Manual Update
  ===================================================== */

  function updateSupplier(
    field,
    value
  ) {
    setForm((prev) => ({
      ...prev,

      supplier: {
        ...prev.supplier,

        [field]: value,
      },
    }));
  }

  /* =====================================================
     Item Update
  ===================================================== */

  function updateItem(
    index,
    field,
    value
  ) {
    setForm((prev) => {
      const items = [
        ...prev.items,
      ];

      items[index] = {
        ...items[index],
        [field]: value,
      };

      return {
        ...prev,
        items,
      };
    });
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
        },
      ],
    }));
  }

  /* =====================================================
     Remove Item
  ===================================================== */

  function removeItem(index) {
    setForm((prev) => ({
      ...prev,

      items: prev.items.filter(
        (_, itemIndex) =>
          itemIndex !== index
      ),
    }));
  }

  /* =====================================================
     Totals
  ===================================================== */

  const subtotal =
    form.items.reduce(
      (sum, item) => {
        const qty =
          Number(item.qty) || 0;

        const unitPrice =
          Number(item.unitPrice) || 0;

        return (
          sum +
          qty * unitPrice
        );
      },
      0
    );

  const gst =
    subtotal * 0.1;

  const total =
    subtotal + gst;

  /* =====================================================
     Save
  ===================================================== */

  async function handleSave() {
    try {
      setSaving(true);
      setSaved(false);
      setError("");

      const poRef = doc(
        db,
        "purchaseOrders",
        params.id
      );

      /* -----------------------------------------------
         Validate Project
      ------------------------------------------------ */

      if (!form.projectId) {
        setError(
          "Please select a project."
        );

        setSaving(false);
        return;
      }

      const selectedProject =
        projects.find(
          (project) =>
            project.id ===
            form.projectId
        );

      if (!selectedProject) {
        setError(
          "Selected project could not be found."
        );

        setSaving(false);
        return;
      }

      /* -----------------------------------------------
         Get Project Name
      ------------------------------------------------ */

      const selectedProjectName =
        selectedProject.projectName ||
        selectedProject.name ||
        "";

      if (!selectedProjectName) {
        setError(
          "Selected project does not have a project name."
        );

        setSaving(false);
        return;
      }

      /* -----------------------------------------------
         Validate Supplier / Subcontractor
      ------------------------------------------------ */

      if (
        !form.supplierType
      ) {
        setError(
          "Please select Supplier or Subcontractor."
        );

        setSaving(false);
        return;
      }

      if (!form.supplierId) {
        setError(
          `Please select a ${form.supplierType.toLowerCase()}.`
        );

        setSaving(false);
        return;
      }

      /* -----------------------------------------------
         Clean Items
      ------------------------------------------------ */

      const cleanItems =
        form.items.map(
          (item) => {
            const qty =
              Number(item.qty) ||
              0;

            const unitPrice =
              Number(
                item.unitPrice
              ) || 0;

            return {
              description:
                item.description ||
                "",

              qty,

              unitPrice,

              total:
                qty *
                unitPrice,
            };
          }
        );

      /* -----------------------------------------------
         Calculate Totals
      ------------------------------------------------ */

      const cleanSubtotal =
        cleanItems.reduce(
          (sum, item) =>
            sum + item.total,
          0
        );

      const cleanGst =
        cleanSubtotal * 0.1;

      const cleanTotal =
        cleanSubtotal +
        cleanGst;

      /* -----------------------------------------------
         Data to Firestore
      ------------------------------------------------ */

      const updatedData = {
        poNumber:
          form.poNumber.trim(),

        /* Project */

        projectId:
          selectedProject.id,

        projectName:
          selectedProjectName,

        /* PO */

        status:
          form.status,

        poDate:
          form.poDate,

        deliveryDate:
          form.deliveryDate,

        /* ---------------------------------------------
           Supplier / Subcontractor
        --------------------------------------------- */

        supplierType:
          form.supplierType,

        supplierId:
          form.supplierId ||
          form.supplier.id ||
          "",

        /*
         * Keep existing "supplier" field
         * for compatibility with current
         * PurchaseOrderPDF and existing POs.
         */
        supplier: {
          id:
            form.supplier.id ||
            "",

          name:
            form.supplier.name ||
            "",

          abn:
            form.supplier.abn ||
            "",

          contact:
            form.supplier.contact ||
            "",

          email:
            form.supplier.email ||
            "",

          phone:
            form.supplier.phone ||
            "",

          address:
            form.supplier.address ||
            "",
        },

        /* Site */

        siteAddress:
          form.siteAddress,

        /* Items */

        items:
          cleanItems,

        /* Scope */

        scopeOfWork:
          form.scopeOfWork,

        /* YJ Contact */

        projectManager:
          form.projectManager,

        projectManagerEmail:
          form.projectManagerEmail,

        siteManager:
          form.siteManager,

        siteManagerEmail:
          form.siteManagerEmail,

        /* Totals */

        subtotal:
          cleanSubtotal,

        gst:
          cleanGst,

        total:
          cleanTotal,

        updatedAt:
          serverTimestamp(),
      };

      console.log(
        "Saving PO:",
        updatedData
      );

      await updateDoc(
        poRef,
        updatedData
      );

      /* -----------------------------------------------
         Update Local PO
      ------------------------------------------------ */

      setPurchaseOrder(
        (prev) => ({
          ...prev,
          ...updatedData,

          items:
            cleanItems,

          supplier:
            updatedData.supplier,

          subtotal:
            cleanSubtotal,

          gst:
            cleanGst,

          total:
            cleanTotal,
        })
      );

      /* -----------------------------------------------
         Update Form
      ------------------------------------------------ */

      setForm((prev) => ({
        ...prev,

        projectId:
          selectedProject.id,

        projectName:
          selectedProjectName,

        items:
          cleanItems,
      }));

      setEditing(false);
      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 2500);

    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Failed to save purchase order."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     Cancel Editing
  ===================================================== */

  function handleCancel() {
    if (!purchaseOrder)
      return;

    const data =
      purchaseOrder;

    const supplier =
      typeof data.supplier ===
        "object" &&
      data.supplier !== null
        ? data.supplier
        : {
            name:
              data.supplier || "",
          };

    const items =
      Array.isArray(data.items)
        ? data.items.map(
            (item) => ({
              description:
                item.description ||
                "",

              qty:
                Number(item.qty) ||
                0,

              unitPrice:
                Number(
                  item.unitPrice
                ) || 0,
            })
          )
        : [];

    const supplierType =
      data.supplierType ===
      "Subcontractor"
        ? "Subcontractor"
        : "Supplier";

    setForm({
      poNumber:
        data.poNumber || "",

      projectId:
        data.projectId || "",

      projectName:
        data.projectName || "",

      status:
        data.status || "Draft",

      poDate:
        data.poDate || "",

      deliveryDate:
        data.deliveryDate || "",

      supplierType,

      supplier: {
        id:
          supplier.id || "",

        name:
          supplier.name || "",

        abn:
          supplier.abn || "",

        contact:
          supplier.contact || "",

        email:
          supplier.email || "",

        phone:
          supplier.phone || "",

        address:
          supplier.address || "",
      },

      supplierId:
        data.supplierId ||
        supplier.id ||
        "",

      siteAddress:
        data.siteAddress || "",

      items,

      scopeOfWork:
        data.scopeOfWork || "",

      projectManager:
        data.projectManager || "",

      projectManagerEmail:
        data.projectManagerEmail ||
        "",

      siteManager:
        data.siteManager || "",

      siteManagerEmail:
        data.siteManagerEmail ||
        "",
    });

    setParties([]);
    setEditing(false);
    setError("");
  }

  /* =====================================================
     Loading
  ===================================================== */

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-6xl">

          <p className="text-gray-500">
            Loading purchase order...
          </p>

        </div>
      </div>
    );
  }

  /* =====================================================
     Error
  ===================================================== */

  if (
    error &&
    !purchaseOrder
  ) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">

        <div className="mx-auto max-w-6xl">

          <Link
            href="/purchase-orders"
            className="text-sm text-gray-500 hover:text-black"
          >
            ← Purchase Orders
          </Link>

          <div className="mt-6 rounded-xl bg-white p-8 shadow-sm">

            <h1 className="text-2xl font-bold">
              Purchase Order Not Found
            </h1>

            <p className="mt-2 text-gray-500">
              {error}
            </p>

            <p className="mt-4 text-sm text-gray-400">
              PO ID: {params?.id}
            </p>

          </div>

        </div>

      </div>
    );
  }

  /* =====================================================
     PDF Data

     projectName / projectId / status
     are NOT included in PDF.
  ===================================================== */

  const pdfSupplier =
    form.supplier || {};

  const pdfItems =
    form.items.map(
      (item) => {
        const qty =
          Number(item.qty) || 0;

        const unitPrice =
          Number(item.unitPrice) ||
          0;

        return {
          description:
            item.description || "",

          qty,

          unitPrice,

          total:
            qty * unitPrice,
        };
      }
    );

  const poDataForPDF = {
    poNumber:
      form.poNumber,

    poDate:
      form.poDate,

    deliveryDate:
      form.deliveryDate,

    siteAddress:
      form.siteAddress,

    scopeOfWork:
      form.scopeOfWork,

    projectManager:
      form.projectManager,

    projectManagerEmail:
      form.projectManagerEmail,

    siteManager:
      form.siteManager,

    siteManagerEmail:
      form.siteManagerEmail,

    /* -----------------------------------------------
       Supplier / Subcontractor
    ----------------------------------------------- */

    supplierType:
      form.supplierType,

    supplier:
      pdfSupplier,

    items:
      pdfItems,

    subtotal,

    gst,

    total,
  };

  const partyLabel =
    form.supplierType ===
    "Subcontractor"
      ? "Subcontractor"
      : "Supplier";

  /* =====================================================
     Render
  ===================================================== */

  return (
    <div className="min-h-screen bg-gray-50 p-8">

      <div className="mx-auto max-w-6xl">

        {/* =================================================
            Header
        ================================================= */}

        <div className="mb-8 flex items-start justify-between">

          <div>

            <Link
              href="/purchase-orders"
              className="text-sm text-gray-500 hover:text-black"
            >
              ← Purchase Orders
            </Link>

            <h1 className="mt-3 text-3xl font-bold">
              {form.poNumber ||
                "Purchase Order"}
            </h1>

          </div>

          <div className="flex items-center gap-3">

            {!editing && (
              <button
                type="button"
                onClick={() =>
                  setEditing(true)
                }
                className="cursor-pointer rounded-lg bg-indigo-800 px-5 py-2.5 text-sm font-medium text-gray-100 transition hover:bg-amber-400 hover:text-black"
              >
                Edit
              </button>
            )}

            {editing && (
              <>
                <button
                  type="button"
                  onClick={
                    handleCancel
                  }
                  disabled={saving}
                  className="cursor-pointer rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handleSave
                  }
                  disabled={
                    saving ||
                    loadingProjects ||
                    loadingParties
                  }
                  className="cursor-pointer rounded-lg bg-indigo-800 px-5 py-3 text-sm font-medium text-gray-100 transition hover:bg-amber-400 hover:text-black disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </>
            )}

          </div>

        </div>

        {/* =================================================
            Saved Message
        ================================================= */}

        {saved && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            Purchase order changes saved successfully.
          </div>
        )}

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

          <div className="mb-5">

            <h2 className="text-xl font-semibold">
              PO Management
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Project and purchase order status
            </p>

          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            {/* Project */}

            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Project Name
              </label>

              {editing ? (
                loadingProjects ? (
                  <div className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-500">
                    Loading projects...
                  </div>
                ) : projects.length ===
                  0 ? (
                  <div className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    No projects found.
                  </div>
                ) : (
                  <select
                    value={
                      form.projectId
                    }
                    onChange={
                      handleProjectChange
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
                  >
                    <option value="">
                      Select project
                    </option>

                    {projects.map(
                      (project) => {
                        const projectName =
                          project.projectName ||
                          project.name ||
                          "";

                        return (
                          <option
                            key={
                              project.id
                            }
                            value={
                              project.id
                            }
                          >
                            {projectName}
                          </option>
                        );
                      }
                    )}
                  </select>
                )
              ) : (
                <div className="rounded-lg bg-gray-50 px-4 py-3">
                  {form.projectName ||
                    "-"}
                </div>
              )}

            </div>

            {/* Status */}

            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Status
              </label>

              {editing ? (
                <select
                  value={
                    form.status
                  }
                  onChange={(e) =>
                    updateForm(
                      "status",
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-3"
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
              ) : (
                <p className="rounded-lg bg-gray-50 px-4 py-3">
                  {form.status ||
                    "-"}
                </p>
              )}

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

            <Field
              label="PO Number"
              value={
                form.poNumber
              }
              editing={editing}
              onChange={(value) =>
                updateForm(
                  "poNumber",
                  value
                )
              }
            />

            <Field
              label="PO Date"
              type="date"
              value={
                form.poDate
              }
              editing={editing}
              onChange={(value) =>
                updateForm(
                  "poDate",
                  value
                )
              }
            />

            <Field
              label="Delivery Date"
              type="date"
              value={
                form.deliveryDate
              }
              editing={editing}
              onChange={(value) =>
                updateForm(
                  "deliveryDate",
                  value
                )
              }
            />

          </div>

        </section>

        {/* =================================================
            Supplier / Subcontractor
        ================================================= */}

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">

          <div className="mb-5 flex items-center justify-between">

            <div>

              <h2 className="text-xl font-semibold">
                {partyLabel}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {partyLabel} information
              </p>

            </div>

            {!editing &&
              form.supplierId && (
                <Link
                  href={
                    form.supplierType ===
                    "Subcontractor"
                      ? `/subcontractors/${form.supplierId}`
                      : `/suppliers/${form.supplierId}`
                  }
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  View{" "}
                  {partyLabel} →
                </Link>
              )}

          </div>

          {/* ---------------------------------------------
              Type
          --------------------------------------------- */}

          {editing && (
            <div className="mb-5">

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Type
              </label>

              <select
                value={
                  form.supplierType
                }
                onChange={
                  handleSupplierTypeChange
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
              >
                <option value="">
                  Select type
                </option>

                <option value="Supplier">
                  Supplier
                </option>

                <option value="Subcontractor">
                  Subcontractor
                </option>
              </select>

            </div>
          )}

          {/* ---------------------------------------------
              Party Selection
          --------------------------------------------- */}

          {editing && (
            <div className="mb-5">

              <label className="mb-2 block text-sm font-medium text-gray-700">
                {partyLabel}
              </label>

              {loadingParties ? (
                <div className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-500">
                  Loading{" "}
                  {partyLabel.toLowerCase()}
                  s...
                </div>
              ) : parties.length ===
                0 ? (
                <div className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                  No{" "}
                  {partyLabel.toLowerCase()}
                  s found.
                </div>
              ) : (
                <select
                  value={
                    form.supplierId
                  }
                  onChange={
                    handlePartyChange
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
                >
                  <option value="">
                    Select{" "}
                    {partyLabel.toLowerCase()}
                  </option>

                  {parties.map(
                    (party) => (
                      <option
                        key={
                          party.id
                        }
                        value={
                          party.id
                        }
                      >
                        {party.name ||
                          party.companyName ||
                          "Unnamed"}
                      </option>
                    )
                  )}
                </select>
              )}

            </div>
          )}

          {/* ---------------------------------------------
              Party Details
          --------------------------------------------- */}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            <Field
              label={`${partyLabel} Name`}
              value={
                form.supplier.name
              }
              editing={
                editing
              }
              onChange={(value) =>
                updateSupplier(
                  "name",
                  value
                )
              }
            />

            <Field
              label="ABN"
              value={
                form.supplier.abn
              }
              editing={
                editing
              }
              onChange={(value) =>
                updateSupplier(
                  "abn",
                  value
                )
              }
            />

            <Field
              label="Contact"
              value={
                form.supplier.contact
              }
              editing={
                editing
              }
              onChange={(value) =>
                updateSupplier(
                  "contact",
                  value
                )
              }
            />

            <Field
              label="Email"
              type="email"
              value={
                form.supplier.email
              }
              editing={
                editing
              }
              onChange={(value) =>
                updateSupplier(
                  "email",
                  value
                )
              }
            />

            <Field
              label="Phone"
              value={
                form.supplier.phone
              }
              editing={
                editing
              }
              onChange={(value) =>
                updateSupplier(
                  "phone",
                  value
                )
              }
            />

            <Field
              label="Address"
              value={
                form.supplier.address
              }
              editing={
                editing
              }
              onChange={(value) =>
                updateSupplier(
                  "address",
                  value
                )
              }
            />

          </div>

        </section>

        {/* =================================================
            Site Address
        ================================================= */}

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">

          <h2 className="mb-5 text-xl font-semibold">
            Site Address
          </h2>

          {editing ? (
            <textarea
              value={
                form.siteAddress
              }
              onChange={(e) =>
                updateForm(
                  "siteAddress",
                  e.target.value
                )
              }
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3"
              placeholder="Enter site address"
            />
          ) : (
            <div className="rounded-lg bg-gray-50 p-4">

              <p className="whitespace-pre-line">
                {form.siteAddress ||
                  "-"}
              </p>

            </div>
          )}

        </section>

        {/* =================================================
            Order Items
        ================================================= */}

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">

          <div className="mb-5 flex items-center justify-between">

            <div>

              <h2 className="text-xl font-semibold">
                Order Items
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Products, quantities and pricing
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

          {form.items.length ===
          0 ? (
            <p className="text-gray-500">
              No items.
            </p>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full text-sm">

                <thead>

                  <tr className="border-b text-left">

                    <th className="pb-3 pr-4">
                      Description
                    </th>

                    <th className="pb-3 pr-4">
                      Qty
                    </th>

                    <th className="pb-3 pr-4">
                      Unit Price
                    </th>

                    <th className="pb-3 text-right">
                      Total
                    </th>

                    {editing && (
                      <th className="pb-3 pl-4">
                        Action
                      </th>
                    )}

                  </tr>

                </thead>

                <tbody>

                  {form.items.map(
                    (
                      item,
                      index
                    ) => {

                      const qty =
                        Number(
                          item.qty
                        ) || 0;

                      const unitPrice =
                        Number(
                          item.unitPrice
                        ) || 0;

                      const itemTotal =
                        qty *
                        unitPrice;

                      return (
                        <tr
                          key={index}
                          className="border-b last:border-0"
                        >

                          <td className="py-4 pr-4">

                            {editing ? (
                              <input
                                type="text"
                                value={
                                  item.description
                                }
                                onChange={(
                                  e
                                ) =>
                                  updateItem(
                                    index,
                                    "description",
                                    e
                                      .target
                                      .value
                                  )
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                placeholder="Description"
                              />
                            ) : (
                              item.description ||
                              "-"
                            )}

                          </td>

                          <td className="py-4 pr-4">

                            {editing ? (
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={
                                  item.qty
                                }
                                onChange={(
                                  e
                                ) =>
                                  updateItem(
                                    index,
                                    "qty",
                                    e
                                      .target
                                      .value
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
                                value={
                                  item.unitPrice
                                }
                                onChange={(
                                  e
                                ) =>
                                  updateItem(
                                    index,
                                    "unitPrice",
                                    e
                                      .target
                                      .value
                                  )
                                }
                                className="w-32 rounded-lg border border-gray-300 px-3 py-2"
                              />
                            ) : (
                              `$${unitPrice.toFixed(
                                2
                              )}`
                            )}

                          </td>

                          <td className="py-4 text-right font-medium">

                            $
                            {itemTotal.toFixed(
                              2
                            )}

                          </td>

                          {editing && (
                            <td className="py-4 pl-4">

                              <button
                                type="button"
                                onClick={() =>
                                  removeItem(
                                    index
                                  )
                                }
                                className="text-sm text-red-600 hover:underline"
                              >
                                Remove
                              </button>

                            </td>
                          )}

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>
          )}

          {/* Totals */}

          <div className="mt-6 ml-auto max-w-sm border-t pt-5">

            <div className="mb-3 flex justify-between">

              <span className="text-gray-600">
                Subtotal
              </span>

              <span>
                $
                {subtotal.toFixed(
                  2
                )}
              </span>

            </div>

            <div className="mb-3 flex justify-between">

              <span className="text-gray-600">
                GST (10%)
              </span>

              <span>
                $
                {gst.toFixed(
                  2
                )}
              </span>

            </div>

            <div className="flex justify-between text-lg font-bold">

              <span>
                Total
              </span>

              <span>
                $
                {total.toFixed(
                  2
                )}
              </span>

            </div>

          </div>

        </section>

        {/* =================================================
            Scope
        ================================================= */}

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">

          <h2 className="mb-5 text-xl font-semibold">
            Scope of Work
          </h2>

          {editing ? (
            <textarea
              value={
                form.scopeOfWork
              }
              onChange={(e) =>
                updateForm(
                  "scopeOfWork",
                  e.target.value
                )
              }
              rows={8}
              className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3"
              placeholder="Enter scope of work"
            />
          ) : (
            <div className="rounded-lg bg-gray-50 p-5">

              {form.scopeOfWork ? (
                <p className="whitespace-pre-line leading-7">
                  {
                    form.scopeOfWork
                  }
                </p>
              ) : (
                <p className="text-gray-500">
                  No scope of work provided.
                </p>
              )}

            </div>
          )}

        </section>

        {/* =================================================
            YJ Site Contact
        ================================================= */}

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">

          <h2 className="mb-5 text-xl font-semibold">
            YJ Site Contact
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            <Field
              label="Project Manager"
              value={
                form.projectManager
              }
              editing={
                editing
              }
              onChange={(value) =>
                updateForm(
                  "projectManager",
                  value
                )
              }
            />

            <Field
              label="Project Manager Email"
              type="email"
              value={
                form.projectManagerEmail
              }
              editing={
                editing
              }
              onChange={(value) =>
                updateForm(
                  "projectManagerEmail",
                  value
                )
              }
            />

            <Field
              label="Site Manager"
              value={
                form.siteManager
              }
              editing={
                editing
              }
              onChange={(value) =>
                updateForm(
                  "siteManager",
                  value
                )
              }
            />

            <Field
              label="Site Manager Email"
              type="email"
              value={
                form.siteManagerEmail
              }
              editing={
                editing
              }
              onChange={(value) =>
                updateForm(
                  "siteManagerEmail",
                  value
                )
              }
            />

          </div>

        </section>

        {/* =================================================
            PDF Preview
        ================================================= */}

        <section className="mb-10 rounded-xl bg-white p-6 shadow-sm">

          <div className="mb-5 flex items-center justify-between">

            <h2 className="text-xl font-semibold">
              PDF Preview
            </h2>

            <PDFDownloadLink
              document={
                <PurchaseOrderPDF
                  data={
                    poDataForPDF
                  }
                />
              }
              fileName={`${
                form.poNumber ||
                "purchase-order"
              }.pdf`}
              className="cursor-pointer rounded-lg bg-indigo-800 px-5 py-2.5 text-sm font-medium text-gray-100 transition hover:bg-amber-400 hover:text-black"
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

          <div className="h-[900px] overflow-hidden rounded-lg border">

            <PDFViewer
              width="100%"
              height="100%"
              showToolbar
            >
              <PurchaseOrderPDF
                data={
                  poDataForPDF
                }
              />
            </PDFViewer>

          </div>

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
          value={
            value || ""
          }
          onChange={(e) =>
            onChange(
              e.target.value
            )
          }
          className="w-full rounded-lg border border-gray-300 px-4 py-3"
        />
      ) : (
        <p className="rounded-lg bg-gray-50 px-4 py-3">
          {value || "-"}
        </p>
      )}

    </div>
  );
}

