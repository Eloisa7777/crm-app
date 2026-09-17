"use client";

import { useMemo, useState } from "react";

const initialItem = {
  description: "",
  qty: 1,
  unitPrice: "",
};

export default function NewPurchaseOrderPage() {
  const [items, setItems] = useState([{ ...initialItem }]);

  const [form, setForm] = useState({
    poNumber: "PO-2026-00125",
    poDate: new Date().toISOString().split("T")[0],
    deliveryDate: "",

    supplierName: "",
    supplierABN: "",
    supplierContact: "",
    supplierEmail: "",
    supplierPhone: "",

    siteAddress: "",

    scopeOfWork: "",

    projectManager: "",
    projectManagerEmail: "",

    siteManager: "",
    siteManagerEmail: "",
  });

  function updateForm(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateItem(index, field, value) {
    setItems((prev) => {
      const updated = [...prev];

      updated[index] = {
        ...updated[index],
        [field]: value,
      };

      return updated;
    });
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        ...initialItem,
      },
    ]);
  }

  function removeItem(index) {
    setItems((prev) => {
      if (prev.length === 1) {
        return prev;
      }

      return prev.filter((_, i) => i !== index);
    });
  }

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const qty = Number(item.qty) || 0;
      const unitPrice = Number(item.unitPrice) || 0;

      return sum + qty * unitPrice;
    }, 0);
  }, [items]);

  const gst = subtotal * 0.1;
  const total = subtotal + gst;

  function money(value) {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(value);
  }

  function handleScopeChange(value) {
    const lines = value.split("\n");

    if (lines.length > 20) {
      return;
    }

    updateForm("scopeOfWork", value);
  }

  function handleGeneratePO() {
    console.log({
      ...form,
      items,
      subtotal,
      gst,
      total,
    });

    alert("PO data ready. PDF generation will be connected next.");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">

      {/* HEADER */}
      <div className="flex items-start justify-between mb-8">

        <div>
          <button
            type="button"
            onClick={() =>
              (window.location.href = "/purchase-orders")
            }
            className="text-sm text-gray-500 hover:text-gray-900 mb-3"
          >
            ← Purchase Orders
          </button>

          <h1 className="text-2xl font-semibold text-gray-900">
            New Purchase Order
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Create a new purchase order
          </p>
        </div>

        <div className="flex gap-3">

          <button
            type="button"
            onClick={() =>
              (window.location.href = "/purchase-orders")
            }
            className="px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleGeneratePO}
            className="px-5 py-2.5 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800"
          >
            Generate PO
          </button>

        </div>
      </div>


      <div className="max-w-6xl mx-auto space-y-6">

        {/* PO INFORMATION */}
        <section className="bg-white border border-gray-200 rounded-xl">

          <div className="px-6 py-5 border-b border-gray-200">

            <h2 className="text-base font-semibold text-gray-900">
              Purchase Order Information
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Basic information for this purchase order.
            </p>

          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">

            <FormField label="PO Number">
              <input
                type="text"
                value={form.poNumber}
                onChange={(e) =>
                  updateForm("poNumber", e.target.value)
                }
                className="input"
              />
            </FormField>

            <FormField label="PO Date">
              <input
                type="date"
                value={form.poDate}
                onChange={(e) =>
                  updateForm("poDate", e.target.value)
                }
                className="input"
              />
            </FormField>

            <FormField label="Delivery Date">
              <input
                type="date"
                value={form.deliveryDate}
                onChange={(e) =>
                  updateForm("deliveryDate", e.target.value)
                }
                className="input"
              />
            </FormField>

          </div>
        </section>


        {/* SUPPLIER */}
        <section className="bg-white border border-gray-200 rounded-xl">

          <div className="px-6 py-5 border-b border-gray-200">

            <h2 className="text-base font-semibold text-gray-900">
              Supplier
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Enter the supplier information.
            </p>

          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">

            <FormField label="Supplier Name" required>
              <input
                type="text"
                placeholder="ABC Plasterboard Supplies"
                value={form.supplierName}
                onChange={(e) =>
                  updateForm("supplierName", e.target.value)
                }
                className="input"
              />
            </FormField>

            <FormField label="ABN">
              <input
                type="text"
                placeholder="XX XXX XXX XXX"
                value={form.supplierABN}
                onChange={(e) =>
                  updateForm("supplierABN", e.target.value)
                }
                className="input"
              />
            </FormField>

            <FormField label="Contact Name">
              <input
                type="text"
                placeholder="Contact person"
                value={form.supplierContact}
                onChange={(e) =>
                  updateForm("supplierContact", e.target.value)
                }
                className="input"
              />
            </FormField>

            <FormField label="Email">
              <input
                type="email"
                placeholder="supplier@example.com"
                value={form.supplierEmail}
                onChange={(e) =>
                  updateForm("supplierEmail", e.target.value)
                }
                className="input"
              />
            </FormField>

            <FormField label="Phone">
              <input
                type="tel"
                placeholder="04XX XXX XXX"
                value={form.supplierPhone}
                onChange={(e) =>
                  updateForm("supplierPhone", e.target.value)
                }
                className="input"
              />
            </FormField>

          </div>
        </section>


        {/* SITE ADDRESS */}
        <section className="bg-white border border-gray-200 rounded-xl">

          <div className="px-6 py-5 border-b border-gray-200">

            <h2 className="text-base font-semibold text-gray-900">
              Site Address
            </h2>

          </div>

          <div className="p-6">

            <textarea
              rows={3}
              placeholder="Enter project site address..."
              value={form.siteAddress}
              onChange={(e) =>
                updateForm("siteAddress", e.target.value)
              }
              className="input resize-none"
            />

          </div>
        </section>


        {/* ORDER ITEMS */}
        <section className="bg-white border border-gray-200 rounded-xl">

          <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">

            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Order Items
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Add the materials, services or trade packages required.
              </p>
            </div>

            <button
              type="button"
              onClick={addItem}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium hover:bg-gray-50"
            >
              + Add Item
            </button>

          </div>


          <div className="p-6">

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead>

                  <tr className="border-b border-gray-200">

                    <th className="text-left pb-3 text-xs font-medium text-gray-500 uppercase">
                      Description
                    </th>

                    <th className="text-center pb-3 text-xs font-medium text-gray-500 uppercase w-28">
                      Qty
                    </th>

                    <th className="text-right pb-3 text-xs font-medium text-gray-500 uppercase w-40">
                      Unit Price
                    </th>

                    <th className="text-right pb-3 text-xs font-medium text-gray-500 uppercase w-40">
                      Total
                    </th>

                    <th className="w-12"></th>

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
                            placeholder="e.g. 13mm Plasterboard"
                            value={item.description}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "description",
                                e.target.value
                              )
                            }
                            className="input"
                          />

                        </td>


                        <td className="py-3 px-2">

                          <input
                            type="number"
                            min="0"
                            value={item.qty}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "qty",
                                e.target.value
                              )
                            }
                            className="input text-center"
                          />

                        </td>


                        <td className="py-3 px-2">

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "unitPrice",
                                e.target.value
                              )
                            }
                            className="input text-right"
                          />

                        </td>


                        <td className="py-3 px-2 text-right">

                          <span className="text-sm font-medium text-gray-900">
                            {money(lineTotal)}
                          </span>

                        </td>


                        <td className="py-3 pl-2">

                          <button
                            type="button"
                            onClick={() =>
                              removeItem(index)
                            }
                            disabled={items.length === 1}
                            className="text-gray-400 hover:text-red-600 disabled:opacity-30"
                            title="Remove item"
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


            {/* TOTALS */}
            <div className="flex justify-end mt-6">

              <div className="w-full sm:w-80 space-y-3">

                <div className="flex justify-between text-sm">

                  <span className="text-gray-500">
                    Subtotal
                  </span>

                  <span className="font-medium">
                    {money(subtotal)}
                  </span>

                </div>

                <div className="flex justify-between text-sm">

                  <span className="text-gray-500">
                    GST 10%
                  </span>

                  <span className="font-medium">
                    {money(gst)}
                  </span>

                </div>

                <div className="border-t border-gray-200 pt-3 flex justify-between">

                  <span className="font-semibold">
                    Total
                  </span>

                  <span className="text-lg font-bold">
                    {money(total)}
                  </span>

                </div>

              </div>

            </div>

          </div>
        </section>


        {/* SCOPE OF WORK */}
        <section className="bg-white border border-gray-200 rounded-xl">

          <div className="px-6 py-5 border-b border-gray-200">

            <div className="flex items-center justify-between">

              <div>

                <h2 className="text-base font-semibold text-gray-900">
                  Scope of Work
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Add the scope, requirements or notes for this PO.
                </p>

              </div>

              <span className="text-xs text-gray-400">
                {form.scopeOfWork
                  ? form.scopeOfWork.split("\n").length
                  : 0}
                /20 lines
              </span>

            </div>

          </div>

          <div className="p-6">

            <textarea
              rows={10}
              placeholder="Enter scope of work..."
              value={form.scopeOfWork}
              onChange={(e) =>
                handleScopeChange(e.target.value)
              }
              className="input resize-none"
            />

          </div>

        </section>


        {/* YJ SITE CONTACT */}
        <section className="bg-white border border-gray-200 rounded-xl">

          <div className="px-6 py-5 border-b border-gray-200">

            <h2 className="text-base font-semibold text-gray-900">
              YJ Site Contact
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Contacts for the supplier to communicate with on site.
            </p>

          </div>


          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">

            <FormField label="Project Manager">

              <input
                type="text"
                placeholder="Name"
                value={form.projectManager}
                onChange={(e) =>
                  updateForm(
                    "projectManager",
                    e.target.value
                  )
                }
                className="input"
              />

            </FormField>


            <FormField label="Project Manager Email">

              <input
                type="email"
                placeholder="Email"
                value={form.projectManagerEmail}
                onChange={(e) =>
                  updateForm(
                    "projectManagerEmail",
                    e.target.value
                  )
                }
                className="input"
              />

            </FormField>


            <FormField label="Site Manager">

              <input
                type="text"
                placeholder="Name"
                value={form.siteManager}
                onChange={(e) =>
                  updateForm(
                    "siteManager",
                    e.target.value
                  )
                }
                className="input"
              />

            </FormField>


            <FormField label="Site Manager Email">

              <input
                type="email"
                placeholder="Email"
                value={form.siteManagerEmail}
                onChange={(e) =>
                  updateForm(
                    "siteManagerEmail",
                    e.target.value
                  )
                }
                className="input"
              />

            </FormField>

          </div>
        </section>


        {/* TRADING TERMS */}
        <section className="bg-white border border-gray-200 rounded-xl">

          <div className="px-6 py-5 border-b border-gray-200">

            <h2 className="text-base font-semibold text-gray-900">
              Trading Terms
            </h2>

          </div>

          <div className="p-6">

            <div className="space-y-3 text-sm text-gray-600">

              <p>
                • On completion of job, payment is due 15 days
                from receipt of invoice on the 15th/30th Day of
                each month.
              </p>

              <p>
                • ALL Variations must be approved by YJ Building
                Evolution Pty Ltd before commencement.
              </p>

              <p>
                • Send all invoices directly to:
                <span className="font-medium text-gray-900 ml-1">
                  account@yjliningscreation.com.au
                </span>
              </p>

            </div>

          </div>
        </section>


        {/* BOTTOM BUTTONS */}
        <div className="flex justify-end gap-3 pb-10">

          <button
            type="button"
            onClick={() =>
              (window.location.href = "/purchase-orders")
            }
            className="px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleGeneratePO}
            className="px-6 py-2.5 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800"
          >
            Generate PO
          </button>

        </div>

      </div>

    </div>
  );
}


/* =========================
   FORM FIELD
========================= */

function FormField({ label, required, children }) {
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

      {children}

    </div>
  );
}