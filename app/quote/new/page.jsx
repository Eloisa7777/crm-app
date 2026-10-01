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
    chasingDate: "",

    siteAddress: "",

    note: "",

    estimator: "",

    esttotalvalue: "",
    estcpvalue: "",

    margin: "",
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

      if (!form.projectNo.trim()) {
        setError("Please enter a project number.");
        return;
      }

      if (!form.projectName.trim()) {
        setError("Please enter a project name.");
        return;
      }

      if (!selectedClient) {
        setError("Please select a client.");
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
         
         Client still uses:
         clientId = relationship
         client = snapshot
      --------------------------------------------- */

      const quoteData = {
        /* ---------------------------------------------
           Quote / Project Information
        --------------------------------------------- */

        quoteNumber: form.quoteNumber,
        projectNo: form.projectNo,
        projectName: form.projectName,

        dueDate: form.dueDate,
        chasingDate: form.chasingDate,

        status: form.status,

        siteAddress: form.siteAddress,

        note: form.note,

        /* ---------------------------------------------
           Estimation
        --------------------------------------------- */

        estimator: form.estimator,

        esttotalvalue: form.esttotalvalue,
        estcpvalue: form.estcpvalue,

        // Margin is entered manually as a percentage.
        margin: form.margin,

        // Prices are entered manually.
        pricem2: form.pricem2,
        priceunit: form.priceunit,

        /* ---------------------------------------------
           Client Relationship
           
           clientId = relationship
           client = snapshot
        --------------------------------------------- */

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

            {/* Project No. */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Project No.
              </label>

              <input
                type="text"
                name="projectNo"
                value={form.projectNo}
                onChange={handleChange}
                placeholder="Enter project number"
                className="w-full rounded-lg border border-gray-300 px-4 py-3"
              />
            </div>

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
              No clients found. Please create a client first.
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
                  Select client
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

          <h2 className="mb-5 text-xl font-semibold">
            Quote Information
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            {/* Due Date */}

            <div>
              <label className="mb-2 block text-sm font-medium">
                Due Date
              </label>

              <input
                type="date"
                name="dueDate"
                value={form.dueDate}
                onChange={handleChange}
                className="w-full rounded-lg border px-4 py-3"
              />
            </div>

            {/* Chasing Date */}

            <div>
              <label className="mb-2 block text-sm font-medium">
                Chasing Date
              </label>

              <input
                type="date"
                name="chasingDate"
                value={form.chasingDate}
                onChange={handleChange}
                className="w-full rounded-lg border px-4 py-3"
              />
            </div>

          </div>

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
            Estimation
        ================================================= */}

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">

          <h2 className="mb-5 text-xl font-semibold">
            Estimation
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">

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

            {/* Estimated Total Value */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Est. Total Value
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

            {/* Estimated C&P Value */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Est. C&P Value
              </label>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                  $
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="estcpvalue"
                  value={form.estcpvalue}
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

            {/* Price / m² */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Price / m²
              </label>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                  $
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="pricem2"
                  value={form.pricem2}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-gray-300 py-3 pl-8 pr-4"
                />
              </div>
            </div>

            {/* Price / Unit */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Price / Unit
              </label>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                  $
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="priceunit"
                  value={form.priceunit}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-gray-300 py-3 pl-8 pr-4"
                />
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