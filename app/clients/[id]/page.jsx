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

export default function ClientDetailsPage() {
  const params = useParams();

  const [client, setClient] = useState(null);
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  const [error, setError] = useState("");

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Edit form
  const [form, setForm] = useState({
    name: "",
    abn: "",
    contacts: [],
    address: "",
    status: "Active",
  });

  /* =====================================================
     Load Client
  ===================================================== */

  useEffect(() => {
    async function loadClient() {
      if (!params?.id) return;

      try {
        setLoading(true);
        setError("");

        const clientRef = doc(
          db,
          "Clients",
          params.id
        );

        const clientSnap = await getDoc(clientRef);

        if (!clientSnap.exists()) {
          setClient(null);
          return;
        }

        const data = {
          id: clientSnap.id,
          ...clientSnap.data(),
        };

        setClient(data);

        setForm({
          name: data.name || "",
          abn: data.abn || "",

          contacts: Array.isArray(data.contacts)
            ? data.contacts.map((item) => ({
                contactName: item.contactName || "",
                email: item.email || "",
                phone: item.phone || "",
              }))
            : [],

          address: data.address || "",
          status: data.status || "Active",
        });
      } catch (error) {
        console.error(
          "Failed to load client:",
          error
        );

        setError("Failed to load client.");
      } finally {
        setLoading(false);
      }
    }

    loadClient();
  }, [params?.id]);

    /* =====================================================
      Load Client Projects
    ===================================================== */

    useEffect(() => {
      async function loadProjects() {
        if (!params?.id) return;

        try {
          setLoadingProjects(true);

          const projectRef = collection(
            db,
            "projects"
          );

          const q = query(
            projectRef,
            where("clientId", "==", params.id)
          );

          const snapshot = await getDocs(q);

          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          setProjects(data);
        } catch (error) {
          console.error(
            "Failed to load projects:",
            error
          );

          setError(
            error.message ||
              "Failed to load projects."
          );
        } finally {
          setLoadingProjects(false);
        }
      }

      loadProjects();
    }, [params?.id]);

    /* =====================================================
      Load Client Invoices
    ===================================================== */

    useEffect(() => {
      async function loadInvoices() {
        if (!params?.id) return;

        try {
          setLoadingInvoices(true);

          const invoiceRef = collection(
            db,
            "invoices"
          );

          const q = query(
            invoiceRef,
            where("clientId", "==", params.id)
          );

          const snapshot = await getDocs(q);

          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          setInvoices(data);
        } catch (error) {
          console.error(
            "Failed to load invoices:",
            error
          );

          setError(
            error.message ||
              "Failed to load invoices."
          );
        } finally {
          setLoadingInvoices(false);
        }
      }

      loadInvoices();
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
      Contact Management
    ===================================================== */

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

  /* =====================================================
     Save Client
  ===================================================== */

  async function handleSave() {
    if (!params?.id) return;

    try {
      setSaving(true);
      setSaved(false);
      setError("");

      const clientRef = doc(
        db,
        "Clients",
        params.id
      );

      const updatedData = {
        name: form.name.trim(),
        abn: form.abn.trim(),

        contacts: form.contacts
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
          ),

        address: form.address.trim(),
        status: form.status,
      };

      await updateDoc(
        clientRef,
        updatedData
      );

      setClient((prev) => ({
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
        "Failed to update client:",
        error
      );

      setError(
        error.message ||
          "Failed to save client."
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
        name: client.name || "",
        abn: client.abn || "",
       address: client.address || "",
        status: client.status || "Active",

        contacts: Array.isArray(client.contacts)
          ? client.contacts.map((item) => ({
              contactName: item.contactName || "",
              email: item.email || "",
              phone: item.phone || "",
            }))
          : [],
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
            href="/clients"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Clients
          </Link>
        </header>

        <div className="p-8">
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
            <p className="text-sm text-gray-500">
              Loading client...
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* =====================================================
     Error
  ===================================================== */

  if (error && !client) {
    return (
      <div className="min-h-screen">
        <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center">
          <Link
            href="/clients"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Clients
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
     Client Not Found
  ===================================================== */

  if (!client) {
    return (
      <div className="min-h-screen">
        <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center">
          <Link
            href="/clients"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Clients
          </Link>
        </header>

        <div className="p-8">
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
            <h1 className="text-lg font-semibold">
              Client not found
            </h1>

            <p className="text-sm text-gray-500 mt-2">
              The client you are looking for does not exist.
            </p>

            <p className="text-xs text-gray-400 mt-4">
              Client ID: {params?.id}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* =====================================================
     Calculate Invoice Total
  ===================================================== */

  const calculatedTotal = invoices.reduce(
    (sum, invoice) => {
      return (
        sum +
        (Number(invoice.total) ||
          Number(invoice.amount) ||
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
            href="/clients"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Clients
          </Link>

          <div className="h-5 w-px bg-gray-200" />

          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {client.name}
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Client details
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
              className="btn-primary cursor-pointer rounded-lg bg-[#14243A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#D6A64B] hover:text-[#14243A] hover:shadow-md"
            >
              Edit Client
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn-primary cursor-pointer rounded-lg bg-[#14243A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#D6A64B] hover:text-[#14243A] hover:shadow-md"
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
              Client Information
          ================================================= */}

          <section className="xl:col-span-1 bg-white border border-gray-200 rounded-xl">

            <div className="px-6 py-5 border-b border-gray-200">

              <div className="flex items-center justify-between">

                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Client Information
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    Contact details
                  </p>
                </div>

                {!editing && (
                  <StatusBadge
                    status={client.status}
                  />
                )}

              </div>

            </div>

            <div className="p-6 space-y-5">

              {editing ? (
                <>
                  <EditField
                    label="Client Name"
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

                    {/* =================================================
                        Contacts
                    ================================================= */}

                    <div>

                      <div className="flex items-center justify-between mb-3">

                        <label className="text-xs font-medium text-gray-400 uppercase">
                          Contacts
                        </label>

                        <button
                          type="button"
                          onClick={addContact}
                          className="text-sm font-medium text-indigo-700 hover:text-indigo-900 cursor-pointer"
                        >
                          + Add Contact
                        </button>

                      </div>

                      <div className="overflow-x-auto border border-gray-200 rounded-lg">

                        <table className="w-full text-sm">

                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-left">

                              <th className="px-3 py-3 text-xs font-medium text-gray-500">
                                Contact Name
                              </th>

                              <th className="px-3 py-3 text-xs font-medium text-gray-500">
                                Email
                              </th>

                              <th className="px-3 py-3 text-xs font-medium text-gray-500">
                                Phone
                              </th>

                              <th className="px-2 py-3"></th>

                            </tr>
                          </thead>

                          <tbody>

                            {form.contacts.map((item, index) => (

                              <tr
                                key={index}
                                className="border-b border-gray-100 last:border-0"
                              >

                                <td className="p-2">
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
                                    placeholder="Name"
                                    className="w-full min-w-28 rounded border border-gray-300 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200"
                                  />
                                </td>

                                <td className="p-2">
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
                                    placeholder="Email"
                                    className="w-full min-w-32 rounded border border-gray-300 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200"
                                  />
                                </td>

                                <td className="p-2">
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
                                    placeholder="Phone"
                                    className="w-full min-w-28 rounded border border-gray-300 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200"
                                  />
                                </td>

                                <td className="px-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeContact(index)}
                                    className="text-red-500 hover:text-red-700 cursor-pointer"
                                    title="Remove contact"
                                  >
                                    ×
                                  </button>
                                </td>

                              </tr>

                            ))}

                            {form.contacts.length === 0 && (
                              <tr>
                                <td
                                  colSpan="4"
                                  className="px-4 py-6 text-center text-sm text-gray-400"
                                >
                                  No contacts added.
                                </td>
                              </tr>
                            )}

                          </tbody>

                        </table>

                      </div>

                    </div>
                </>
              ) : (
                <>
                  <InfoItem
                    label="Client Name"
                    value={client.name}
                  />

                  <InfoItem
                    label="ABN"
                    value={client.abn}
                  />

                  <InfoItem
                    label="Address"
                    value={client.address}
                  />

                  <InfoItem
                    label="Status"
                    value={client.status}
                  />
    {/* =================================================
                      Contacts Display
                  ================================================= */}

                  <div>

                    <div className="flex items-center justify-between mb-3">

                      <label className="text-xs font-medium text-gray-400 uppercase">
                        Contacts
                      </label>

                    </div>

                    <div className="overflow-x-auto border border-gray-200 rounded-lg">

                      <table className="w-full text-sm">

                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200 text-left">

                            <th className="px-3 py-3 text-xs font-medium text-gray-500">
                              Contact Name
                            </th>

                            <th className="px-3 py-3 text-xs font-medium text-gray-500">
                              Email
                            </th>

                            <th className="px-3 py-3 text-xs font-medium text-gray-500">
                              Phone
                            </th>

                            <th className="px-2 py-3"></th>

                          </tr>
                        </thead>

                        <tbody>

                          {client.contacts?.length > 0 ? (

                            client.contacts.map((item, index) => (

                              <tr
                                key={index}
                                className="border-b border-gray-100 last:border-0"
                              >

                                <td className="px-3 py-3 text-sm text-gray-900">
                                  {item.contactName || "-"}
                                </td>

                                <td className="px-3 py-3 text-sm text-gray-600">
                                  {item.email || "-"}
                                </td>

                                <td className="px-3 py-3 text-sm text-gray-600">
                                  {item.phone || "-"}
                                </td>

                                <td className="px-2 py-3"></td>

                              </tr>

                            ))

                          ) : (

                            <tr>
                              <td
                                colSpan="4"
                                className="px-4 py-6 text-center text-sm text-gray-400"
                              >
                                No contacts found.
                              </td>
                            </tr>

                          )}

                        </tbody>

                      </table>

                    </div>

                  </div>
                </>
              )}

            </div>

          </section>

          {/* =================================================
              Projects + Invoices
          ================================================= */}

          <div className="xl:col-span-2 space-y-6">

            {/* =================================================
                Projects
            ================================================= */}

            <section className="bg-white border border-gray-200 rounded-xl">

              <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">

                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Projects
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    Projects associated with this client
                  </p>
                </div>

              </div>

              <div className="overflow-x-auto">

                <table className="w-full text-sm">

                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-left">

                      <th className="px-6 py-3 font-medium text-gray-500">
                        Project
                      </th>

                      <th className="px-6 py-3 font-medium text-gray-500">
                        Type
                      </th>

                      <th className="px-6 py-3 font-medium text-gray-500">
                        Start Date
                      </th>

                      <th className="px-6 py-3 font-medium text-gray-500">
                        Contract Value
                      </th>

                      <th className="px-6 py-3 font-medium text-gray-500">
                        Status
                      </th>

                    </tr>
                  </thead>

                  <tbody>

                    {loadingProjects ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="px-6 py-10 text-center text-sm text-gray-500"
                        >
                          Loading projects...
                        </td>
                      </tr>
                    ) : projects.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="px-6 py-10 text-center text-sm text-gray-500"
                        >
                          No projects found.
                        </td>
                      </tr>
                    ) : (
                      projects.map((project) => (
                        <tr
                          key={project.id}
                          onClick={() =>
                            (window.location.href =
                              `/projects/${project.id}`)
                          }
                          className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                        >

                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">
                              {project.name || "-"}
                            </div>

                            <div className="text-xs text-gray-500 mt-1">
                              {project.siteAddress || "-"}
                            </div>
                          </td>

                          <td className="px-6 py-4 text-gray-700">
                            {project.projectType || "-"}
                          </td>

                          <td className="px-6 py-4 text-gray-500">
                            {project.startDate || "-"}
                          </td>

                          <td className="px-6 py-4 font-medium text-gray-900">
                            {formatCurrency(
                              project.contractValue ?? 0
                            )}
                          </td>

                          <td className="px-6 py-4">
                            <StatusBadge
                              status={
                                project.status ||
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

            {/* =================================================
                Invoices
            ================================================= */}

            <section className="bg-white border border-gray-200 rounded-xl">

              <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">

                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Invoices
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    Invoices associated with this client
                  </p>
                </div>

              </div>

              <div className="overflow-x-auto">

                <table className="w-full text-sm">

                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-left">

                      <th className="px-6 py-3 font-medium text-gray-500">
                        Invoice Number
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

                    {loadingInvoices ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="px-6 py-10 text-center text-sm text-gray-500"
                        >
                          Loading invoices...
                        </td>
                      </tr>
                    ) : invoices.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="px-6 py-10 text-center text-sm text-gray-500"
                        >
                          No invoices found.
                        </td>
                      </tr>
                    ) : (
                      invoices.map((invoice) => (
                        <tr
                          key={invoice.id}
                          onClick={() =>
                            (window.location.href =
                              `/invoices/${invoice.id}`)
                          }
                          className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                        >

                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">
                              {invoice.invoiceNumber || "-"}
                            </div>
                          </td>

                          <td className="px-6 py-4 text-gray-700">
                            {invoice.projectName || "-"}
                          </td>

                          <td className="px-6 py-4 text-gray-500">
                            {invoice.invoiceDate || "-"}
                          </td>

                          <td className="px-6 py-4 font-medium text-gray-900">
                            {formatCurrency(
                              invoice.total ??
                                invoice.amount ??
                                0
                            )}
                          </td>

                          <td className="px-6 py-4">
                            <StatusBadge
                              status={
                                invoice.status ||
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

        </div>

        {/* =================================================
            Summary
        ================================================= */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">

          <div className="bg-white border border-gray-200 rounded-xl p-6">

            <div className="text-sm text-gray-500">
              Total Invoices
            </div>

            <div className="text-2xl font-semibold text-gray-900 mt-2">
              {invoices.length}
            </div>

          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">

            <div className="text-sm text-gray-500">
              Total Invoice Value
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
      "bg-blue-200 text-blue-700",

    Paid:
      "bg-green-200 text-green-700",

    Cancelled:
      "bg-red-200 text-red-700",

    Active:
      "bg-green-200 text-green-700",

    Inactive:
      "bg-red-200 text-red-600",
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