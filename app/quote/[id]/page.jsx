
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

/* =====================================================
   Status Options
===================================================== */

const STATUS_OPTIONS = [
  { value: "Pending", label: "Pending Tender" },
  { value: "Tendering", label: "Tendering" },
  { value: "Submitted", label: "Submitted" },
  { value: "onHold", label: "On Hold" },
  { value: "awarded", label: "Awarded" },
  { value: "unsuccessful", label: "Unsuccessful" },
];

/* =====================================================
   Format Date
===================================================== */

function formatDate(value) {
  if (!value) return "-";

  if (typeof value === "string") {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  if (value?.toDate) {
    return value.toDate().toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  return "-";
}

/* =====================================================
   Convert Date Value For Input
===================================================== */

function normalizeDateInput(value) {
  if (!value) return "";

  if (typeof value === "string") {
    return value.includes("T") ? value.split("T")[0] : value;
  }

  if (value?.toDate) {
    const date = value.toDate();

    return date.toISOString().split("T")[0];
  }

  return "";
}

/* =====================================================
   Create Form From Quote
===================================================== */

function createFormFromQuote(data) {
  return {
    projectName: data.projectName || "",
    status: data.status || "Pending",

    dueDate: normalizeDateInput(data.dueDate),

    siteAddress: data.siteAddress || "",

    note: data.note || "",

    estimator: data.estimator || "",

    cpOnlyRate: data.cpOnlyRate || "",
    cpCarpentryRate: data.cpCarpentryRate || "",
    cpCarpentryExternalRate: data.cpCarpentryExternalRate || "",
    cpCarpentryPrelimsRate: data.cpCarpentryPrelimsRate || "",
    cpCarpentryExternalPrelimsRate:
      data.cpCarpentryExternalPrelimsRate || "",

    totalSqmInternal: data.totalSqmInternal || "",
    totalSqmExternal: data.totalSqmExternal || "",
    esttotalvalue: data.esttotalvalue || "",
    margin: data.margin || "",

    clientId: data.clientId || "",
    client: data.client || null,

    items: Array.isArray(data.items)
      ? data.items.map((item) => ({
          date: normalizeDateInput(item?.date),
          action: item?.action || "",
        }))
      : [],
  };
}

/* =====================================================
   Reusable Field
===================================================== */

function Field({
  label,
  value,
  onChange,
  type = "text",
  prefix,
  suffix,
  placeholder,
  disabled = false,
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
            {prefix}
          </span>
        )}

        <input
          type={type}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-1 focus:ring-black disabled:bg-gray-100 disabled:text-gray-500 ${
            prefix ? "pl-7" : ""
          } ${suffix ? "pr-8" : ""}`}
        />

        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

/* =====================================================
   Textarea Field
===================================================== */

function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
  disabled = false,
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-1 focus:ring-black disabled:bg-gray-100 disabled:text-gray-500"
      />
    </div>
  );
}

/* =====================================================
   Display Field
===================================================== */

function DisplayField({ label, value, prefix, suffix }) {
  return (
    <div>
      <div className="mb-1.5 text-sm font-medium text-gray-500">
        {label}
      </div>

      <div className="min-h-[42px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900">
        {value !== "" && value !== null && value !== undefined
          ? `${prefix || ""}${value}${suffix || ""}`
          : "-"}
      </div>
    </div>
  );
}

/* =====================================================
   Client Snapshot
===================================================== */

function ClientSnapshot({ client }) {
  if (!client) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-500">
        No client selected.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
      <div className="mb-4">
        <div className="text-base font-semibold text-gray-900">
          {client.name || "-"}
        </div>

        {client.abn && (
          <div className="mt-1 text-sm text-gray-500">
            ABN: {client.abn}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Contact
          </div>
          <div className="mt-1 text-sm text-gray-800">
            {client.contact || "-"}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Email
          </div>
          <div className="mt-1 text-sm text-gray-800">
            {client.email || "-"}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Phone
          </div>
          <div className="mt-1 text-sm text-gray-800">
            {client.phone || "-"}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Address
          </div>
          <div className="mt-1 whitespace-pre-line text-sm text-gray-800">
            {client.address || "-"}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   Quote Detail Page
===================================================== */

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();

  const id = params?.id;

  const [quote, setQuote] = useState(null);
  const [clients, setClients] = useState([]);

  const [form, setForm] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  /* =====================================================
     Load Quote + Clients
  ===================================================== */

  useEffect(() => {
    if (!id) return;

    async function loadData() {
      try {
        setLoading(true);

        const quoteRef = doc(db, "quote", id);
        const quoteSnap = await getDoc(quoteRef);

        if (!quoteSnap.exists()) {
          alert("Quote not found.");
          router.push("/quote");
          return;
        }

        const quoteData = {
          id: quoteSnap.id,
          ...quoteSnap.data(),
        };

        setQuote(quoteData);
        setForm(createFormFromQuote(quoteData));

        const clientsSnap = await getDocs(
          collection(db, "Clients")
        );

        const clientList = clientsSnap.docs.map((clientDoc) => ({
          id: clientDoc.id,
          ...clientDoc.data(),
        }));

        setClients(clientList);
      } catch (error) {
        console.error("Failed to load quote:", error);
        alert("Failed to load quote.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, router]);

  /* =====================================================
     Update Form
  ===================================================== */

  function updateField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  /* =====================================================
     Client Change
  ===================================================== */

  function handleClientChange(clientId) {
    if (!clientId) {
      setForm((prev) => ({
        ...prev,
        clientId: "",
        client: null,
      }));

      return;
    }

    const selectedClient = clients.find(
      (client) => client.id === clientId
    );

    if (!selectedClient) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      clientId: selectedClient.id,
      client: {
        id: selectedClient.id,
        name: selectedClient.name || "",
        abn: selectedClient.abn || "",
        contact: selectedClient.contact || "",
        email: selectedClient.email || "",
        phone: selectedClient.phone || "",
        address: selectedClient.address || "",
      },
    }));
  }

  /* =====================================================
     Note Line Count
  ===================================================== */

  const noteLineCount = form?.note
    ? form.note.split("\n").length
    : 0;

  /* =====================================================
     Add Action
  ===================================================== */

  function addItem() {
    setForm((prev) => ({
      ...prev,
      items: [
        ...(prev.items || []),
        {
          date: "",
          action: "",
        },
      ],
    }));
  }

  /* =====================================================
     Update Action
  ===================================================== */

  function updateItem(index, field, value) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      ),
    }));
  }

  /* =====================================================
     Remove Action
  ===================================================== */

  function removeItem(index) {
    setForm((prev) => {
      if (prev.items.length <= 1) {
        return prev;
      }

      return {
        ...prev,
        items: prev.items.filter(
          (_, itemIndex) => itemIndex !== index
        ),
      };
    });
  }

  /* =====================================================
     Start Editing
  ===================================================== */

  function startEditing() {
    setForm((prev) => ({
      ...prev,
      items:
        prev.items && prev.items.length > 0
          ? prev.items
          : [
              {
                date: "",
                action: "",
              },
            ],
    }));

    setEditing(true);
  }

  /* =====================================================
     Cancel Editing
  ===================================================== */

  function cancelEditing() {
    if (!quote) return;

    setForm(createFormFromQuote(quote));
    setEditing(false);
  }

  /* =====================================================
     Save
  ===================================================== */

  async function handleSave() {
    if (!id || !form) return;

    if (!form.projectName.trim()) {
      alert("Please enter Project Name.");
      return;
    }

    if (noteLineCount > 20) {
      alert("Note cannot exceed 20 lines.");
      return;
    }

    if (form.clientId) {
      const selectedClient = clients.find(
        (client) => client.id === form.clientId
      );

      if (!selectedClient) {
        alert("Selected client could not be found.");
        return;
      }
    }

    try {
      setSaving(true);

      const selectedClient = form.clientId
        ? clients.find((client) => client.id === form.clientId)
        : null;

      const clientSnapshot = selectedClient
        ? {
            id: selectedClient.id,
            name: selectedClient.name || "",
            abn: selectedClient.abn || "",
            contact: selectedClient.contact || "",
            email: selectedClient.email || "",
            phone: selectedClient.phone || "",
            address: selectedClient.address || "",
          }
        : null;

      const cleanedItems = (form.items || [])
        .filter((item) => item.date || item.action)
        .map((item) => ({
          date: item.date || "",
          action: item.action || "",
        }));

      const updatedData = {
        projectName: form.projectName,
        status: form.status,

        dueDate: form.dueDate || "",

        siteAddress: form.siteAddress,

        note: form.note,

        estimator: form.estimator,

        cpOnlyRate: form.cpOnlyRate,
        cpCarpentryRate: form.cpCarpentryRate,
        cpCarpentryExternalRate:
          form.cpCarpentryExternalRate,
        cpCarpentryPrelimsRate:
          form.cpCarpentryPrelimsRate,
        cpCarpentryExternalPrelimsRate:
          form.cpCarpentryExternalPrelimsRate,

        totalSqmInternal: form.totalSqmInternal,
        totalSqmExternal: form.totalSqmExternal,
        esttotalvalue: form.esttotalvalue,
        margin: form.margin,

        clientId: selectedClient ? selectedClient.id : "",
        client: clientSnapshot,

        items: cleanedItems,
      };

      await updateDoc(doc(db, "quote", id), {
        ...updatedData,
        updatedAt: serverTimestamp(),
      });

      const updatedQuote = {
        ...quote,
        ...updatedData,
      };

      setQuote(updatedQuote);
      setForm(createFormFromQuote(updatedQuote));
      setEditing(false);
    } catch (error) {
      console.error("Failed to save quote:", error);
      alert("Failed to save quote.");
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     Loading
  ===================================================== */

  if (loading || !form) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">
          Loading quote...
        </div>
      </div>
    );
  }

  /* =====================================================
     Status Label
  ===================================================== */

  const statusLabel =
    STATUS_OPTIONS.find(
      (option) => option.value === form.status
    )?.label || form.status;

  /* =====================================================
     Page
  ===================================================== */

  return (
    <div className="min-h-screen bg-gray-50">
      {/* =================================================
          Header
      ================================================= */}

      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="mb-1 text-sm text-gray-500">
                <Link
                  href="/quote"
                  className="hover:text-black"
                >
                  Quote Management
                </Link>

                <span className="mx-2">/</span>

                <span>Quote Detail</span>
              </div>

              <h1 className="text-2xl font-semibold text-gray-900">
                {form.projectName || "Quote"}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/quote"
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Back
              </Link>

              {!editing ? (
                <button
                  type="button"
                  onClick={startEditing}
                  className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
                >
                  Edit
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    disabled={saving}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =================================================
          Main
      ================================================= */}

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="space-y-6">
          {/* =================================================
              Quote Management
          ================================================= */}

          <section className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Quote Management
              </h2>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {editing ? (
                  <>
                    <Field
                      label="Project Name"
                      value={form.projectName}
                      onChange={(value) =>
                        updateField("projectName", value)
                      }
                    />

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Status
                      </label>

                      <select
                        value={form.status}
                        onChange={(e) =>
                          updateField("status", e.target.value)
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-1 focus:ring-black"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <DisplayField
                      label="Project Name"
                      value={form.projectName}
                    />

                    <DisplayField
                      label="Status"
                      value={statusLabel}
                    />
                  </>
                )}
              </div>

              <div className="mt-5">
                {editing ? (
                  <TextAreaField
                    label="Site Address"
                    value={form.siteAddress}
                    onChange={(value) =>
                      updateField("siteAddress", value)
                    }
                    rows={3}
                  />
                ) : (
                  <div>
                    <div className="mb-1.5 text-sm font-medium text-gray-500">
                      Site Address
                    </div>

                    <div className="min-h-[72px] whitespace-pre-line rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900">
                      {form.siteAddress || "-"}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* =================================================
              Client
          ================================================= */}

          <section className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Client
              </h2>
            </div>

            <div className="p-6">
              {editing && (
                <div className="mb-5">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Select Client
                  </label>

                  <select
                    value={form.clientId || ""}
                    onChange={(e) =>
                      handleClientChange(e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-1 focus:ring-black"
                  >
                    <option value="">
                      No client selected
                    </option>

                    {clients.map((client) => (
                      <option
                        key={client.id}
                        value={client.id}
                      >
                        {client.name || client.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <ClientSnapshot client={form.client} />
            </div>
          </section>

          {/* =================================================
              Quote Information
          ================================================= */}

          <section className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Quote Information
              </h2>
            </div>

            <div className="space-y-8 p-6">
              {/* =================================================
                  Quote Info
              ================================================= */}

              <div>
                <h3 className="mb-4 text-base font-semibold text-gray-900">
                  Quote Info
                </h3>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {editing ? (
                    <>
                      <Field
                        label="Estimator"
                        value={form.estimator}
                        onChange={(value) =>
                          updateField("estimator", value)
                        }
                      />

                      <Field
                        label="Due Date"
                        type="date"
                        value={form.dueDate}
                        onChange={(value) =>
                          updateField("dueDate", value)
                        }
                      />
                    </>
                  ) : (
                    <>
                      <DisplayField
                        label="Estimator"
                        value={form.estimator}
                      />

                      <DisplayField
                        label="Due Date"
                        value={formatDate(form.dueDate)}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* =================================================
                  Project SQM Rate
              ================================================= */}

              <div>
                <h3 className="mb-4 text-base font-semibold text-gray-900">
                  Project SQM Rate
                </h3>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {editing ? (
                    <>
                      <Field
                        label="C&P only"
                        type="number"
                        value={form.cpOnlyRate}
                        onChange={(value) =>
                          updateField("cpOnlyRate", value)
                        }
                        prefix="$"
                      />

                      <Field
                        label="C&P + Carpentry"
                        type="number"
                        value={form.cpCarpentryRate}
                        onChange={(value) =>
                          updateField("cpCarpentryRate", value)
                        }
                        prefix="$"
                      />

                      <Field
                        label="C&P + Carpentry + External work"
                        type="number"
                        value={form.cpCarpentryExternalRate}
                        onChange={(value) =>
                          updateField(
                            "cpCarpentryExternalRate",
                            value
                          )
                        }
                        prefix="$"
                      />

                      <Field
                        label="C&P + Carpentry + Prelims"
                        type="number"
                        value={form.cpCarpentryPrelimsRate}
                        onChange={(value) =>
                          updateField(
                            "cpCarpentryPrelimsRate",
                            value
                          )
                        }
                        prefix="$"
                      />

                      <Field
                        label="C&P + Carpentry + External + Prelims"
                        type="number"
                        value={
                          form.cpCarpentryExternalPrelimsRate
                        }
                        onChange={(value) =>
                          updateField(
                            "cpCarpentryExternalPrelimsRate",
                            value
                          )
                        }
                        prefix="$"
                      />
                    </>
                  ) : (
                    <>
                      <DisplayField
                        label="C&P only"
                        value={form.cpOnlyRate}
                        prefix="$"
                      />

                      <DisplayField
                        label="C&P + Carpentry"
                        value={form.cpCarpentryRate}
                        prefix="$"
                      />

                      <DisplayField
                        label="C&P + Carpentry + External work"
                        value={form.cpCarpentryExternalRate}
                        prefix="$"
                      />

                      <DisplayField
                        label="C&P + Carpentry + Prelims"
                        value={form.cpCarpentryPrelimsRate}
                        prefix="$"
                      />

                      <DisplayField
                        label="C&P + Carpentry + External + Prelims"
                        value={
                          form.cpCarpentryExternalPrelimsRate
                        }
                        prefix="$"
                      />
                    </>
                  )}
                </div>
              </div>

              {/* =================================================
                  Project Summary
              ================================================= */}

              <div>
                <h3 className="mb-4 text-base font-semibold text-gray-900">
                  Project Summary
                </h3>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {editing ? (
                    <>
                      <Field
                        label="Total sqm internal"
                        type="number"
                        value={form.totalSqmInternal}
                        onChange={(value) =>
                          updateField(
                            "totalSqmInternal",
                            value
                          )
                        }
                        suffix="m²"
                      />

                      <Field
                        label="Total sqm external"
                        type="number"
                        value={form.totalSqmExternal}
                        onChange={(value) =>
                          updateField(
                            "totalSqmExternal",
                            value
                          )
                        }
                        suffix="m²"
                      />

                      <Field
                        label="Est. Total value"
                        type="number"
                        value={form.esttotalvalue}
                        onChange={(value) =>
                          updateField(
                            "esttotalvalue",
                            value
                          )
                        }
                        prefix="$"
                      />

                      <Field
                        label="Margin"
                        type="number"
                        value={form.margin}
                        onChange={(value) =>
                          updateField("margin", value)
                        }
                        suffix="%"
                      />
                    </>
                  ) : (
                    <>
                      <DisplayField
                        label="Total sqm internal"
                        value={form.totalSqmInternal}
                        suffix=" m²"
                      />

                      <DisplayField
                        label="Total sqm external"
                        value={form.totalSqmExternal}
                        suffix=" m²"
                      />

                      <DisplayField
                        label="Est. Total value"
                        value={form.esttotalvalue}
                        prefix="$"
                      />

                      <DisplayField
                        label="Margin"
                        value={form.margin}
                        suffix="%"
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              Note
          ================================================= */}

          <section className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Note
              </h2>
            </div>

            <div className="p-6">
              {editing ? (
                <>
                  <textarea
                    value={form.note}
                    onChange={(e) => {
                      const value = e.target.value;

                      if (value.split("\n").length <= 20) {
                        updateField("note", value);
                      }
                    }}
                    rows={8}
                    placeholder="Enter note..."
                    className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-1 focus:ring-black"
                  />

                  <div
                    className={`mt-2 text-right text-xs ${
                      noteLineCount >= 20
                        ? "text-red-500"
                        : "text-gray-400"
                    }`}
                  >
                    {noteLineCount}/20 lines
                  </div>
                </>
              ) : (
                <div className="min-h-[100px] whitespace-pre-line rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800">
                  {form.note || "-"}
                </div>
              )}
            </div>
          </section>

          {/* =================================================
              Follow Up / Actions
          ================================================= */}

          <section className="rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Follow Up / Actions
              </h2>

              {editing && (
                <button
                  type="button"
                  onClick={addItem}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  + Add Action
                </button>
              )}
            </div>

            <div className="p-6">
              {!editing ? (
                form.items && form.items.length > 0 ? (
                  <div className="space-y-3">
                    {form.items.map((item, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 md:grid-cols-12"
                      >
                        <div className="md:col-span-3">
                          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                            Date
                          </div>

                          <div className="text-sm text-gray-800">
                            {formatDate(item.date)}
                          </div>
                        </div>

                        <div className="md:col-span-9">
                          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                            Action
                          </div>

                          <div className="whitespace-pre-line text-sm text-gray-800">
                            {item.action || "-"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                    No actions recorded.
                  </div>
                )
              ) : (
                <div className="space-y-3">
                  {(form.items || []).map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 md:grid-cols-12"
                    >
                      <div className="md:col-span-3">
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          Date
                        </label>

                        <input
                          type="date"
                          value={item.date || ""}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "date",
                              e.target.value
                            )
                          }
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-1 focus:ring-black"
                        />
                      </div>

                      <div className="md:col-span-8">
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          Action
                        </label>

                        <input
                          type="text"
                          value={item.action || ""}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "action",
                              e.target.value
                            )
                          }
                          placeholder="Enter action..."
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-1 focus:ring-black"
                        />
                      </div>

                      <div className="flex items-end md:col-span-1">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          disabled={form.items.length <= 1}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                          title={
                            form.items.length <= 1
                              ? "At least one action row is required"
                              : "Remove action"
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

