
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  getDocs,
} from "firebase/firestore";

import {
  PDFDownloadLink,
  PDFViewer,
} from "@react-pdf/renderer";

import { db } from "@/lib/firebase";
import InvoicePDF from "@/components/InvoicePDF";

export default function InvoiceDetailPage() {
  const params = useParams();

  const [invoice, setInvoice] = useState(null);

  /* =====================================================
     Projects
  ===================================================== */

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    async function loadProjects() {
      try {
        const snapshot = await getDocs(
          collection(db, "projects")
        );

        setProjects(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
      } catch (error) {
        console.error("Failed to load projects:", error);
      } finally {
        setLoadingProjects(false);
      }
    }

    loadProjects();
  }, []);

  /* =====================================================
     Clients
  ===================================================== */

  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);

  useEffect(() => {
    async function loadClients() {
      try {
        const snapshot = await getDocs(
          collection(db, "Clients")
        );

        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
          contacts: Array.isArray(item.data().contacts)
            ? item.data().contacts
            : [],
        }));

        setClients(data);
      } catch (error) {
        console.error("Failed to load clients:", error);
      } finally {
        setLoadingClients(false);
      }
    }

    loadClients();
  }, []);

  /* =====================================================
     Form
  ===================================================== */

  const [form, setForm] = useState({
    invoiceNumber: "",

    projectId: "",
    projectName: "",

    status: "Draft",

    invoiceDate: "",
    dueDate: "",

    client: {
      id: "",
      name: "",
      abn: "",
      address: "",
      selectedContact: {
        contactName: "",
        email: "",
        phone: "",
      },
    },

    clientId: "",

    poNumber: "",

    items: [],

    notes: "",

    accountManager: "",
    accountManagerEmail: "",
  });

  const [editing, setEditing] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  /* =====================================================
     Helper: Normalize Client
  ===================================================== */

  function normalizeClient(client) {
    return {
      id: client?.id || "",
      name: client?.name || "",
      abn: client?.abn || "",
      address: client?.address || "",

      selectedContact: {
        contactName:
          client?.selectedContact?.contactName || "",

        email:
          client?.selectedContact?.email || "",

        phone:
          client?.selectedContact?.phone || "",
      },
    };
  }

  /* =====================================================
     Helper: Normalize Invoice Items
  ===================================================== */

  function normalizeItems(items) {
    return Array.isArray(items)
      ? items.map((item) => ({
          description: item?.description || "",
          qty: Number(item?.qty) || 0,
          unitPrice: Number(item?.unitPrice) || 0,
          tax: Number(item?.tax) || 0,
        }))
      : [];
  }

  /* =====================================================
     Load Invoice

     Wait until Clients are loaded so that the
     corresponding Client and Contact can be matched.
  ===================================================== */

  useEffect(() => {
    if (loadingClients) return;

    async function loadInvoice() {
      if (!params?.id) return;

      try {
        setLoading(true);
        setError("");

        const invoiceRef = doc(
          db,
          "invoices",
          params.id
        );

        const snapshot = await getDoc(invoiceRef);

        if (!snapshot.exists()) {
          setError("Invoice not found.");
          return;
        }

        const data = {
          id: snapshot.id,
          ...snapshot.data(),
        };

        setInvoice(data);

        /* -----------------------------------------------
           Find Original Client
        ----------------------------------------------- */

        const originalClientId =
          data.client?.id ||
          data.clientId ||
          "";

        const clientRecord = clients.find(
          (item) => item.id === originalClientId
        );

        const savedContact = {
          contactName:
            data.client?.selectedContact?.contactName || "",

          email:
            data.client?.selectedContact?.email || "",

          phone:
            data.client?.selectedContact?.phone || "",
        };

        const client = clientRecord
          ? normalizeClient({
              ...clientRecord,
              selectedContact: savedContact,
            })
          : normalizeClient({
              ...data.client,
              id: originalClientId,
              selectedContact: savedContact,
            });

        /* -----------------------------------------------
           Items
        ----------------------------------------------- */

        const items = normalizeItems(data.items);

        /* -----------------------------------------------
           Form
        ----------------------------------------------- */

        setForm({
          invoiceNumber:
            data.invoiceNumber || "",

          projectId:
            data.projectId || "",

          projectName:
            data.projectName || "",

          status:
            data.status || "Draft",

          invoiceDate:
            data.invoiceDate ||
            data.date ||
            "",

          dueDate:
            data.dueDate || "",

          client,

          clientId:
            originalClientId,

          poNumber:
            data.poNumber || "",

          items,

          notes:
            data.notes || "",

          accountManager:
            data.accountManager || "",

          accountManagerEmail:
            data.accountManagerEmail || "",
        });
      } catch (err) {
        console.error("Failed to load invoice:", err);

        setError(
          err.message || "Failed to load invoice."
        );
      } finally {
        setLoading(false);
      }
    }

    loadInvoice();
  }, [params?.id, loadingClients, clients]);

  /* =====================================================
     Current Selected Client
  ===================================================== */

  const selectedClient = useMemo(() => {
    return clients.find(
      (client) => client.id === form.client.id
    ) || null;
  }, [clients, form.client.id]);

  /* =====================================================
     Current Client Contacts
  ===================================================== */

  const clientContacts = useMemo(() => {
    return selectedClient &&
      Array.isArray(selectedClient.contacts)
      ? selectedClient.contacts
      : [];
  }, [selectedClient]);

  /* =====================================================
     Current Selected Contact Index
  ===================================================== */

  const selectedContactIndex = useMemo(() => {
    const selected = form.client.selectedContact;

    if (!selected.contactName) return "";

    const index = clientContacts.findIndex(
      (contact) =>
        contact.contactName === selected.contactName &&
        contact.email === selected.email &&
        contact.phone === selected.phone
    );

    return index >= 0 ? String(index) : "";
  }, [
    clientContacts,
    form.client.selectedContact,
  ]);

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

  function handleProjectChange(projectId) {
    const project = projects.find(
      (item) => item.id === projectId
    );

    const projectName =
      project?.projectName ||
      project?.name ||
      "";

    setForm((prev) => ({
      ...prev,
      projectId,
      projectName,
    }));
  }

  /* =====================================================
     Client Update

     Changing Client automatically:
     1. Updates Client information
     2. Clears the previous Contact
     3. Requires a new Contact selection
  ===================================================== */

  function handleClientChange(clientId) {
    const client = clients.find(
      (item) => item.id === clientId
    );

    if (!client) return;

    setForm((prev) => ({
      ...prev,

      clientId: client.id,

      client: {
        id: client.id,
        name: client.name || "",
        abn: client.abn || "",
        address: client.address || "",

        // Clear previous Contact
        selectedContact: {
          contactName: "",
          email: "",
          phone: "",
        },
      },
    }));
  }

  /* =====================================================
     Contact Update

     Contact is selected from the current Client's
     contacts array.
  ===================================================== */

  function handleContactChange(contactIndex) {
    if (contactIndex === "") {
      setForm((prev) => ({
        ...prev,
        client: {
          ...prev.client,
          selectedContact: {
            contactName: "",
            email: "",
            phone: "",
          },
        },
      }));

      return;
    }

    const contact = clientContacts[Number(contactIndex)];

    if (!contact) return;

    setForm((prev) => ({
      ...prev,

      client: {
        ...prev.client,

        selectedContact: {
          contactName: contact.contactName || "",
          email: contact.email || "",
          phone: contact.phone || "",
        },
      },
    }));
  }

  /* =====================================================
     Item Update
  ===================================================== */

  function updateItem(index, field, value) {
    setForm((prev) => {
      const items = [...prev.items];

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
          tax: 0,
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
        (_, itemIndex) => itemIndex !== index
      ),
    }));
  }

  /* =====================================================
     Calculated Items
  ===================================================== */

  const calculatedItems = useMemo(() => {
    return form.items.map((item) => {
      const qty = Number(item?.qty) || 0;
      const unitPrice = Number(item?.unitPrice) || 0;
      const tax = Number(item?.tax) || 0;

      const lineSubtotal = qty * unitPrice;

      return {
        ...item,
        qty,
        unitPrice,
        tax,
        total: lineSubtotal * (1 + tax / 100),
      };
    });
  }, [form.items]);

  /* =====================================================
     Totals
  ===================================================== */

  const subtotal = useMemo(() => {
    return calculatedItems.reduce(
      (sum, item) => sum + item.total,
      0
    );
  }, [calculatedItems]);

  const gst = useMemo(() => {
    return subtotal * 0.1;
  }, [subtotal]);

  const total = useMemo(() => {
    return subtotal + gst;
  }, [subtotal, gst]);

  /* =====================================================
     PDF Data
  ===================================================== */

  const invoiceDataForPDF = useMemo(() => {
    return {
      invoiceNumber: form.invoiceNumber || "",
      invoiceDate: form.invoiceDate || "",
      dueDate: form.dueDate || "",
      status: form.status || "Draft",

      projectName: form.projectName || "",
      poNumber: form.poNumber || "",
      notes: form.notes || "",

      accountManager: form.accountManager || "",
      accountManagerEmail: form.accountManagerEmail || "",

      client: normalizeClient(form.client),

      clientId:
        form.clientId || form.client?.id || "",

      clientName:
        form.client?.name || "",

      clientAddress:
        form.client?.address || "",

      items: calculatedItems,

      subtotal,
      gst,
      total,
    };
  }, [
    form.invoiceNumber,
    form.invoiceDate,
    form.dueDate,
    form.status,
    form.projectName,
    form.poNumber,
    form.notes,
    form.accountManager,
    form.accountManagerEmail,
    form.client,
    form.clientId,
    calculatedItems,
    subtotal,
    gst,
    total,
  ]);

  /* =====================================================
     Save
  ===================================================== */

  async function handleSave() {
    try {
      setSaving(true);
      setSaved(false);
      setError("");

      if (!params?.id) {
        throw new Error("Invoice ID is missing.");
      }

      if (!form.projectId) {
        throw new Error("Please select a project.");
      }

      /* -----------------------------------------------
         Validate Client
      ----------------------------------------------- */

      if (!form.client.id) {
        throw new Error("Please select a Client.");
      }

      const currentClient = clients.find(
        (item) => item.id === form.client.id
      );

      if (!currentClient) {
        throw new Error("Selected Client not found.");
      }

      /* -----------------------------------------------
         Validate Contact

         Verify that selected Contact belongs to
         the currently selected Client.
      ----------------------------------------------- */

      const selectedContact = form.client.selectedContact;

      const validContact = currentClient.contacts.find(
        (contact) =>
          contact.contactName === selectedContact.contactName &&
          contact.email === selectedContact.email &&
          contact.phone === selectedContact.phone
      );

      if (!selectedContact.contactName || !validContact) {
        throw new Error(
          "Please select a valid Contact for this Client."
        );
      }

      /* -----------------------------------------------
         Clean Items
      ----------------------------------------------- */

      const cleanItems = calculatedItems.map((item) => ({
        description: item.description || "",
        qty: Number(item.qty) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        tax: Number(item.tax) || 0,
        total: Number(item.total) || 0,
      }));

      /* -----------------------------------------------
         Totals
      ----------------------------------------------- */

      const cleanSubtotal = cleanItems.reduce(
        (sum, item) => sum + item.total,
        0
      );

      const cleanGst = cleanSubtotal * 0.1;
      const cleanTotal = cleanSubtotal + cleanGst;

      /* -----------------------------------------------
         Client Snapshot

         Only save the new Client structure.
      ----------------------------------------------- */

      const cleanClient = {
        id: currentClient.id,
        name: currentClient.name || "",
        abn: currentClient.abn || "",
        address: currentClient.address || "",

        selectedContact: {
          contactName: validContact.contactName || "",
          email: validContact.email || "",
          phone: validContact.phone || "",
        },
      };

      /* -----------------------------------------------
         Project
      ----------------------------------------------- */

      const selectedProject = projects.find(
        (project) => project.id === form.projectId
      );

      const projectName =
        selectedProject?.projectName ||
        selectedProject?.name ||
        form.projectName ||
        "";

      /* -----------------------------------------------
         Updated Data
      ----------------------------------------------- */

      const updatedData = {
        invoiceNumber:
          form.invoiceNumber?.trim() || "",

        projectId:
          form.projectId || "",

        projectName:
          projectName.trim(),

        status:
          form.status || "Draft",

        invoiceDate:
          form.invoiceDate || "",

        dueDate:
          form.dueDate || "",

        clientId:
          cleanClient.id,

        clientName:
          cleanClient.name,

        clientAddress:
          cleanClient.address,

        // New Client Structure Only
        client: cleanClient,

        poNumber:
          form.poNumber || "",

        items: cleanItems,

        notes:
          form.notes || "",

        accountManager:
          form.accountManager || "",

        accountManagerEmail:
          form.accountManagerEmail || "",

        subtotal: cleanSubtotal,
        gst: cleanGst,
        total: cleanTotal,

        updatedAt: serverTimestamp(),
      };

      /* -----------------------------------------------
         Firebase
      ----------------------------------------------- */

      const invoiceRef = doc(
        db,
        "invoices",
        params.id
      );

      await updateDoc(invoiceRef, updatedData);

      /* -----------------------------------------------
         Update Local Invoice
      ----------------------------------------------- */

      setInvoice((prev) => ({
        ...prev,
        ...updatedData,

        client: cleanClient,
        items: cleanItems,

        subtotal: cleanSubtotal,
        gst: cleanGst,
        total: cleanTotal,
      }));

      /* -----------------------------------------------
         Update Local Form
      ----------------------------------------------- */

      setForm((prev) => ({
        ...prev,

        projectId: form.projectId,
        projectName,

        items: cleanItems,

        client: cleanClient,
        clientId: cleanClient.id,
      }));

      setEditing(false);
      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 2500);

    } catch (err) {
      console.error("Failed to save invoice:", err);

      setError(
        err.message || "Failed to save invoice."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     Cancel Editing
  ===================================================== */

  function handleCancel() {
    if (!invoice) return;

    const data = invoice;

    const originalClientId =
      data.client?.id ||
      data.clientId ||
      "";

    const clientRecord = clients.find(
      (item) => item.id === originalClientId
    );

    const client = normalizeClient(
      clientRecord
        ? {
            ...clientRecord,
            selectedContact: data.client?.selectedContact,
          }
        : {
            ...data.client,
            id: originalClientId,
          }
    );

    const items = normalizeItems(data.items);

    setForm({
      invoiceNumber:
        data.invoiceNumber || "",

      projectId:
        data.projectId || "",

      projectName:
        data.projectName || "",

      status:
        data.status || "Draft",

      invoiceDate:
        data.invoiceDate ||
        data.date ||
        "",

      dueDate:
        data.dueDate || "",

      client,

      clientId: originalClientId,

      poNumber:
        data.poNumber || "",

      items,

      notes:
        data.notes || "",

      accountManager:
        data.accountManager || "",

      accountManagerEmail:
        data.accountManagerEmail || "",
    });

    setEditing(false);
    setError("");
  }

  /* =====================================================
     Loading
  ===================================================== */

  if (loading || loadingClients) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-gray-500">
            Loading invoice...
          </p>
        </div>
      </div>
    );
  }

  /* =====================================================
     Error / Not Found
  ===================================================== */

  if (error && !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-6xl">

          <Link
            href="/invoices"
            className="text-sm text-gray-500 hover:text-black"
          >
            ← Invoices
          </Link>

          <div className="mt-6 rounded-xl bg-white p-8 shadow-sm">

            <h1 className="text-2xl font-bold">
              Invoice Not Found
            </h1>

            <p className="mt-2 text-gray-500">
              {error}
            </p>

            <p className="mt-4 text-sm text-gray-400">
              Invoice ID: {params?.id}
            </p>

          </div>
        </div>
      </div>
    );
  }

  /* =====================================================
     Render
  ===================================================== */

  return (
    <div className="min-h-screen bg-gray-50 p-8">

      <div className="mx-auto max-w-6xl">

        {/* Header */}

        <div className="mb-8 flex items-start justify-between">

          <div>

            <Link
              href="/invoices"
              className="text-sm text-gray-500 hover:text-black"
            >
              ← Invoices
            </Link>

            <h1 className="mt-3 text-3xl font-bold">
              {form.invoiceNumber || "Invoice"}
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Invoice ID: {invoice.id}
            </p>

          </div>

          <div className="flex items-center gap-3">

            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="cursor-pointer rounded-lg bg-indigo-800 px-5 py-2.5 text-sm font-medium text-gray-100 transition hover:bg-amber-400 hover:text-black"
              >
                Edit
              </button>
            )}

            {editing && (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || loadingProjects}
                  className="cursor-pointer rounded-lg bg-indigo-800 px-5 py-2.5 text-sm font-medium text-gray-100 transition hover:bg-amber-400 hover:text-black disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </>
            )}

          </div>
        </div>

        {/* Saved Message */}

        {saved && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            Invoice changes saved successfully.
          </div>
        )}

        {/* Error */}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* =================================================
            Invoice Management
        ================================================= */}

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">

          <div className="mb-5">

            <h2 className="text-xl font-semibold">
              Invoice Management
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Project and invoice status
            </p>

          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Project Name (Reference)
              </label>

              {editing ? (
                loadingProjects ? (
                  <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                    Loading projects...
                  </p>
                ) : (
                  <select
                    value={form.projectId}
                    onChange={(e) =>
                      handleProjectChange(e.target.value)
                    }
                    className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-black focus:ring-1 focus:ring-black"
                  >
                    <option value="">
                      Select project
                    </option>

                    {projects.map((project) => {
                      const projectName =
                        project.projectName ||
                        project.name ||
                        "";

                      return (
                        <option
                          key={project.id}
                          value={project.id}
                        >
                          {projectName || "Unnamed Project"}
                        </option>
                      );
                    })}
                  </select>
                )
              ) : (
                <p className="rounded-lg bg-gray-50 px-4 py-3">
                  {form.projectName || "-"}
                </p>
              )}

            </div>

            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Status
              </label>

              {editing ? (
                <select
                  value={form.status}
                  onChange={(e) =>
                    updateForm("status", e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-3"
                >
                  <option value="Draft">Draft</option>
                  <option value="Issued">Issued</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              ) : (
                <p className="rounded-lg bg-gray-50 px-4 py-3">
                  {form.status || "-"}
                </p>
              )}

            </div>

          </div>

        </section>

        {/* =================================================
            Invoice Information
        ================================================= */}

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">

          <h2 className="mb-5 text-xl font-semibold">
            Invoice Information
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-4">

            <Field
              label="Invoice Number"
              value={form.invoiceNumber}
              editing={editing}
              onChange={(value) =>
                updateForm("invoiceNumber", value)
              }
            />

            <Field
              label="Invoice Date"
              type="date"
              value={form.invoiceDate}
              editing={editing}
              onChange={(value) =>
                updateForm("invoiceDate", value)
              }
            />

            <Field
              label="Due Date"
              type="date"
              value={form.dueDate}
              editing={editing}
              onChange={(value) =>
                updateForm("dueDate", value)
              }
            />

            <Field
              label="PO Number"
              value={form.poNumber}
              editing={editing}
              onChange={(value) =>
                updateForm("poNumber", value)
              }
            />

          </div>

        </section>

        {/* =================================================
            Client
        ================================================= */}

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">

          <div className="mb-5 flex items-center justify-between">

            <div>

              <h2 className="text-xl font-semibold">
                Client
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Client and contact information
              </p>

            </div>

            {form.clientId && (
              <Link
                href={`/clients/${form.clientId}`}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                View Client →
              </Link>
            )}

          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            {/* Client Name */}

            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Client Name
              </label>

              {editing ? (
                <select
                  value={form.client.id}
                  onChange={(e) =>
                    handleClientChange(e.target.value)
                  }
                  className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-black focus:ring-1 focus:ring-black"
                >

                  <option value="">
                    Select Client
                  </option>

                  {clients.map((client) => (
                    <option
                      key={client.id}
                      value={client.id}
                    >
                      {client.name || "Unnamed Client"}
                    </option>
                  ))}

                </select>
              ) : (
                <p className="rounded-lg bg-gray-50 px-4 py-3">
                  {form.client.name || "-"}
                </p>
              )}

            </div>

            {/* ABN */}

            <Field
              label="ABN"
              value={form.client.abn}
              editing={false}
            />

            {/* Contact Name */}

            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Contact Name
              </label>

              {editing ? (
                <select
                  value={selectedContactIndex}
                  onChange={(e) =>
                    handleContactChange(e.target.value)
                  }
                  disabled={!form.client.id || clientContacts.length === 0}
                  className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-black focus:ring-1 focus:ring-black disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                >

                  <option value="">
                    {!form.client.id
                      ? "Select Client First"
                      : clientContacts.length === 0
                      ? "No Contacts Available"
                      : "Select Contact"}
                  </option>

                  {clientContacts.map((contact, index) => (
                    <option
                      key={`${index}-${contact.email || contact.contactName}`}
                      value={String(index)}
                    >
                      {contact.contactName || "Unnamed Contact"}
                    </option>
                  ))}

                </select>
              ) : (
                <p className="rounded-lg bg-gray-50 px-4 py-3">
                  {form.client.selectedContact.contactName || "-"}
                </p>
              )}

            </div>

            {/* Email */}

            <Field
              label="Email"
              type="email"
              value={form.client.selectedContact.email}
              editing={false}
            />

            {/* Phone */}

            <Field
              label="Phone"
              value={form.client.selectedContact.phone}
              editing={false}
            />

            {/* Address */}

            <Field
              label="Address"
              value={form.client.address}
              editing={false}
            />

          </div>

          {editing && form.client.id && clientContacts.length === 0 && (
            <p className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
              This Client has no contacts. Please add a Contact
              in the Clients page before saving this Invoice.
            </p>
          )}

        </section>

        {/* =================================================
            Invoice Items
        ================================================= */}

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">

          <div className="mb-5 flex items-center justify-between">

            <div>

              <h2 className="text-xl font-semibold">
                Invoice Items
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Services, quantities and pricing
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

          {form.items.length === 0 ? (
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

                    <th className="pb-3 pr-4">
                      Tax %
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

                  {calculatedItems.map((item, index) => (
                    <tr
                      key={index}
                      className="border-b last:border-0"
                    >

                      <td className="py-4 pr-4">

                        {editing ? (
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "description",
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2"
                            placeholder="Description"
                          />
                        ) : (
                          item.description || "-"
                        )}

                      </td>

                      <td className="py-4 pr-4">

                        {editing ? (
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.qty}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "qty",
                                e.target.value
                              )
                            }
                            className="w-24 rounded-lg border border-gray-300 px-3 py-2"
                          />
                        ) : (
                          item.qty
                        )}

                      </td>

                      <td className="py-4 pr-4">

                        {editing ? (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "unitPrice",
                                e.target.value
                              )
                            }
                            className="w-32 rounded-lg border border-gray-300 px-3 py-2"
                          />
                        ) : (
                          `$${item.unitPrice.toFixed(2)}`
                        )}

                      </td>

                      <td className="py-4 pr-4">

                        {editing ? (
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={item.tax}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "tax",
                                e.target.value
                              )
                            }
                            className="w-24 rounded-lg border border-gray-300 px-3 py-2"
                          />
                        ) : (
                          `${item.tax}%`
                        )}

                      </td>

                      <td className="py-4 text-right font-medium">
                        ${item.total.toFixed(2)}
                      </td>

                      {editing && (
                        <td className="py-4 pl-4">

                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-sm text-red-600 hover:underline"
                          >
                            Remove
                          </button>

                        </td>
                      )}

                    </tr>
                  ))}

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
                ${subtotal.toFixed(2)}
              </span>
            </div>

            <div className="mb-3 flex justify-between">
              <span className="text-gray-600">
                GST (10%)
              </span>

              <span>
                ${gst.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>

              <span>
                ${total.toFixed(2)}
              </span>
            </div>

          </div>

        </section>

        {/* =================================================
            Notes
        ================================================= */}

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">

          <h2 className="mb-5 text-xl font-semibold">
            Notes
          </h2>

          {editing ? (
            <textarea
              value={form.notes}
              onChange={(e) =>
                updateForm("notes", e.target.value)
              }
              rows={6}
              className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3"
              placeholder="Enter notes"
            />
          ) : (
            <div className="rounded-lg bg-gray-50 p-5">

              {form.notes ? (
                <p className="whitespace-pre-line leading-7">
                  {form.notes}
                </p>
              ) : (
                <p className="text-gray-500">
                  No notes provided.
                </p>
              )}

            </div>
          )}

        </section>

        {/* =================================================
            YJ Contact
        ================================================= */}

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">

          <h2 className="mb-5 text-xl font-semibold">
            YJ Contact
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            <Field
              label="Contact Name"
              value={form.accountManager}
              editing={editing}
              onChange={(value) =>
                updateForm("accountManager", value)
              }
            />

            <Field
              label="Contact Email"
              type="email"
              value={form.accountManagerEmail}
              editing={editing}
              onChange={(value) =>
                updateForm("accountManagerEmail", value)
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
                <InvoicePDF invoice={invoiceDataForPDF} />
              }
              fileName={`${
                form.invoiceNumber || "invoice"
              }.pdf`}
              className="cursor-pointer rounded-lg bg-indigo-800 px-5 py-2.5 text-sm font-medium text-gray-100 transition hover:bg-amber-400 hover:text-black"
            >
              {({ loading }) =>
                loading
                  ? "Preparing PDF..."
                  : "Download PDF"
              }
            </PDFDownloadLink>

          </div>

          <div className="h-[900px] overflow-hidden rounded-lg border">

            <PDFViewer
              key={JSON.stringify(invoiceDataForPDF)}
              width="100%"
              height="100%"
              showToolbar
            >
              <InvoicePDF invoice={invoiceDataForPDF} />
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
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
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
