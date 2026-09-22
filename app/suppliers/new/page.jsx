"use client";

import Link from "next/link";
import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { db } from "@/lib/firebase";

export default function NewSupplierPage() {
const [form, setForm] = useState({
  projectName: "",
  status: "Draft",

  poNumber: "",
  poDate: new Date().toISOString().split("T")[0],
  deliveryDate: "",
  siteAddress: "",
  scopeOfWork: "",
  projectManager: "",
  projectManagerEmail: "",
  siteManager: "",
  siteManagerEmail: "",
});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateForm(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setSaving(true);

    try {
      //podata
      const poData = {
        projectName: form.projectName,

        // 第一次生成永远 Draft
        status: "Draft",

        poNumber: form.poNumber.trim(),
        poDate: form.poDate,
        deliveryDate: form.deliveryDate,

        siteAddress: form.siteAddress,

        scopeOfWork: form.scopeOfWork,

        projectManager: form.projectManager,
        projectManagerEmail: form.projectManagerEmail,

        siteManager: form.siteManager,
        siteManagerEmail: form.siteManagerEmail,

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

        createdAt: serverTimestamp(),
      };
      // Create supplier in Firebase
      const docRef = await addDoc(collection(db, "Suppliers"), {
        name: form.name,
        abn: form.abn,
        contact: form.contact,
        email: form.email,
        phone: form.phone,
        address: form.address,
        status: form.status,

        // Initial values
        orders: 0,
        total: 0,

        // Created time
        createdAt: serverTimestamp(),
      });

      console.log("Supplier created:", docRef.id);

      alert("Supplier saved successfully.");

      // Go back to supplier list
      window.location.href = "/suppliers";
    } catch (err) {
      console.error("Error creating supplier:", err);

      setError(
        err.message || "Failed to save supplier."
      );

      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">

      {/* Header */}
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
              New Supplier
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Add a new supplier
            </p>
          </div>

        </div>

      </header>

       <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold">
            PO Management
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            <div>
              <label className="mb-2 block text-sm font-medium">
                Project Name
              </label>

              <input
                type="text"
                name="projectName"
                value={form.projectName}
                onChange={handleChange}
                placeholder="Enter project name"
                className="w-full rounded-lg border px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Status
              </label>

              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full rounded-lg border px-4 py-3"
              >
                <option value="Draft">Draft</option>
                <option value="Issued">Issued</option>
                <option value="Approved">Approved</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

          </div>
        </section>
      {/* Form */}
      <form onSubmit={handleSubmit}>

        <div className="p-8 max-w-5xl">

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">
                {error}
              </p>
            </div>
          )}


          {/* Supplier Information */}
          <section className="bg-white border border-gray-200 rounded-xl mb-6">

            <div className="px-6 py-5 border-b border-gray-200">

              <h2 className="text-base font-semibold text-gray-900">
                Supplier Information
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Basic supplier details
              </p>

            </div>

            <div className="p-6">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                <FormField
                  label="Supplier Name"
                  required
                  value={form.name}
                  onChange={(value) =>
                    updateForm("name", value)
                  }
                  placeholder="ABC Plasterboard Supplies"
                />

                <FormField
                  label="ABN"
                  value={form.abn}
                  onChange={(value) =>
                    updateForm("abn", value)
                  }
                  placeholder="12 345 678 901"
                />

                <FormField
                  label="Contact Name"
                  value={form.contact}
                  onChange={(value) =>
                    updateForm("contact", value)
                  }
                  placeholder="John Smith"
                />

                <FormField
                  label="Phone"
                  value={form.phone}
                  onChange={(value) =>
                    updateForm("phone", value)
                  }
                  placeholder="07 3123 4567"
                />

                <div className="md:col-span-2">

                  <FormField
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(value) =>
                      updateForm("email", value)
                    }
                    placeholder="accounts@supplier.com.au"
                  />

                </div>

                <div className="md:col-span-2">

                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>

                  <textarea
                    value={form.address}
                    onChange={(e) =>
                      updateForm("address", e.target.value)
                    }
                    rows={3}
                    placeholder="Supplier address"
                    className="input resize-none"
                  />

                </div>

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>

                  <select
                    value={form.status}
                    onChange={(e) =>
                      updateForm("status", e.target.value)
                    }
                    className="input"
                  >
                    <option value="Active">
                      Active
                    </option>

                    <option value="Inactive">
                      Inactive
                    </option>
                  </select>

                </div>

              </div>

            </div>

          </section>


          {/* Notes */}
          <section className="bg-white border border-gray-200 rounded-xl mb-6">

            <div className="px-6 py-5 border-b border-gray-200">

              <h2 className="text-base font-semibold text-gray-900">
                Supplier Notes
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Additional information can be added later
              </p>

            </div>

            <div className="p-6">

              <textarea
                rows={4}
                placeholder="Add notes about this supplier..."
                className="input resize-none"
              />

            </div>

          </section>


          {/* Actions */}
          <div className="flex items-center justify-end gap-3">

            <Link
              href="/suppliers"
              className="px-5 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Supplier"}
            </button>

          </div>

        </div>

      </form>

    </div>
  );
}


/* =========================
   Form Field
========================= */

function FormField({
  label,
  required = false,
  type = "text",
  value,
  onChange,
  placeholder,
}) {
  return (
    <div>

      <label className="block text-sm font-medium text-gray-700 mb-2">

        {label}

        {required && (
          <span className="text-red-500 ml-1">
            *
          </span>
        )}

      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="input"
      />

    </div>
  );
}