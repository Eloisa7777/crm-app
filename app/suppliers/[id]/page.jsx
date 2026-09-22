"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

export default function SupplierDetailsPage() {
  const params = useParams();

  const [supplier, setSupplier] = useState(null);
  const [purchaseOrders, setPurchaseOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingPOs, setLoadingPOs] = useState(true);

  const [error, setError] = useState("");

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Edit form
  const [form, setForm] = useState({
    name: "",
    abn: "",
    contact: "",
    email: "",
    phone: "",
    address: "",
    status: "Active",
  });

  /* =====================================================
     Load Supplier
  ===================================================== */

  useEffect(() => {
    async function loadSupplier() {
      if (!params?.id) return;

      try {
        setLoading(true);
        setError("");

        const supplierRef = doc(
          db,
          "Suppliers",
          params.id
        );

        const supplierSnap = await getDoc(supplierRef);

        if (!supplierSnap.exists()) {
          setSupplier(null);
          return;
        }

        const data = {
          id: supplierSnap.id,
          ...supplierSnap.data(),
        };

        setSupplier(data);

        setForm({
          name: data.name || "",
          abn: data.abn || "",
          contact: data.contact || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          status: data.status || "Active",
        });

      } catch (error) {
        console.error(
          "Failed to load supplier:",
          error
        );

        setError("Failed to load supplier.");
      } finally {
        setLoading(false);
      }
    }

    loadSupplier();
  }, [params?.id]);


  /* =====================================================
     Load Supplier Purchase Orders
  ===================================================== */

  useEffect(() => {
    async function loadPurchaseOrders() {
      if (!params?.id) return;

      try {
        setLoadingPOs(true);

        /*
          Important:

          PO documents should contain:

          supplierId: "Firebase Supplier Document ID"

          Example:

          supplierId: "giIZzbcTtFnNpig2rMQV"

        */

        const poRef = collection(
          db,
          "purchaseOrders"
        );

        const q = query(
          poRef,
          where("supplierId", "==", params.id)
        );

        const snapshot = await getDocs(q);

        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setPurchaseOrders(data);

      } catch (error) {
        console.error(
          "Failed to load purchase orders:",
          error
        );
      } finally {
        setLoadingPOs(false);
      }
    }

    loadPurchaseOrders();
  }, [params?.id]);


  /* =====================================================
     Update Form
  ===================================================== */

  function updateForm(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }


  /* =====================================================
     Save Supplier
  ===================================================== */

  async function handleSave() {
    if (!params?.id) return;

    try {
      setSaving(true);
      setSaved(false);
      setError("");

      const supplierRef = doc(
        db,
        "Suppliers",
        params.id
      );

      const updatedData = {
        name: form.name.trim(),
        abn: form.abn.trim(),
        contact: form.contact.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        status: form.status,
      };

      await updateDoc(
        supplierRef,
        updatedData
      );

      setSupplier((prev) => ({
        ...prev,
        ...updatedData,
      }));

      setEditing(false);
      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 2500);

    } catch (error) {
      console.error(
        "Failed to update supplier:",
        error
      );

      setError(
        error.message ||
          "Failed to save supplier."
      );
    } finally {
      setSaving(false);
    }
  }


  /* =====================================================
     Cancel Edit
  ===================================================== */

  function handleCancelEdit() {
    setForm({
      name: supplier.name || "",
      abn: supplier.abn || "",
      contact: supplier.contact || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      status: supplier.status || "Active",
    });

    setEditing(false);
  }


  /* =====================================================
     Loading
  ===================================================== */

  if (loading) {
    return (
      <div className="min-h-screen">

        <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center">
          <Link
            href="/suppliers"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Suppliers
          </Link>
        </header>

        <div className="p-8">

          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">

            <p className="text-sm text-gray-500">
              Loading supplier...
            </p>

          </div>

        </div>

      </div>
    );
  }


  /* =====================================================
     Error
  ===================================================== */

  if (error && !supplier) {
    return (
      <div className="min-h-screen">

        <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center">

          <Link
            href="/suppliers"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Suppliers
          </Link>

        </header>

        <div className="p-8">

          <div className="bg-white border border-red-200 rounded-xl p-10 text-center">

            <h1 className="text-lg font-semibold">
              Error
            </h1>

            <p className="text-sm text-red-600 mt-2">
              {error}
            </p>

          </div>

        </div>

      </div>
    );
  }


  /* =====================================================
     Supplier Not Found
  ===================================================== */

  if (!supplier) {
    return (
      <div className="min-h-screen">

        <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center">

          <Link
            href="/suppliers"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Suppliers
          </Link>

        </header>

        <div className="p-8">

          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">

            <h1 className="text-lg font-semibold">
              Supplier not found
            </h1>

            <p className="text-sm text-gray-500 mt-2">
              The supplier you are looking for does not exist.
            </p>

            <p className="text-xs text-gray-400 mt-4">
              Supplier ID: {params?.id}
            </p>

          </div>

        </div>

      </div>
    );
  }


  /* =====================================================
     Calculate PO Total
  ===================================================== */

  const calculatedTotal = purchaseOrders.reduce(
    (sum, po) => {
      return (
        sum +
        (Number(po.total) ||
          Number(po.amount) ||
          0)
      );
    },
    0
  );


  /* =====================================================
     Render
  ===================================================== */

  return (
    <div className="min-h-screen">

      {/* =================================================
          Header
      ================================================= */}

      <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between">

        <div className="flex items-center gap-4">

          <Link
            href="/suppliers"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Suppliers
          </Link>

          <div className="h-5 w-px bg-gray-200" />

          <div>

            <h1 className="text-xl font-semibold text-gray-900">
              {supplier.name}
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Supplier details
            </p>

          </div>

        </div>


        <div className="flex items-center gap-3">

          {saved && (
            <span className="text-sm text-green-600">
              Changes saved
            </span>
          )}

          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800"
            >
              Edit Supplier
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </>
          )}

        </div>

      </header>


      {/* =================================================
          Content
      ================================================= */}

      <div className="p-8">

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}


        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">


          {/* =================================================
              Supplier Information
          ================================================= */}

          <section className="xl:col-span-1 bg-white border border-gray-200 rounded-xl">

            <div className="px-6 py-5 border-b border-gray-200">

              <div className="flex items-center justify-between">

                <div>

                  <h2 className="text-base font-semibold text-gray-900">
                    Supplier Information
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    Contact details
                  </p>

                </div>

                {!editing && (
                  <StatusBadge
                    status={supplier.status}
                  />
                )}

              </div>

            </div>


            <div className="p-6 space-y-5">

              {editing ? (

                <>
                  <EditField
                    label="Supplier Name"
                    value={form.name}
                    onChange={(value) =>
                      updateForm("name", value)
                    }
                  />

                  <EditField
                    label="ABN"
                    value={form.abn}
                    onChange={(value) =>
                      updateForm("abn", value)
                    }
                  />

                  <EditField
                    label="Contact Name"
                    value={form.contact}
                    onChange={(value) =>
                      updateForm("contact", value)
                    }
                  />

                  <EditField
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(value) =>
                      updateForm("email", value)
                    }
                  />

                  <EditField
                    label="Phone"
                    value={form.phone}
                    onChange={(value) =>
                      updateForm("phone", value)
                    }
                  />

                  <div>

                    <label className="text-xs font-medium text-gray-400 uppercase">
                      Address
                    </label>

                    <textarea
                      value={form.address}
                      onChange={(e) =>
                        updateForm(
                          "address",
                          e.target.value
                        )
                      }
                      rows={3}
                      className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200 resize-none"
                    />

                  </div>

                  <div>

                    <label className="text-xs font-medium text-gray-400 uppercase">
                      Status
                    </label>

                    <select
                      value={form.status}
                      onChange={(e) =>
                        updateForm(
                          "status",
                          e.target.value
                        )
                      }
                      className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                    >

                      <option value="Active">
                        Active
                      </option>

                      <option value="Inactive">
                        Inactive
                      </option>

                    </select>

                  </div>
                </>

              ) : (

                <>
                  <InfoItem
                    label="Supplier Name"
                    value={supplier.name}
                  />

                  <InfoItem
                    label="ABN"
                    value={supplier.abn}
                  />

                  <InfoItem
                    label="Contact Name"
                    value={supplier.contact}
                  />

                  <InfoItem
                    label="Email"
                    value={supplier.email}
                  />

                  <InfoItem
                    label="Phone"
                    value={supplier.phone}
                  />

                  <InfoItem
                    label="Address"
                    value={supplier.address}
                  />
                </>

              )}

            </div>

          </section>


          {/* =================================================
              Purchase Orders
          ================================================= */}

          <section className="xl:col-span-2 bg-white border border-gray-200 rounded-xl">

            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">

              <div>

                <h2 className="text-base font-semibold text-gray-900">
                  Purchase Orders
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Purchase orders associated with this supplier
                </p>

              </div>

              <Link
                href="/purchase-orders/new"
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800"
              >
                + New PO
              </Link>

            </div>


            <div className="overflow-x-auto">

              <table className="w-full text-sm">

                <thead>

                  <tr className="border-b border-gray-200 bg-gray-50 text-left">

                    <th className="px-6 py-3 font-medium text-gray-500">
                      PO Number
                    </th>

                    <th className="px-6 py-3 font-medium text-gray-500">
                      Project
                    </th>

                    <th className="px-6 py-3 font-medium text-gray-500">
                      Date
                    </th>

                    <th className="px-6 py-3 font-medium text-gray-500">
                      Amount
                    </th>

                    <th className="px-6 py-3 font-medium text-gray-500">
                      Status
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {loadingPOs ? (

                    <tr>
                      <td
                        colSpan="5"
                        className="px-6 py-10 text-center text-sm text-gray-500"
                      >
                        Loading purchase orders...
                      </td>
                    </tr>

                  ) : purchaseOrders.length === 0 ? (

                    <tr>
                      <td
                        colSpan="5"
                        className="px-6 py-10 text-center text-sm text-gray-500"
                      >
                        No purchase orders found.
                      </td>
                    </tr>

                  ) : (

                    purchaseOrders.map((po) => (

                      <tr
                        key={po.id}
                        onClick={() =>
                          (window.location.href =
                            `/purchase-orders/${po.id}`)
                        }
                        className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                      >

                        <td className="px-6 py-4">

                          <div className="font-medium text-gray-900">
                            {po.poNumber || "-"}
                          </div>

                        </td>

                        <td className="px-6 py-4 text-gray-700">
                          {po.projectName || "-"}
                        </td>

                        <td className="px-6 py-4 text-gray-500">
                          {po.poDate || "-"}
                        </td>

                        <td className="px-6 py-4 font-medium text-gray-900">
                          {formatCurrency(
                            po.total ??
                            po.amount ??
                            0
                          )}
                        </td>

                        <td className="px-6 py-4">

                          <StatusBadge
                            status={
                              po.status ||
                              "Draft"
                            }
                          />

                        </td>

                      </tr>

                    ))

                  )}

                </tbody>

              </table>

            </div>

          </section>

        </div>


        {/* =================================================
            Summary
        ================================================= */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">

          <div className="bg-white border border-gray-200 rounded-xl p-6">

            <div className="text-sm text-gray-500">
              Total Purchase Orders
            </div>

            <div className="text-2xl font-semibold text-gray-900 mt-2">
              {purchaseOrders.length}
            </div>

          </div>


          <div className="bg-white border border-gray-200 rounded-xl p-6">

            <div className="text-sm text-gray-500">
              Total PO Value
            </div>

            <div className="text-2xl font-semibold text-gray-900 mt-2">
              {formatCurrency(calculatedTotal)}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}


/* =====================================================
   Edit Field
===================================================== */

function EditField({
  label,
  type = "text",
  value,
  onChange,
}) {
  return (
    <div>

      <label className="text-xs font-medium text-gray-400 uppercase">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200"
      />

    </div>
  );
}


/* =====================================================
   Info Item
===================================================== */

function InfoItem({ label, value }) {
  return (
    <div>

      <div className="text-xs font-medium text-gray-400 uppercase">
        {label}
      </div>

      <div className="text-sm text-gray-900 mt-1">
        {value || "-"}
      </div>

    </div>
  );
}


/* =====================================================
   Status Badge
===================================================== */

function StatusBadge({ status }) {
  const styles = {
    Draft:
      "bg-gray-100 text-gray-700",

    Issued:
      "bg-blue-50 text-blue-700",

    Approved:
      "bg-purple-50 text-purple-700",

    Completed:
      "bg-green-50 text-green-700",

    Paid:
      "bg-green-50 text-green-700",

    Cancelled:
      "bg-red-50 text-red-700",

    Active:
      "bg-green-50 text-green-700",

    Inactive:
      "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
        styles[status] ||
        "bg-gray-100 text-gray-600"
      }`}
    >
      {status || "Draft"}
    </span>
  );
}


/* =====================================================
   Currency
===================================================== */

function formatCurrency(value) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(Number(value) || 0);
}

