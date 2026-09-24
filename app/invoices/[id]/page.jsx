"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
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
     Form
  ===================================================== */

  const [form, setForm] = useState({
    invoiceNumber: "",
    projectName: "",
    status: "Draft",

    invoiceDate: "",
    dueDate: "",

    client: {
      id: "",
      name: "",
      abn: "",
      contact: "",
      email: "",
      phone: "",
      address: "",
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
     Load Invoice
  ===================================================== */

  useEffect(() => {
    const loadInvoice = async () => {
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
           Client
        ----------------------------------------------- */

        const client =
          typeof data.client === "object" &&
          data.client !== null
            ? data.client
            : {
                name: data.client || "",
              };

        /* -----------------------------------------------
           Items
        ----------------------------------------------- */

        const items = Array.isArray(data.items)
          ? data.items.map((item) => ({
              description:
                item?.description || "",

              qty:
                Number(item?.qty) || 0,

              unitPrice:
                Number(item?.unitPrice) || 0,
              tax:
                Number(item?.tax) || 0,
            }))
          : [];

        /* -----------------------------------------------
           Form
        ----------------------------------------------- */

        setForm({
          invoiceNumber:
            data.invoiceNumber || "",

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

          client: {
            id:
              client?.id || "",

            name:
              client?.name || "",

            abn:
              client?.abn || "",

            contact:
              client?.contact || "",

            email:
              client?.email || "",

            phone:
              client?.phone || "",

            address:
              client?.address || "",
          },

          clientId:
            data.clientId ||
            client?.id ||
            "",

          poNumber:
            data.poNumber || "",

          items,

          notes:
            data.notes || "",

          /* New field */
          accountManager:
            data.accountManager ||
            /* Old field fallback */
            data.projectManager ||
            "",

          accountManagerEmail:
            data.accountManagerEmail ||
            /* Old field fallback */
            data.projectManagerEmail ||
            "",
        });
      } catch (err) {
        console.error(
          "Failed to load invoice:",
          err
        );

        setError(
          err.message ||
            "Failed to load invoice."
        );
      } finally {
        setLoading(false);
      }
    };

    loadInvoice();
  }, [params?.id]);

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
     Client Update
  ===================================================== */

  function updateClient(field, value) {
    setForm((prev) => ({
      ...prev,

      client: {
        ...prev.client,
        [field]: value,
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
        (_, itemIndex) =>
          itemIndex !== index
      ),
    }));
  }

  /* =====================================================
     Totals
  ===================================================== */

  const subtotal = useMemo(() => {
    return form.items.reduce(
      (sum, item) => {
        const qty =
          Number(item?.qty) || 0;

        const unitPrice =
          Number(item?.unitPrice) || 0;

        const tax = Number(item?.tax) || 0;

        return (
          sum +
          qty * unitPrice * (1 + tax / 100)
        );
      },
      0
    );
  }, [form.items]);

  const gst = useMemo(() => {
    return subtotal * 0.1;
  }, [subtotal]);

  const total = useMemo(() => {
    return subtotal + gst;
  }, [subtotal, gst]);

  /* =====================================================
     PDF Items
  ===================================================== */

  const pdfItems = useMemo(() => {
    return form.items.map((item) => {
      const qty =
        Number(item?.qty) || 0;

      const unitPrice =
        Number(item?.unitPrice) || 0;

      const tax = Number(item?.tax) || 0;

      return {
        description:
          item?.description || "",

        qty,

        unitPrice,

        tax,

        total:
          qty * unitPrice * (1 + tax / 100),
      };
    });
  }, [form.items]);

  /* =====================================================
     PDF Data
  ===================================================== */

  const invoiceDataForPDF = useMemo(() => {
    return {
      invoiceNumber:
        form.invoiceNumber || "",

      invoiceDate:
        form.invoiceDate || "",

      dueDate:
        form.dueDate || "",

      status:
        form.status || "Draft",

      /* Reference = Project Name */
      projectName:
        form.projectName || "",

      poNumber:
        form.poNumber || "",

      notes:
        form.notes || "",

      accountManager:
        form.accountManager || "",

      accountManagerEmail:
        form.accountManagerEmail || "",

      client:
        form.client || {},

      clientName:
        form.client?.name || "",

      clientAddress:
        form.client?.address || "",

      items:
        pdfItems,

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
    pdfItems,
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
        throw new Error(
          "Invoice ID is missing."
        );
      }

      const invoiceRef = doc(
        db,
        "invoices",
        params.id
      );

      /* -----------------------------------------------
         Clean Items
      ----------------------------------------------- */

      const cleanItems =
        form.items.map((item) => {
          const qty =
            Number(item?.qty) || 0;

          const unitPrice =
            Number(item?.unitPrice) || 0;

          const tax = Number(item?.tax) || 0;

          return {
            description:
              item?.description || "",

            qty,

            unitPrice,

            tax,

            total:
              qty * unitPrice * (1 + tax / 100),
          };
        });

      /* -----------------------------------------------
         Totals
      ----------------------------------------------- */

      const cleanSubtotal =
        cleanItems.reduce(
          (sum, item) =>
            sum + item.total,
          0
        );

      const cleanGst =
        cleanSubtotal * 0.1;

      const cleanTotal =
        cleanSubtotal + cleanGst;

      /* -----------------------------------------------
         Client
      ----------------------------------------------- */

      const cleanClient = {
        id:
          form.client?.id || "",

        name:
          form.client?.name || "",

        abn:
          form.client?.abn || "",

        contact:
          form.client?.contact || "",

        email:
          form.client?.email || "",

        phone:
          form.client?.phone || "",

        address:
          form.client?.address || "",
      };

      /* -----------------------------------------------
         Updated Data
      ----------------------------------------------- */

      const updatedData = {
        invoiceNumber:
          form.invoiceNumber?.trim() || "",

        projectName:
          form.projectName?.trim() || "",

        status:
          form.status || "Draft",

        invoiceDate:
          form.invoiceDate || "",

        dueDate:
          form.dueDate || "",

        clientId:
          form.clientId ||
          form.client?.id ||
          "",

        client:
          cleanClient,

        poNumber:
          form.poNumber || "",

        items:
          cleanItems,

        notes:
          form.notes || "",

        /* New standard fields */
        accountManager:
          form.accountManager || "",

        accountManagerEmail:
          form.accountManagerEmail || "",

        subtotal:
          cleanSubtotal,

        gst:
          cleanGst,

        total:
          cleanTotal,

        updatedAt:
          serverTimestamp(),
      };

      /* -----------------------------------------------
         Firebase
      ----------------------------------------------- */

      await updateDoc(
        invoiceRef,
        updatedData
      );

      /* -----------------------------------------------
         Update Local Invoice
      ----------------------------------------------- */

      setInvoice((prev) => ({
        ...prev,
        ...updatedData,

        items:
          cleanItems,

        client:
          cleanClient,

        subtotal:
          cleanSubtotal,

        gst:
          cleanGst,

        total:
          cleanTotal,
      }));

      /* -----------------------------------------------
         Update Local Form
      ----------------------------------------------- */

      setForm((prev) => ({
        ...prev,

        items:
          cleanItems,

        client:
          cleanClient,
      }));

      setEditing(false);
      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 2500);
    } catch (err) {
      console.error(
        "Failed to save invoice:",
        err
      );

      setError(
        err.message ||
          "Failed to save invoice."
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

    const client =
      typeof data.client === "object" &&
      data.client !== null
        ? data.client
        : {
            name:
              data.client || "",
          };

    const items =
      Array.isArray(data.items)
        ? data.items.map((item) => ({
            description:
              item?.description || "",

            qty:
              Number(item?.qty) || 0,

            unitPrice:
              Number(item?.unitPrice) || 0,
          }))
        : [];

    setForm({
      invoiceNumber:
        data.invoiceNumber || "",

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

      client: {
        id:
          client?.id || "",

        name:
          client?.name || "",

        abn:
          client?.abn || "",

        contact:
          client?.contact || "",

        email:
          client?.email || "",

        phone:
          client?.phone || "",

        address:
          client?.address || "",
      },

      clientId:
        data.clientId ||
        client?.id ||
        "",

      poNumber:
        data.poNumber || "",

      items,

      notes:
        data.notes || "",

      accountManager:
        data.accountManager ||
        data.projectManager ||
        "",

      accountManagerEmail:
        data.accountManagerEmail ||
        data.projectManagerEmail ||
        "",
    });

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

        {/* =================================================
            Header
        ================================================= */}

        <div className="mb-8 flex items-start justify-between">

          <div>

            <Link
              href="/invoices"
              className="text-sm text-gray-500 hover:text-black"
            >
              ← Invoices
            </Link>

            <h1 className="mt-3 text-3xl font-bold">
              {form.invoiceNumber ||
                "Invoice"}
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Invoice ID: {invoice.id}
            </p>

          </div>

          <div className="flex items-center gap-3">

            {!editing && (
              <button
                type="button"
                onClick={() =>
                  setEditing(true)
                }
                className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
                  disabled={saving}
                  className="rounded-lg bg-black px-5 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </>
            )}

            {/* =============================================
                Header PDF Download
            ============================================= */}

            <PDFDownloadLink
              document={
                <InvoicePDF
                  invoice={
                    invoiceDataForPDF
                  }
                />
              }
              fileName={`${
                form.invoiceNumber ||
                "invoice"
              }.pdf`}
              className="rounded-lg bg-black px-5 py-3 text-sm font-medium text-white"
            >
              {({ loading }) =>
                loading
                  ? "Preparing PDF..."
                  : "Download PDF"
              }
            </PDFDownloadLink>

          </div>
        </div>


        {/* =================================================
            Saved Message
        ================================================= */}

        {saved && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            Invoice changes saved successfully.
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

            <Field
              label="Project Name (Reference)"
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

                  <option value="Paid">
                    Paid
                  </option>

                  <option value="Overdue">
                    Overdue
                  </option>

                  <option value="Cancelled">
                    Cancelled
                  </option>

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
              value={
                form.invoiceNumber
              }
              editing={editing}
              onChange={(value) =>
                updateForm(
                  "invoiceNumber",
                  value
                )
              }
            />

            <Field
              label="Invoice Date"
              type="date"
              value={
                form.invoiceDate
              }
              editing={editing}
              onChange={(value) =>
                updateForm(
                  "invoiceDate",
                  value
                )
              }
            />

            <Field
              label="Due Date"
              type="date"
              value={
                form.dueDate
              }
              editing={editing}
              onChange={(value) =>
                updateForm(
                  "dueDate",
                  value
                )
              }
            />

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
                Client information
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

            <Field
              label="Client Name"
              value={
                form.client.name
              }
              editing={editing}
              onChange={(value) =>
                updateClient(
                  "name",
                  value
                )
              }
            />

            <Field
              label="ABN"
              value={
                form.client.abn
              }
              editing={editing}
              onChange={(value) =>
                updateClient(
                  "abn",
                  value
                )
              }
            />

            <Field
              label="Contact"
              value={
                form.client.contact
              }
              editing={editing}
              onChange={(value) =>
                updateClient(
                  "contact",
                  value
                )
              }
            />

            <Field
              label="Email"
              type="email"
              value={
                form.client.email
              }
              editing={editing}
              onChange={(value) =>
                updateClient(
                  "email",
                  value
                )
              }
            />

            <Field
              label="Phone"
              value={
                form.client.phone
              }
              editing={editing}
              onChange={(value) =>
                updateClient(
                  "phone",
                  value
                )
              }
            />

            <Field
              label="Address"
              value={
                form.client.address
              }
              editing={editing}
              onChange={(value) =>
                updateClient(
                  "address",
                  value
                )
              }
            />

          </div>

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

                  {form.items.map(
                    (item, index) => {

                      const qty =
                        Number(item?.qty) ||
                        0;

                      const unitPrice =
                        Number(
                          item?.unitPrice
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
                                  item.description ||
                                  ""
                                }
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
                              `$${unitPrice.toFixed(
                                2
                              )}`
                            )}

                          </td>

                          <td className="py-4 pr-4">

                            {editing ? (
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={
                                  item.tax
                                }
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
                              `${item.tax || 0}%`
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

          {/* =================================================
              Totals
          ================================================= */}

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
                updateForm(
                  "notes",
                  e.target.value
                )
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
              value={
                form.accountManager
              }
              editing={editing}
              onChange={(value) =>
                updateForm(
                  "accountManager",
                  value
                )
              }
            />

            <Field
              label="Contact Email"
              type="email"
              value={
                form.accountManagerEmail
              }
              editing={editing}
              onChange={(value) =>
                updateForm(
                  "accountManagerEmail",
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
                <InvoicePDF
                  invoice={
                    invoiceDataForPDF
                  }
                />
              }
              fileName={`${
                form.invoiceNumber ||
                "invoice"
              }.pdf`}
              className="rounded-lg bg-black px-5 py-3 text-sm font-medium text-white"
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
              key={JSON.stringify(
                invoiceDataForPDF
              )}
              width="100%"
              height="100%"
              showToolbar
            >
              <InvoicePDF
                invoice={
                  invoiceDataForPDF
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
          value={value || ""}
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