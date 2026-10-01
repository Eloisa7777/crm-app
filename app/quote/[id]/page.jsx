"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

/* =========================================================
   Status Options
   ========================================================= */

const STATUS_OPTIONS = [
  {
    value: "Pending",
    label: "Pending Tender",
  },
  {
    value: "Tendering",
    label: "Tendering",
  },
  {
    value: "Submitted",
    label: "Submitted",
  },
  {
    value: "onHold",
    label: "On Hold",
  },
  {
    value: "awarded",
    label: "Awarded",
  },
  {
    value: "unsuccessful",
    label: "Unsuccessful",
  },
];

/* =========================================================
   Helper - Format Firestore Date
   ========================================================= */

function formatDate(value) {
  if (!value) return "";

  if (typeof value?.toDate === "function") {
    return value.toDate().toISOString().split("T")[0];
  }

  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }

  return String(value).split("T")[0];
}

/* =========================================================
   Reusable Field Component
   IMPORTANT:
   Keep this OUTSIDE QuoteDetailPage.
   Otherwise input loses focus on every render.
   ========================================================= */

function Field({
  label,
  value,
  onChange,
  editing,
  type = "text",
  prefix = "",
  suffix = "",
  min,
  max,
  step,
  placeholder = "",
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

      {editing ? (
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
            min={min}
            max={max}
            step={step}
            placeholder={placeholder}
            className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-1 focus:ring-gray-500 ${
              prefix ? "pl-7" : ""
            } ${suffix ? "pr-8" : ""}`}
          />

          {suffix && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
              {suffix}
            </span>
          )}
        </div>
      ) : (
        <div className="min-h-[42px] rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-900">
          {value !== undefined &&
          value !== null &&
          value !== ""
            ? `${prefix}${value}${suffix}`
            : "-"}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   Client Field Component
   IMPORTANT:
   Keep this OUTSIDE QuoteDetailPage.
   ========================================================= */

function ClientField({
  label,
  field,
  value,
  editing,
  onChange,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

      {editing ? (
        <input
          type="text"
          value={value || ""}
          onChange={(e) =>
            onChange(field, e.target.value)
          }
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
        />
      ) : (
        <div className="min-h-[42px] rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-900">
          {value || "-"}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   Quote Detail Page
   ========================================================= */

export default function QuoteDetailPage() {
  const params = useParams();

  const id = params?.id;

  /* =========================================================
     State
     ========================================================= */

  const [quote, setQuote] = useState(null);

  const [clients, setClients] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingClients, setLoadingClients] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({
    quoteNumber: "",

    projectName: "",

    clientId: "",

    client: {
      name: "",
      abn: "",
      contact: "",
      email: "",
      phone: "",
      address: "",
    },

    estimator: "",

    status: "Pending",

    dueDate: "",
    chasingDate: "",

    siteAddress: "",

    esttotalvalue: "",
    estcpvalue: "",
    margin: "",
    pricem2: "",
    priceunit: "",

    note: "",

    items: [],
  });

  /* =========================================================
     Load Quote
     ========================================================= */

  useEffect(() => {
    if (!id) return;

    const loadQuote = async () => {
      try {
        setLoading(true);

        const quoteRef = doc(db, "quote", id);

        const quoteSnap = await getDoc(quoteRef);

        if (!quoteSnap.exists()) {
          setQuote(null);
          return;
        }

        const data = quoteSnap.data();

        setQuote({
          id: quoteSnap.id,
          ...data,
        });

        /* -----------------------------------------------------
           Client Snapshot
           ----------------------------------------------------- */

        const clientData =
          data.client &&
          typeof data.client === "object"
            ? data.client
            : {};

        /* -----------------------------------------------------
           Items
           ----------------------------------------------------- */

        const items = Array.isArray(data.items)
          ? data.items.map((item) => ({
              date: item?.date || "",
              action: item?.action || "",
            }))
          : [];

        /* -----------------------------------------------------
           Set Form
           ----------------------------------------------------- */

        setForm({
          quoteNumber: data.quoteNumber || "",

          /*
            Project Name is plain text.
            No projectId.
            No projects collection.
          */
          projectName: data.projectName || "",

          clientId: data.clientId || "",

          client: {
            name: clientData.name || "",
            abn: clientData.abn || "",
            contact: clientData.contact || "",
            email: clientData.email || "",
            phone: clientData.phone || "",
            address: clientData.address || "",
          },

          estimator: data.estimator || "",

          status: data.status || "Pending",

          dueDate: formatDate(data.dueDate),
          chasingDate: formatDate(data.chasingDate),

          /*
            Site Address is stored directly on Quote.
          */
          siteAddress: data.siteAddress || "",

          esttotalvalue:
            data.esttotalvalue !== undefined &&
            data.esttotalvalue !== null
              ? String(data.esttotalvalue)
              : "",

          estcpvalue:
            data.estcpvalue !== undefined &&
            data.estcpvalue !== null
              ? String(data.estcpvalue)
              : "",

          margin:
            data.margin !== undefined &&
            data.margin !== null
              ? String(data.margin)
              : "",

          pricem2:
            data.pricem2 !== undefined &&
            data.pricem2 !== null
              ? String(data.pricem2)
              : "",

          priceunit:
            data.priceunit !== undefined &&
            data.priceunit !== null
              ? String(data.priceunit)
              : "",

          note: data.note || "",

          items,
        });
      } catch (error) {
        console.error(
          "Failed to load quote:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadQuote();
  }, [id]);

  /* =========================================================
     Load Clients
     ========================================================= */

  useEffect(() => {
    const loadClients = async () => {
      try {
        setLoadingClients(true);

        const snapshot = await getDocs(
          collection(db, "Clients")
        );

        const clientList = snapshot.docs.map(
          (docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })
        );

        setClients(clientList);
      } catch (error) {
        console.error(
          "Failed to load clients:",
          error
        );
      } finally {
        setLoadingClients(false);
      }
    };

    loadClients();
  }, []);

  /* =========================================================
     Update Form
     ========================================================= */

  const updateForm = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /* =========================================================
     Update Client
     ========================================================= */

  const updateClient = (field, value) => {
    setForm((prev) => ({
      ...prev,

      client: {
        ...prev.client,
        [field]: value,
      },
    }));
  };

  /* =========================================================
     Client Change
     ========================================================= */

  const handleClientChange = (clientId) => {
    if (!clientId) {
      setForm((prev) => ({
        ...prev,

        clientId: "",

        client: {
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

    const selectedClient = clients.find(
      (client) => client.id === clientId
    );

    if (!selectedClient) return;

    setForm((prev) => ({
      ...prev,

      clientId: selectedClient.id,

      client: {
        name: selectedClient.name || "",
        abn: selectedClient.abn || "",
        contact: selectedClient.contact || "",
        email: selectedClient.email || "",
        phone: selectedClient.phone || "",
        address: selectedClient.address || "",
      },
    }));
  };

  /* =========================================================
     Add feedback
     ========================================================= */

  const addItem = () => {
    setForm((prev) => ({
      ...prev,

      items: [
        ...prev.items,
        {
          date: "",
          action: "",
        },
      ],
    }));
  };

  /* =========================================================
     Remove feedback
     ========================================================= */

  const removeItem = (index) => {
    setForm((prev) => ({
      ...prev,

      items: prev.items.filter(
        (_, itemIndex) =>
          itemIndex !== index
      ),
    }));
  };

  /* =========================================================
     Update Quote Item
     ========================================================= */

  const updateItem = (
    index,
    field,
    value
  ) => {
    setForm((prev) => ({
      ...prev,

      items: prev.items.map(
        (item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                [field]: value,
              }
            : item
      ),
    }));
  };

  /* =========================================================
     Save Quote
     ========================================================= */

  const handleSave = async () => {
    if (!id) return;

    if (!form.clientId) {
      alert("Please select a client.");
      return;
    }

    try {
      setSaving(true);

      const selectedClient = clients.find(
        (client) =>
          client.id === form.clientId
      );

      if (!selectedClient) {
        alert(
          "Selected client could not be found."
        );
        return;
      }

      /* -----------------------------------------------------
         Client Snapshot
         ----------------------------------------------------- */

      const cleanClient = {
        id: selectedClient.id,

        name:
          form.client.name ||
          selectedClient.name ||
          "",

        abn:
          form.client.abn ||
          selectedClient.abn ||
          "",

        contact:
          form.client.contact ||
          selectedClient.contact ||
          "",

        email:
          form.client.email ||
          selectedClient.email ||
          "",

        phone:
          form.client.phone ||
          selectedClient.phone ||
          "",

        address:
          form.client.address ||
          selectedClient.address ||
          "",
      };

      /* -----------------------------------------------------
         Updated Quote Data
         ----------------------------------------------------- */

      const updatedData = {
        quoteNumber:
          form.quoteNumber.trim(),

        /*
          Project Name is manually entered.
          It is NOT linked to projects.
        */
        projectName:
          form.projectName.trim(),

        /*
          Client relationship
        */
        clientId: selectedClient.id,

        /*
          Client snapshot
        */
        client: cleanClient,

        estimator:
          form.estimator.trim(),

        status: form.status,

        dueDate:
          form.dueDate || "",

        chasingDate:
          form.chasingDate || "",

        /*
          Site Address is stored directly
          on the Quote.
        */
        siteAddress:
          form.siteAddress.trim(),

        esttotalvalue:
          form.esttotalvalue,

        estcpvalue:
          form.estcpvalue,

        margin:
          form.margin,

        pricem2:
          form.pricem2,

        priceunit:
          form.priceunit,

        note: form.note,

        items: form.items.map(
          (item) => ({
            date: item.date || "",
            action: item.action || "",
          })
        ),

        updatedAt:
          serverTimestamp(),
      };

      /* -----------------------------------------------------
         Update Firestore
         ----------------------------------------------------- */

      await updateDoc(
        doc(db, "quote", id),
        updatedData
      );

      /* -----------------------------------------------------
         Update Local Quote
         ----------------------------------------------------- */

      setQuote((prev) => ({
        ...prev,
        ...updatedData,
      }));

      setForm((prev) => ({
        ...prev,

        quoteNumber:
          form.quoteNumber.trim(),

        projectName:
          form.projectName.trim(),

        clientId:
          selectedClient.id,

        client: cleanClient,

        estimator:
          form.estimator.trim(),

        status:
          form.status,

        dueDate:
          form.dueDate || "",

        chasingDate:
          form.chasingDate || "",

        siteAddress:
          form.siteAddress.trim(),

        esttotalvalue:
          form.esttotalvalue,

        estcpvalue:
          form.estcpvalue,

        margin:
          form.margin,

        pricem2:
          form.pricem2,

        priceunit:
          form.priceunit,

        note:
          form.note,

        items:
          form.items,
      }));

      setEditing(false);
    } catch (error) {
      console.error(
        "Failed to save quote:",
        error
      );

      alert("Failed to save quote.");
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     Cancel Editing
     ========================================================= */

  const handleCancel = () => {
    if (!quote) return;

    const clientData =
      quote.client &&
      typeof quote.client === "object"
        ? quote.client
        : {};

    setForm({
      quoteNumber:
        quote.quoteNumber || "",

      projectName:
        quote.projectName || "",

      clientId:
        quote.clientId || "",

      client: {
        name:
          clientData.name || "",

        abn:
          clientData.abn || "",

        contact:
          clientData.contact || "",

        email:
          clientData.email || "",

        phone:
          clientData.phone || "",

        address:
          clientData.address || "",
      },

      estimator:
        quote.estimator || "",

      status:
        quote.status || "Pending",

      dueDate:
        formatDate(quote.dueDate),

      chasingDate:
        formatDate(
          quote.chasingDate
        ),

      siteAddress:
        quote.siteAddress || "",

      esttotalvalue:
        quote.esttotalvalue !==
          undefined &&
        quote.esttotalvalue !== null
          ? String(
              quote.esttotalvalue
            )
          : "",

      estcpvalue:
        quote.estcpvalue !==
          undefined &&
        quote.estcpvalue !== null
          ? String(
              quote.estcpvalue
            )
          : "",

      margin:
        quote.margin !==
          undefined &&
        quote.margin !== null
          ? String(quote.margin)
          : "",

      pricem2:
        quote.pricem2 !==
          undefined &&
        quote.pricem2 !== null
          ? String(quote.pricem2)
          : "",

      priceunit:
        quote.priceunit !==
          undefined &&
        quote.priceunit !== null
          ? String(
              quote.priceunit
            )
          : "",

      note:
        quote.note || "",

      items: Array.isArray(
        quote.items
      )
        ? quote.items.map(
            (item) => ({
              date:
                item?.date || "",
              action:
                item?.action || "",
            })
          )
        : [],
    });

    setEditing(false);
  };

  /* =========================================================
     Loading
     ========================================================= */

  if (loading) {
    return (
      <div className="p-8 text-gray-500">
        Loading quote...
      </div>
    );
  }

  /* =========================================================
     Quote Not Found
     ========================================================= */

  if (!quote) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-gray-200 bg-white p-8">
          <h1 className="text-xl font-semibold text-gray-900">
            Quote not found
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            The quote you are looking for
            does not exist.
          </p>

          <Link
            href="/quote"
            className="mt-6 inline-block text-sm font-medium text-gray-900 underline"
          >
            Back to Quotes
          </Link>
        </div>
      </div>
    );
  }

  /* =========================================================
     Page
     ========================================================= */

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">

        {/* ===================================================
            Header
            =================================================== */}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
              <Link
                href="/quote"
                className="hover:text-gray-900"
              >
                Quotes
              </Link>

              <span>/</span>

              <span>
                {form.quoteNumber ||
                  "Quote"}
              </span>
            </div>

            <h1 className="text-2xl font-semibold text-gray-900">
              {form.quoteNumber ||
                "Quote"}
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
                onClick={() =>
                  setEditing(true)
                }
                className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                Edit Quote
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={
                    handleCancel
                  }
                  disabled={saving}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={
                    saving ||
                    loadingClients
                  }
                  className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ===================================================
            Main Content
            =================================================== */}

        <div className="space-y-6">

          {/* =================================================
              Quote Management
              ================================================= */}

          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Quote Management
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Project name, status and
                site address
              </p>
            </div>

            {/* -----------------------------------------------
                Project Name + Status
                ----------------------------------------------- */}

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              {/* Project Name */}

              <Field
                label="Project Name"
                value={
                  form.projectName
                }
                editing={editing}
                onChange={(value) =>
                  updateForm(
                    "projectName",
                    value
                  )
                }
              />

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
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                  >
                    {STATUS_OPTIONS.map(
                      (option) => (
                        <option
                          key={
                            option.value
                          }
                          value={
                            option.value
                          }
                        >
                          {
                            option.label
                          }
                        </option>
                      )
                    )}
                  </select>
                ) : (
                  <div className="min-h-[42px] rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-900">
                    {STATUS_OPTIONS.find(
                      (option) =>
                        option.value ===
                        form.status
                    )?.label ||
                      form.status ||
                      "-"}
                  </div>
                )}
              </div>
            </div>

            {/* -----------------------------------------------
                Site Address
                ----------------------------------------------- */}

            <div className="mt-5">
              <Field
                label="Site Address"
                value={
                  form.siteAddress
                }
                editing={editing}
                onChange={(value) =>
                  updateForm(
                    "siteAddress",
                    value
                  )
                }
              />
            </div>
          </section>

          {/* =================================================
              Quote Information
              ================================================= */}

          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Quote Information
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Quote dates, estimator
                and pricing
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">

              {/* Quote Number */}

              <Field
                label="Quote Number"
                value={
                  form.quoteNumber
                }
                editing={editing}
                onChange={(value) =>
                  updateForm(
                    "quoteNumber",
                    value
                  )
                }
              />

              {/* Due Date */}

              <Field
                label="Due Date"
                value={
                  form.dueDate
                }
                editing={editing}
                type="date"
                onChange={(value) =>
                  updateForm(
                    "dueDate",
                    value
                  )
                }
              />

              {/* Chasing Date */}

              <Field
                label="Chasing Date"
                value={
                  form.chasingDate
                }
                editing={editing}
                type="date"
                onChange={(value) =>
                  updateForm(
                    "chasingDate",
                    value
                  )
                }
              />

              {/* Estimator */}

              <Field
                label="Estimator"
                value={
                  form.estimator
                }
                editing={editing}
                onChange={(value) =>
                  updateForm(
                    "estimator",
                    value
                  )
                }
              />

              {/* Estimated Total Value */}

              <Field
                label="Estimated Total Value"
                value={
                  form.esttotalvalue
                }
                editing={editing}
                type="number"
                min="0"
                step="0.01"
                prefix="$"
                onChange={(value) =>
                  updateForm(
                    "esttotalvalue",
                    value
                  )
                }
              />

              {/* Estimated CP Value */}

              <Field
                label="Estimated CP Value"
                value={
                  form.estcpvalue
                }
                editing={editing}
                type="number"
                min="0"
                step="0.01"
                prefix="$"
                onChange={(value) =>
                  updateForm(
                    "estcpvalue",
                    value
                  )
                }
              />

              {/* Margin */}

              <Field
                label="Margin"
                value={
                  form.margin
                }
                editing={editing}
                type="number"
                min="0"
                max="100"
                step="0.01"
                suffix="%"
                onChange={(value) =>
                  updateForm(
                    "margin",
                    value
                  )
                }
              />

              {/* Price / m² */}

              <Field
                label="Price / m²"
                value={
                  form.pricem2
                }
                editing={editing}
                type="number"
                min="0"
                step="0.01"
                prefix="$"
                onChange={(value) =>
                  updateForm(
                    "pricem2",
                    value
                  )
                }
              />

              {/* Price / Unit */}

              <Field
                label="Price / Unit"
                value={
                  form.priceunit
                }
                editing={editing}
                type="number"
                min="0"
                step="0.01"
                prefix="$"
                onChange={(value) =>
                  updateForm(
                    "priceunit",
                    value
                  )
                }
              />
            </div>
          </section>

          {/* =================================================
              Client
              ================================================= */}

          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Client
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Client information linked
                to this quote
              </p>
            </div>

            {/* Client Selection */}

            <div className="mb-5">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Client
              </label>

              {editing ? (
                <select
                  value={
                    form.clientId
                  }
                  onChange={(e) =>
                    handleClientChange(
                      e.target.value
                    )
                  }
                  disabled={
                    loadingClients
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-1 focus:ring-gray-500 disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  <option value="">
                    Select client
                  </option>

                  {clients.map(
                    (client) => (
                      <option
                        key={
                          client.id
                        }
                        value={
                          client.id
                        }
                      >
                        {client.name ||
                          "Unnamed Client"}
                      </option>
                    )
                  )}
                </select>
              ) : (
                <div className="min-h-[42px] rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-900">
                  {form.client
                    .name || "-"}
                </div>
              )}
            </div>

            {/* Client Details */}

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              <ClientField
                label="Client Name"
                field="name"
                value={
                  form.client.name
                }
                editing={editing}
                onChange={
                  updateClient
                }
              />

              <ClientField
                label="ABN"
                field="abn"
                value={
                  form.client.abn
                }
                editing={editing}
                onChange={
                  updateClient
                }
              />

              <ClientField
                label="Contact"
                field="contact"
                value={
                  form.client.contact
                }
                editing={editing}
                onChange={
                  updateClient
                }
              />

              <ClientField
                label="Email"
                field="email"
                value={
                  form.client.email
                }
                editing={editing}
                onChange={
                  updateClient
                }
              />

              <ClientField
                label="Phone"
                field="phone"
                value={
                  form.client.phone
                }
                editing={editing}
                onChange={
                  updateClient
                }
              />

              <ClientField
                label="Address"
                field="address"
                value={
                  form.client.address
                }
                editing={editing}
                onChange={
                  updateClient
                }
              />
            </div>
          </section>

          {/* =================================================
              Notes
              ================================================= */}

          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Notes
              </h2>
            </div>

            {editing ? (
              <textarea
                value={form.note}
                onChange={(e) =>
                  updateForm(
                    "note",
                    e.target.value
                  )
                }
                rows={5}
                placeholder="Enter notes..."
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
              />
            ) : (
              <div className="min-h-[100px] whitespace-pre-wrap rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-900">
                {form.note || "-"}
              </div>
            )}
          </section>

          {/* =================================================
              Quote Items
              ================================================= */}

          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Feedback
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Quote activity and
                  follow-up records
                </p>
              </div>

              {editing && (
                <button
                  type="button"
                  onClick={addItem}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  + Add Item
                </button>
              )}
            </div>

            {form.items.length ===
            0 ? (
              <div className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                No Feedback
              </div>
            ) : (
              <div className="space-y-3">
                {form.items.map(
                  (item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-4 md:grid-cols-[180px_1fr_auto]"
                    >
                      {/* Date */}

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-gray-500">
                          Date
                        </label>

                        {editing ? (
                          <input
                            type="date"
                            value={
                              item.date ||
                              ""
                            }
                            onChange={(
                              e
                            ) =>
                              updateItem(
                                index,
                                "date",
                                e.target
                                  .value
                              )
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                          />
                        ) : (
                          <div className="py-2 text-sm text-gray-900">
                            {item.date ||
                              "-"}
                          </div>
                        )}
                      </div>

                      {/* Action */}

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-gray-500">
                          Action
                        </label>

                        {editing ? (
                          <input
                            type="text"
                            value={
                              item.action ||
                              ""
                            }
                            onChange={(
                              e
                            ) =>
                              updateItem(
                                index,
                                "action",
                                e.target
                                  .value
                              )
                            }
                            placeholder="Enter action..."
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                          />
                        ) : (
                          <div className="py-2 text-sm text-gray-900">
                            {item.action ||
                              "-"}
                          </div>
                        )}
                      </div>

                      {/* Remove */}

                      {editing && (
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() =>
                              removeItem(
                                index
                              )
                            }
                            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          {/* =================================================
              Bottom Actions
              ================================================= */}

          {editing && (
            <div className="flex justify-end gap-3 pb-8">
              <button
                type="button"
                onClick={
                  handleCancel
                }
                disabled={saving}
                className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={
                  saving ||
                  loadingClients
                }
                className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}