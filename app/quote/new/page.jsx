
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

export default function NewquotePage() {
  const router = useRouter();

  /* =====================================================
     Clients
  ===================================================== */

  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState("");

  /* =====================================================
     Form
  ===================================================== */

  const [form, setForm] = useState({
    quoteNumber: "",
    projectNo: "",
    projectName: "",
    status: "Pending",

    dueDate: new Date().toISOString().split("T")[0],

    siteAddress: "",

    note: "",

    /* Quote Info */

    estimator: "",

    /* Project SQM Rate */

    cpOnlyRate: "",
    cpCarpentryRate: "",
    cpCarpentryExternalRate: "",
    cpCarpentryPrelimsRate: "",
    cpCarpentryExternalPrelimsRate: "",

    /* Project Summary */

    totalSqmInternal: "",
    totalSqmExternal: "",
    esttotalvalue: "",
    margin: "",

    /* Existing fields */

    estcpvalue: "",
    pricem2: "",
    priceunit: "",
  });

  /* =====================================================
     Actions / Follow Up Items
  ===================================================== */

  const [items, setItems] = useState([
    {
      date: "",
      action: "",
    },
  ]);

  /* =====================================================
     UI State
  ===================================================== */

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* =====================================================
     Load Clients
  ===================================================== */

  useEffect(() => {
    const loadClients = async () => {
      try {
        setLoadingClients(true);
        setError("");

        const snapshot = await getDocs(
          collection(db, "Clients")
        );

        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setClients(data);

        // Do not automatically select the first client.
        setSelectedClientId("");
      } catch (err) {
        console.error("Error loading clients:", err);
        setError("Failed to load clients.");
      } finally {
        setLoadingClients(false);
      }
    };

    loadClients();
  }, []);

  /* =====================================================
     Selected Client
  ===================================================== */

  const selectedClient = useMemo(() => {
    return clients.find(
      (client) => client.id === selectedClientId
    );
  }, [clients, selectedClientId]);

  /* =====================================================
     Client Change
  ===================================================== */

  const handleClientChange = (e) => {
    setSelectedClientId(e.target.value);
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
        date: "",
        action: "",
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
     Note Line Count
  ===================================================== */

  const noteLineCount = form.note
    ? form.note.split("\n").length
    : 0;

  /* =====================================================
     Create Quote
  ===================================================== */

  const handleSubmit = async () => {
    try {
      setError("");
      setSuccess("");

      /* ---------------------------------------------
         Validation
      --------------------------------------------- */

      if (!form.projectName.trim()) {
        setError("Please enter a project name.");
        return;
      }

      if (
        form.margin !== "" &&
        (Number(form.margin) < 0 ||
          Number(form.margin) > 100)
      ) {
        setError("Margin must be between 0% and 100%.");
        return;
      }

      setSaving(true);

      /* ---------------------------------------------
         Quote Data

         Project information is manually entered.
         There is NO projectId relationship.

         Client is optional.
      --------------------------------------------- */

      const quoteData = {
        /* ---------------------------------------------
           Quote / Project Information
        --------------------------------------------- */

        quoteNumber: form.quoteNumber,
        projectNo: form.projectNo,
        projectName: form.projectName,

        dueDate: form.dueDate,

        status: form.status,

        siteAddress: form.siteAddress,

        note: form.note,

        /* ---------------------------------------------
           Quote Info
        --------------------------------------------- */

        estimator: form.estimator,

        /* ---------------------------------------------
           Project SQM Rate
        --------------------------------------------- */

        cpOnlyRate: form.cpOnlyRate,
        cpCarpentryRate: form.cpCarpentryRate,
        cpCarpentryExternalRate:
          form.cpCarpentryExternalRate,
        cpCarpentryPrelimsRate:
          form.cpCarpentryPrelimsRate,
        cpCarpentryExternalPrelimsRate:
          form.cpCarpentryExternalPrelimsRate,

        /* ---------------------------------------------
           Project Summary
        --------------------------------------------- */

        totalSqmInternal: form.totalSqmInternal,
        totalSqmExternal: form.totalSqmExternal,

        esttotalvalue: form.esttotalvalue,

        // Margin is entered manually as a percentage.
        margin: form.margin,

        /* ---------------------------------------------
           Existing Estimation Fields
        --------------------------------------------- */

        estcpvalue: form.estcpvalue,
        pricem2: form.pricem2,
        priceunit: form.priceunit,

        /* ---------------------------------------------
           Client Relationship

           Client is optional.

           If no client is selected:
           clientId = ""
           client = null
        --------------------------------------------- */

        clientId: selectedClient
          ? selectedClient.id
          : "",

        client: selectedClient
          ? {
              id: selectedClient.id,
              name: selectedClient.name || "",
              abn: selectedClient.abn || "",
              contact: selectedClient.contact || "",
              email: selectedClient.email || "",
              phone: selectedClient.phone || "",
              address: selectedClient.address || "",
            }
          : null,

        /* ---------------------------------------------
           Follow Up / Action Items
        --------------------------------------------- */

        items: items
          .filter(
            (item) =>
              item.date ||
              item.action
          )
          .map((item) => ({
            date: item.date || "",
            action: item.action || "",
          })),

        /* ---------------------------------------------
           Created
        --------------------------------------------- */

        createdAt: serverTimestamp(),
      };

      /* ---------------------------------------------
         Save to Firestore
      --------------------------------------------- */

      const docRef = await addDoc(
        collection(db, "quote"),
        quoteData
      );

      console.log("Quote created:", docRef.id);

      router.push("/quote");
    } catch (err) {
      console.error(
        "Error creating quote:",
        err
      );

      setError(
        err.message ||
          "Failed to create quote."
      );
    } finally {
      setSaving(false);
    }
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
              href="/quote"
              className="text-sm text-gray-500 hover:text-black"
            >
              ← Quotes
            </Link>

            <h1 className="mt-2 text-3xl font-bold">
              New Quote
            </h1>

            <p className="mt-1 text-gray-500">
              Create a new quote
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
            Success
        ================================================= */}

        {success && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* =================================================
            Quote Management
        ================================================= */}

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">

          <h2 className="mb-5 text-xl font-semibold">
            Quote Management
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            {/* Project Name */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Project Name
              </label>

              <input
                type="text"
                name="projectName"
                value={form.projectName}
                onChange={handleChange}
                placeholder="Enter project name"
                className="w-full rounded-lg border border-gray-300 px-4 py-3"
              />
            </div>

            {/* Status */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Status
              </label>

              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full rounded-lg border px-4 py-3"
              >
                <option value="Pending">
                  Pending Tender
                </option>

                <option value="Tendering">
                  Tendering
                </option>

                <option value="Submitted">
                  Submitted
                </option>

                <option value="onHold">
                  On Hold
                </option>

                <option value="awarded">
                  Awarded
                </option>

                <option value="unsuccessful">
                  Unsuccessful
                </option>
              </select>
            </div>

            {/* Site Address */}

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Site Address
              </label>

              <textarea
                name="siteAddress"
                value={form.siteAddress}
                onChange={handleChange}
                rows={3}
                placeholder="Enter project/site address"
                className="w-full rounded-lg border border-gray-300 px-4 py-3"
              />
            </div>

          </div>
        </section>

        {/* =================================================
            Client
        ================================================= */}

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">

          <h2 className="mb-5 text-xl font-semibold">
            Client
          </h2>

          {loadingClients ? (
            <p className="text-gray-500">
              Loading clients...
            </p>
          ) : clients.length === 0 ? (
            <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
              No clients found. Client can be left blank.
            </div>
          ) : (
            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Select Client
              </label>

              <select
                value={selectedClientId}
                onChange={handleClientChange}
                className="w-full rounded-lg border px-4 py-3"
              >
                <option value="">
                  Select client (optional)
                </option>

                {clients.map((client) => (
                  <option
                    key={client.id}
                    value={client.id}
                  >
                    {client.name}
                  </option>
                ))}
              </select>

            </div>
          )}

          {/* Client Details */}

          {selectedClient && (
            <div className="mt-5 rounded-lg bg-gray-50 p-5">

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                <div>
                  <p className="text-xs text-gray-500">
                    Client
                  </p>

                  <p className="font-medium">
                    {selectedClient.name || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    ABN
                  </p>

                  <p>
                    {selectedClient.abn || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Contact
                  </p>

                  <p>
                    {selectedClient.contact || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Email
                  </p>

                  <p>
                    {selectedClient.email || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Phone
                  </p>

                  <p>
                    {selectedClient.phone || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Address
                  </p>

                  <p>
                    {selectedClient.address || "-"}
                  </p>
                </div>

              </div>

            </div>
          )}

        </section>

        {/* =================================================
            Quote Information
        ================================================= */}

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">

          <h2 className="mb-6 text-xl font-semibold">
            Quote Information
          </h2>

          {/* =================================================
              Quote Info
          ================================================= */}

          <div className="mb-8">

            <h3 className="mb-4 text-base font-semibold text-gray-800">
              Quote Info
            </h3>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              {/* Estimator */}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Estimator
                </label>

                <input
                  type="text"
                  name="estimator"
                  value={form.estimator}
                  onChange={handleChange}
                  placeholder="Estimator name"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3"
                />
              </div>

              {/* Due Date */}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Due Date
                </label>

                <input
                  type="date"
                  name="dueDate"
                  value={form.dueDate}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3"
                />
              </div>

            </div>

          </div>

          {/* =================================================
              Project SQM Rate
          ================================================= */}

          <div className="mb-8">

            <h3 className="mb-4 text-base font-semibold text-gray-800">
              Project SQM Rate
            </h3>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">

              {/* C&P only */}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  C&amp;P only
                </label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    $
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="cpOnlyRate"
                    value={form.cpOnlyRate}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-gray-300 py-3 pl-8 pr-4"
                  />
                </div>
              </div>

              {/* C&P + Carpentry */}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  C&amp;P + Carpentry
                </label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    $
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="cpCarpentryRate"
                    value={form.cpCarpentryRate}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-gray-300 py-3 pl-8 pr-4"
                  />
                </div>
              </div>

              {/* C&P + Carpentry + External work */}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  C&amp;P + Carpentry + External work
                </label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    $
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="cpCarpentryExternalRate"
                    value={form.cpCarpentryExternalRate}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-gray-300 py-3 pl-8 pr-4"
                  />
                </div>
              </div>

              {/* C&P + Carpentry + Prelims */}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  C&amp;P + Carpentry + Prelims
                </label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    $
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="cpCarpentryPrelimsRate"
                    value={form.cpCarpentryPrelimsRate}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-gray-300 py-3 pl-8 pr-4"
                  />
                </div>
              </div>

              {/* C&P + Carpentry + External + Prelims */}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  C&amp;P + Carpentry + External + Prelims
                </label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    $
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="cpCarpentryExternalPrelimsRate"
                    value={form.cpCarpentryExternalPrelimsRate}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-gray-300 py-3 pl-8 pr-4"
                  />
                </div>
              </div>

            </div>

          </div>

          {/* =================================================
              Project Summary
          ================================================= */}

          <div>

            <h3 className="mb-4 text-base font-semibold text-gray-800">
              Project Summary
            </h3>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">

              {/* Total sqm internal */}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Total sqm internal
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="totalSqmInternal"
                  value={form.totalSqmInternal}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3"
                />
              </div>

              {/* Total sqm external */}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Total sqm external
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="totalSqmExternal"
                  value={form.totalSqmExternal}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3"
                />
              </div>

              {/* Est. Total value */}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Est. Total value
                </label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    $
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="esttotalvalue"
                    value={form.esttotalvalue}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-gray-300 py-3 pl-8 pr-4"
                  />
                </div>
              </div>

              {/* Margin */}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Margin
                </label>

                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    name="margin"
                    value={form.margin}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-10"
                  />

                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                    %
                  </span>
                </div>
              </div>

            </div>

          </div>

        </section>

        {/* =================================================
            Note
        ================================================= */}

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">

          <div className="mb-3 flex items-center justify-between">

            <h2 className="text-xl font-semibold">
              Note
            </h2>

            <span className="text-sm text-gray-500">
              {noteLineCount}/20 lines
            </span>

          </div>

          <textarea
            name="note"
            value={form.note}
            onChange={(e) => {
              const lines =
                e.target.value.split("\n");

              if (lines.length <= 20) {
                setForm((prev) => ({
                  ...prev,
                  note: e.target.value,
                }));
              }
            }}
            rows={8}
            placeholder="Enter quote notes..."
            className="w-full rounded-lg border px-4 py-3"
          />

        </section>

        {/* =================================================
            Follow Up / Actions
        ================================================= */}

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">

          <div className="mb-5 flex items-center justify-between">

            <h2 className="text-xl font-semibold">
              Follow Up / Actions
            </h2>

            <button
              type="button"
              onClick={addItem}
              className="cursor-pointer rounded-lg bg-indigo-800 px-5 py-2.5 text-sm text-gray-100 transition hover:bg-amber-400 hover:text-black"
            >
              + Add Action
            </button>

          </div>

          <div className="space-y-4">

            {items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-12 gap-3"
              >

                {/* Date */}

                <div className="col-span-3">

                  <input
                    type="date"
                    value={item.date}
                    onChange={(e) =>
                      handleItemChange(
                        index,
                        "date",
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border px-4 py-3"
                  />

                </div>

                {/* Action */}

                <div className="col-span-8">

                  <input
                    type="text"
                    value={item.action}
                    onChange={(e) =>
                      handleItemChange(
                        index,
                        "action",
                        e.target.value
                      )
                    }
                    placeholder="Action / follow up"
                    className="w-full rounded-lg border px-4 py-3"
                  />

                </div>

                {/* Remove */}

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
            ))}

          </div>

        </section>

        {/* =================================================
            Actions
        ================================================= */}

        <div className="flex justify-end gap-3">

          <Link
            href="/quote"
            className="rounded-lg border bg-white px-6 py-3 font-medium"
          >
            Cancel
          </Link>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              saving ||
              loadingClients
            }
            className="cursor-pointer rounded-lg bg-indigo-800 px-6 py-3 text-sm font-medium text-gray-100 transition hover:bg-amber-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : "Create Quote"}
          </button>

        </div>

      </div>
    </div>
  );
}

