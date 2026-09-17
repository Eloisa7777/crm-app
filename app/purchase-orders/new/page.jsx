"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  PDFDownloadLink,
  PDFViewer,
} from "@react-pdf/renderer";

import PurchaseOrderPDF from "@/components/PurchaseOrderPDF";

/* =====================================================
   Temporary Supplier Data
   Later this will come from Firebase
===================================================== */

const suppliers = [
  {
    id: "abc-plasterboard",
    name: " LK Plastering",
    abn: " 44 397 435 325",
    contact: "Kun Liu",
    email: "huize0616@gmail.com",
    phone: "-",
  },
  {
    id: "xyz-aluminium",
    name: "XYZ Aluminium",
    abn: "23 456 789 012",
    contact: "David Lee",
    email: "david@xyzaluminium.com.au",
    phone: "07 3234 5678",
  },
  {
    id: "prime-carpentry",
    name: "Prime Carpentry",
    abn: "34 567 890 123",
    contact: "Michael Brown",
    email: "michael@primecarpentry.com.au",
    phone: "0412 345 678",
  },
  {
    id: "brisbane-insulation",
    name: "Brisbane Insulation Services",
    abn: "45 678 901 234",
    contact: "Sarah Wilson",
    email: "sarah@brisbaneinsulation.com.au",
    phone: "0433 456 789",
  },
];


export default function NewPurchaseOrderPage() {
 const [showPreview, setShowPreview] = useState(false);
  /* =====================================================
     Default Supplier
  ===================================================== */

  const [selectedSupplierId, setSelectedSupplierId] = useState(
    suppliers[0]?.id || ""
  );


  /* =====================================================
     PO Items
  ===================================================== */

  const [items, setItems] = useState([
    {
      description: "",
      qty: 1,
      unitPrice: "",
    },
  ]);


  /* =====================================================
     Form
  ===================================================== */

  const [form, setForm] = useState({
    poNumber: "PO-2026-00125",

    poDate: new Date().toISOString().split("T")[0],

    deliveryDate: "",

    siteAddress: "",

    scopeOfWork: "",

    projectManager: "",
    projectManagerEmail: "",

    siteManager: "",
    siteManagerEmail: "",
  });


  /* =====================================================
     Selected Supplier
  ===================================================== */

  const selectedSupplier = useMemo(() => {
    return suppliers.find(
      (supplier) => supplier.id === selectedSupplierId
    );
  }, [selectedSupplierId]);


  /* =====================================================
     Form Update
  ===================================================== */

  function updateForm(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }


  /* =====================================================
     Supplier Change
  ===================================================== */

  function handleSupplierChange(e) {
    setSelectedSupplierId(e.target.value);
  }


  /* =====================================================
     Item Update
  ===================================================== */

  function updateItem(index, field, value) {

    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );

  }


  /* =====================================================
     Add Item
  ===================================================== */

  function addItem() {

    setItems((prev) => [
      ...prev,
      {
        description: "",
        qty: 1,
        unitPrice: "",
      },
    ]);

  }


  /* =====================================================
     Remove Item
  ===================================================== */

  function removeItem(index) {

    setItems((prev) => {

      if (prev.length === 1) {
        return prev;
      }

      return prev.filter(
        (_, itemIndex) => itemIndex !== index
      );

    });

  }


  /* =====================================================
     Totals
  ===================================================== */

  const subtotal = useMemo(() => {

    return items.reduce((sum, item) => {

      const qty = Number(item.qty) || 0;

      const unitPrice =
        Number(item.unitPrice) || 0;

      return sum + qty * unitPrice;

    }, 0);

  }, [items]);


  const gst = subtotal * 0.1;

  const total = subtotal + gst;


  /* =====================================================
     Scope of Work
     Maximum 20 lines
  ===================================================== */

  function handleScopeChange(e) {

    const value = e.target.value;

    const lines = value.split("\n");

    if (lines.length <= 20) {

      updateForm("scopeOfWork", value);

    }

  }


    /* =====================================================
    Generate PO
    ===================================================== */

    function handleGeneratePO() {
    const poData = {
        poNumber: form.poNumber,
        poDate: form.poDate,
        deliveryDate: form.deliveryDate,

        siteAddress: form.siteAddress,

        scopeOfWork: form.scopeOfWork,

        projectManager: form.projectManager,
        projectManagerEmail: form.projectManagerEmail,

        siteManager: form.siteManager,
        siteManagerEmail: form.siteManagerEmail,

        supplier: selectedSupplier,

        items,
    };

    console.log("PO Data:", poData);

    setShowPreview(true);
    }


  return (
    <div className="min-h-screen">


      {/* =================================================
          Header
      ================================================= */}

      <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between">

        <div className="flex items-center gap-4">

          <Link
            href="/purchase-orders"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Purchase Orders
          </Link>

          <div className="h-5 w-px bg-gray-200" />

          <div>

            <h1 className="text-xl font-semibold text-gray-900">
              New Purchase Order
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Create a new purchase order
            </p>

          </div>

        </div>


        <div className="flex items-center gap-3">

          <Link
            href="/purchase-orders"
            className="px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
          >
            Cancel
          </Link>

          <button
            onClick={handleGeneratePO}
            className="px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800"
          >
            Generate PO
          </button>

        </div>

      </header>


      {/* =================================================
          Main Content
      ================================================= */}

      <div className="p-8 max-w-7xl">


        {/* =================================================
            PO Information
        ================================================= */}

        <section className="bg-white border border-gray-200 rounded-xl mb-6">

          <SectionHeader
            title="Purchase Order Information"
            description="Basic purchase order details"
          />

          <div className="p-6">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

              <FormField
                label="PO Number"
                value={form.poNumber}
                onChange={(value) =>
                  updateForm("poNumber", value)
                }
              />

              <FormField
                label="PO Date"
                type="date"
                value={form.poDate}
                onChange={(value) =>
                  updateForm("poDate", value)
                }
              />

              <FormField
                label="Delivery Date"
                type="date"
                value={form.deliveryDate}
                onChange={(value) =>
                  updateForm("deliveryDate", value)
                }
              />

            </div>

          </div>

        </section>


        {/* =================================================
            Supplier
        ================================================= */}

        <section className="bg-white border border-gray-200 rounded-xl mb-6">

          <SectionHeader
            title="Supplier"
            description="Select an existing supplier"
          />

          <div className="p-6">


            {/* Supplier Select */}

            <div className="mb-6">

              <label className="block text-sm font-medium text-gray-700 mb-2">

                Supplier

                <span className="text-red-500 ml-1">
                  *
                </span>

              </label>

              <select
                value={selectedSupplierId}
                onChange={handleSupplierChange}
                className="input"
              >

                {suppliers.map((supplier) => (

                  <option
                    key={supplier.id}
                    value={supplier.id}
                  >
                    {supplier.name}
                  </option>

                ))}

              </select>

              <p className="text-xs text-gray-500 mt-2">
                Select from your existing suppliers.
              </p>

            </div>


            {/* Supplier Details */}

            {selectedSupplier && (

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                <ReadOnlyField
                  label="ABN"
                  value={selectedSupplier.abn}
                />

                <ReadOnlyField
                  label="Contact Name"
                  value={selectedSupplier.contact}
                />

                <ReadOnlyField
                  label="Email"
                  value={selectedSupplier.email}
                />

                <ReadOnlyField
                  label="Phone"
                  value={selectedSupplier.phone}
                />

              </div>

            )}

          </div>

        </section>


        {/* =================================================
            Site Address
        ================================================= */}

        <section className="bg-white border border-gray-200 rounded-xl mb-6">

          <SectionHeader
            title="Site Address"
            description="Where the goods or services will be delivered"
          />

          <div className="p-6">

            <textarea
              value={form.siteAddress}
              onChange={(e) =>
                updateForm(
                  "siteAddress",
                  e.target.value
                )
              }
              rows={3}
              placeholder="Enter site address..."
              className="input resize-none"
            />

          </div>

        </section>


        {/* =================================================
            Order Items
        ================================================= */}

        <section className="bg-white border border-gray-200 rounded-xl mb-6">

          <SectionHeader
            title="Order Items"
            description="Add products, materials or services"
          />


          <div className="p-6">

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead>

                  <tr className="border-b border-gray-200">

                    <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3">
                      Description
                    </th>

                    <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3 w-24">
                      Qty
                    </th>

                    <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3 w-40">
                      Unit Price
                    </th>

                    <th className="text-right text-xs font-semibold text-gray-500 uppercase pb-3 w-40">
                      Total
                    </th>

                    <th className="w-12" />

                  </tr>

                </thead>


                <tbody>

                  {items.map((item, index) => {

                    const lineTotal =
                      (Number(item.qty) || 0) *
                      (Number(item.unitPrice) || 0);


                    return (

                      <tr
                        key={index}
                        className="border-b border-gray-100"
                      >

                        <td className="py-3 pr-3">

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
                            placeholder="Item description"
                            className="input"
                          />

                        </td>


                        <td className="py-3 pr-3">

                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={item.qty}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "qty",
                                e.target.value
                              )
                            }
                            className="input"
                          />

                        </td>


                        <td className="py-3 pr-3">

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
                            placeholder="0.00"
                            className="input"
                          />

                        </td>


                        <td className="py-3 text-right text-sm font-medium text-gray-900">

                          {money(lineTotal)}

                        </td>


                        <td className="py-3 text-right">

                          <button
                            type="button"
                            onClick={() =>
                              removeItem(index)
                            }
                            disabled={items.length === 1}
                            className="text-gray-400 hover:text-red-600 disabled:opacity-30"
                          >
                            ×
                          </button>

                        </td>

                      </tr>

                    );

                  })}

                </tbody>

              </table>

            </div>


            {/* Add Item */}

            <button
              type="button"
              onClick={addItem}
              className="mt-4 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              + Add Item
            </button>


            {/* Totals */}

            <div className="flex justify-end mt-8">

              <div className="w-72 space-y-3">

                <TotalRow
                  label="Subtotal"
                  value={money(subtotal)}
                />

                <TotalRow
                  label="GST 10%"
                  value={money(gst)}
                />

                <div className="border-t border-gray-200 pt-3 flex justify-between">

                  <span className="font-semibold text-gray-900">
                    Total
                  </span>

                  <span className="font-semibold text-gray-900">
                    {money(total)}
                  </span>

                </div>

              </div>

            </div>

          </div>

        </section>


        {/* =================================================
            Scope of Work
        ================================================= */}

        <section className="bg-white border border-gray-200 rounded-xl mb-6">

          <SectionHeader
            title="Scope of Work"
            description="Maximum 20 lines"
          />

          <div className="p-6">

            <textarea
              value={form.scopeOfWork}
              onChange={handleScopeChange}
              rows={10}
              placeholder="Enter scope of work..."
              className="input resize-none"
            />

            <div className="text-xs text-gray-500 mt-2">
              {form.scopeOfWork.split("\n").length} / 20 lines
            </div>

          </div>

        </section>


        {/* =================================================
            YJ Site Contact
        ================================================= */}

        <section className="bg-white border border-gray-200 rounded-xl mb-6">

          <SectionHeader
            title="YJ Site Contact"
            description="Project and site contacts"
          />

          <div className="p-6">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <FormField
                label="Project Manager"
                value={form.projectManager}
                onChange={(value) =>
                  updateForm(
                    "projectManager",
                    value
                  )
                }
                placeholder="Project manager name"
              />

              <FormField
                label="Project Manager Email"
                type="email"
                value={form.projectManagerEmail}
                onChange={(value) =>
                  updateForm(
                    "projectManagerEmail",
                    value
                  )
                }
                placeholder="pm@yjliningscreation.com.au"
              />

              <FormField
                label="Site Manager"
                value={form.siteManager}
                onChange={(value) =>
                  updateForm(
                    "siteManager",
                    value
                  )
                }
                placeholder="Site manager name"
              />

              <FormField
                label="Site Manager Email"
                type="email"
                value={form.siteManagerEmail}
                onChange={(value) =>
                  updateForm(
                    "siteManagerEmail",
                    value
                  )
                }
                placeholder="site@yjliningscreation.com.au"
              />

            </div>

          </div>

        </section>


        {/* =================================================
            Trading Terms
        ================================================= */}

        <section className="bg-white border border-gray-200 rounded-xl mb-6">

          <SectionHeader
            title="Trading Terms"
            description="Standard YJ Building Evolution terms"
          />

          <div className="p-6">

            <div className="space-y-3 text-sm text-gray-700">

              <p>
                On completion of job, payment is due 15 days
                from receipt of invoice on the 15th/30th Day
                of each month.
              </p>

              <p>
                ALL Variations must be approved by
                YJ Building Evolution Pty Ltd before commencement.
              </p>

              <p>
                Send all invoices directly to:
                <span className="font-medium ml-1">
                  account@yjliningscreation.com.au
                </span>
              </p>

            </div>

          </div>

        </section>


        {/* =================================================
            Bottom Actions
        ================================================= */}

        <div className="flex items-center justify-end gap-3 pb-8">

          <Link
            href="/purchase-orders"
            className="px-5 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
          >
            Cancel
          </Link>

          <button
            onClick={handleGeneratePO}
            className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800"
          >
            Generate PO
          </button>

        </div>

      </div>
      {/* =================================================
            PDF Preview
        ================================================= */}

        {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6">

            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">

            {/* Preview Header */}

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">

                <div>
                <h2 className="text-lg font-semibold text-gray-900">
                    Purchase Order Preview
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                    {form.poNumber}
                </p>
                </div>

                <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-900 text-2xl leading-none"
                >
                ×
                </button>

            </div>


            {/* PDF Preview */}

            <div className="flex-1 min-h-0 bg-gray-100 p-4">

                <PDFViewer
                width="100%"
                height="100%"
                showToolbar={false}
                >

                <PurchaseOrderPDF
                    data={{
                    poNumber: form.poNumber,
                    poDate: form.poDate,
                    deliveryDate: form.deliveryDate,

                    siteAddress: form.siteAddress,

                    scopeOfWork: form.scopeOfWork,

                    projectManager: form.projectManager,
                    projectManagerEmail:
                        form.projectManagerEmail,

                    siteManager: form.siteManager,
                    siteManagerEmail:
                        form.siteManagerEmail,

                    supplier: selectedSupplier,

                    items,
                    }}
                />

                </PDFViewer>

            </div>


            {/* Preview Footer */}

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">

                <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
                >
                Back to Edit
                </button>


                <PDFDownloadLink
                document={
                    <PurchaseOrderPDF
                    data={{
                        poNumber: form.poNumber,
                        poDate: form.poDate,
                        deliveryDate: form.deliveryDate,

                        siteAddress: form.siteAddress,

                        scopeOfWork: form.scopeOfWork,

                        projectManager:
                        form.projectManager,

                        projectManagerEmail:
                        form.projectManagerEmail,

                        siteManager:
                        form.siteManager,

                        siteManagerEmail:
                        form.siteManagerEmail,

                        supplier: selectedSupplier,

                        items,
                    }}
                    />
                }
                fileName={`${form.poNumber}.pdf`}
                >
                {({ loading }) => (
                    <button
                    type="button"
                    className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800"
                    >
                    {loading
                        ? "Preparing PDF..."
                        : "Download PDF"}
                    </button>
                )}
                </PDFDownloadLink>

            </div>

            </div>

        </div>
        )}
    </div>
  );
}


/* =====================================================
   Section Header
===================================================== */

function SectionHeader({
  title,
  description,
}) {
  return (
    <div className="px-6 py-5 border-b border-gray-200">

      <h2 className="text-base font-semibold text-gray-900">
        {title}
      </h2>

      {description && (
        <p className="text-sm text-gray-500 mt-1">
          {description}
        </p>
      )}

    </div>
  );
}


/* =====================================================
   Form Field
===================================================== */

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
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        required={required}
        className="input"
      />

    </div>
  );
}


/* =====================================================
   Read Only Field
===================================================== */

function ReadOnlyField({
  label,
  value,
}) {
  return (
    <div>

      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>

      <div className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-600 bg-gray-50">
        {value || "-"}
      </div>

    </div>
  );
}


/* =====================================================
   Total Row
===================================================== */

function TotalRow({
  label,
  value,
}) {
  return (
    <div className="flex justify-between text-sm">

      <span className="text-gray-500">
        {label}
      </span>

      <span className="font-medium text-gray-900">
        {value}
      </span>

    </div>
  );
}


/* =====================================================
   Currency
===================================================== */

function money(value) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(value);
}