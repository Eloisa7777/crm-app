
"use client";

import Link from "next/link";
import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { db } from "@/lib/firebase";

export default function NewClientPage() {
  const [form, setForm] = useState({
    name: "",
    abn: "",
    contacts: [],
    address: "",
    status: "Active",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ============================================================
  // Update Client Information
  // ============================================================

  function updateForm(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  // ============================================================
  // Contact Management
  // ============================================================

  function updateContact(index, field, value) {
    setForm((prev) => ({
      ...prev,
      contacts: prev.contacts.map((item, i) =>
        i === index
          ? { ...item, [field]: value }
          : item
      ),
    }));
  }

  function addContact() {
    setForm((prev) => ({
      ...prev,
      contacts: [
        ...prev.contacts,
        {
          contactName: "",
          email: "",
          phone: "",
        },
      ],
    }));
  }

  function removeContact(index) {
    setForm((prev) => ({
      ...prev,
      contacts: prev.contacts.filter(
        (_, i) => i !== index
      ),
    }));
  }

  // ============================================================
  // Save Client
  // ============================================================

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setSaving(true);

    try {
      const contacts = form.contacts
        .map((item) => ({
          contactName: item.contactName.trim(),
          email: item.email.trim(),
          phone: item.phone.trim(),
        }))
        .filter(
          (item) =>
            item.contactName ||
            item.email ||
            item.phone
        );

      const docRef = await addDoc(
        collection(db, "Clients"),
        {
          name: form.name.trim(),
          abn: form.abn.trim(),
          contacts,
          address: form.address.trim(),
          status: form.status,

          // Initial values
          orders: 0,
          total: 0,

          // Created time
          createdAt: serverTimestamp(),
        }
      );

      console.log("Client created:", docRef.id);

      alert("Client saved successfully.");

      window.location.href = "/clients";
    } catch (err) {
      console.error("Error creating client:", err);

      setError(
        err.message || "Failed to save client."
      );

      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">

      {/* ========================================================
          Header
      ======================================================== */}

      <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between">

        <div className="flex items-center gap-4">

          <Link
            href="/clients"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Clients
          </Link>

          <div className="h-5 w-px bg-gray-200" />

          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              New Client
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Add a new client
            </p>
          </div>

        </div>

      </header>

      {/* ========================================================
          Form
      ======================================================== */}

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

          {/* ====================================================
              Client Information
          ==================================================== */}

          <section className="bg-white border border-gray-200 rounded-xl mb-6">

            <div className="px-6 py-5 border-b border-gray-200">

              <h2 className="text-base font-semibold text-gray-900">
                Client Information
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Basic client details
              </p>

            </div>

            <div className="p-6">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                <FormField
                  label="Client Name"
                  required
                  value={form.name}
                  onChange={(value) =>
                    updateForm("name", value)
                  }
                  placeholder="ABC Pty Ltd"
                />

                <FormField
                  label="ABN"
                  value={form.abn}
                  onChange={(value) =>
                    updateForm("abn", value)
                  }
                  placeholder="12 345 678 901"
                />

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
                    placeholder="Client address"
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

          {/* ====================================================
              Contacts
          ==================================================== */}

          <section className="bg-white border border-gray-200 rounded-xl mb-6">

            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">

              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Contacts
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Manage client contact details
                </p>
              </div>

              <button
                type="button"
                onClick={addContact}
                className="px-4 py-2 text-sm font-medium text-indigo-800 border border-indigo-200 rounded-lg hover:bg-indigo-50"
              >
                + Add Contact
              </button>

            </div>

            <div className="p-6">

              {form.contacts.length > 0 ? (

                <div className="overflow-x-auto">

                  <table className="w-full text-sm">

                    <thead>
                      <tr className="border-b border-gray-200 text-left text-gray-500">

                        <th className="px-3 py-3 font-medium">
                          Contact Name
                        </th>

                        <th className="px-3 py-3 font-medium">
                          Email
                        </th>

                        <th className="px-3 py-3 font-medium">
                          Phone
                        </th>

                        <th className="w-12 px-2 py-3"></th>

                      </tr>
                    </thead>

                    <tbody>

                      {form.contacts.map((item, index) => (

                        <tr
                          key={index}
                          className="border-b border-gray-100"
                        >

                          <td className="p-2 min-w-40">
                            <input
                              type="text"
                              value={item.contactName}
                              onChange={(e) =>
                                updateContact(
                                  index,
                                  "contactName",
                                  e.target.value
                                )
                              }
                              placeholder="John Smith"
                              className="input"
                            />
                          </td>

                          <td className="p-2 min-w-48">
                            <input
                              type="email"
                              value={item.email}
                              onChange={(e) =>
                                updateContact(
                                  index,
                                  "email",
                                  e.target.value
                                )
                              }
                              placeholder="john@example.com"
                              className="input"
                            />
                          </td>

                          <td className="p-2 min-w-40">
                            <input
                              type="text"
                              value={item.phone}
                              onChange={(e) =>
                                updateContact(
                                  index,
                                  "phone",
                                  e.target.value
                                )
                              }
                              placeholder="07 3123 4567"
                              className="input"
                            />
                          </td>

                          <td className="px-2 py-3 text-center">

                            <button
                              type="button"
                              onClick={() =>
                                removeContact(index)
                              }
                              className="text-red-500 hover:text-red-700"
                              title="Remove Contact"
                            >
                              ✕
                            </button>

                          </td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

              ) : (

                <div className="py-8 text-center text-sm text-gray-400">
                  No contacts added yet.
                </div>

              )}

            </div>

          </section>

          {/* ====================================================
              Notes
          ==================================================== */}

          <section className="bg-white border border-gray-200 rounded-xl mb-6">

            <div className="px-6 py-5 border-b border-gray-200">

              <h2 className="text-base font-semibold text-gray-900">
                Client Notes
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Additional information can be added later
              </p>

            </div>

            <div className="p-6">

              <textarea
                rows={4}
                placeholder="Add notes about this client..."
                className="input resize-none"
              />

            </div>

          </section>

          {/* ====================================================
              Actions
          ==================================================== */}

          <div className="flex items-center justify-end gap-3">

            <Link
              href="/clients"
              className="px-5 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-800 px-5 py-2.5 text-sm font-medium text-gray-100 transition hover:bg-amber-400 hover:text-black cursor-pointer disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Client"}
            </button>

          </div>

        </div>

      </form>

    </div>
  );
}


/* ============================================================
   Form Field
============================================================ */

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
