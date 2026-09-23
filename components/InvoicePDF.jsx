
//import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";


/* =====================================================
   Styles
===================================================== */

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#222",
  },

  /* ===================================================
     Header
  =================================================== */

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },

  company: {
    width: "55%",
  },

  logo: {
    width: 100,
    height: "auto",
    marginBottom: 10,
  },

  companyName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
  },

  companyText: {
    fontSize: 8,
    lineHeight: 1.4,
  },

  invoiceBox: {
    width: "35%",
    alignItems: "flex-end",
  },

  invoiceTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },

  invoiceInfo: {
    flexDirection: "row",
    marginBottom: 4,
  },

  invoiceLabel: {
    width: 70,
    textAlign: "right",
    fontWeight: "bold",
    marginRight: 8,
  },

  invoiceValue: {
    width: 90,
    textAlign: "right",
  },

  /* ===================================================
     Sections
  =================================================== */

  section: {
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 6,
    textTransform: "uppercase",
  },

  /* ===================================================
     Bill To
  =================================================== */

  billToBox: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    minHeight: 70,
  },

  billToName: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 5,
  },

  billToText: {
    fontSize: 8,
    lineHeight: 1.4,
    marginBottom: 2,
  },

  projectRow: {
    flexDirection: "row",
    marginTop: 8,
  },

  projectLabel: {
    fontWeight: "bold",
    marginRight: 5,
  },

  /* ===================================================
     Invoice Table
  =================================================== */

  table: {
    width: "100%",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#ccc",
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f2f2f2",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingVertical: 7,
  },

  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 8,
    minHeight: 28,
  },

  colDescription: {
    width: "52%",
    paddingHorizontal: 6,
  },

  colQty: {
    width: "10%",
    textAlign: "center",
    paddingHorizontal: 3,
  },

  colPrice: {
    width: "18%",
    textAlign: "right",
    paddingHorizontal: 6,
  },

  colAmount: {
    width: "20%",
    textAlign: "right",
    paddingHorizontal: 6,
  },

  headerText: {
    fontWeight: "bold",
    fontSize: 8,
  },

  /* ===================================================
     Totals
  =================================================== */

  totalsContainer: {
    marginTop: 12,
    alignItems: "flex-end",
  },

  totalRow: {
    flexDirection: "row",
    width: 220,
    justifyContent: "space-between",
    marginBottom: 6,
  },

  totalLabel: {
    fontWeight: "bold",
  },

  grandTotal: {
    flexDirection: "row",
    width: 220,
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#222",
    paddingTop: 8,
    marginTop: 4,
  },

  grandTotalText: {
    fontSize: 12,
    fontWeight: "bold",
  },

  /* ===================================================
     Payment
  =================================================== */

  paymentBox: {
    marginTop: 30,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
  },

  paymentTitle: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 6,
  },

  paymentText: {
    fontSize: 8,
    lineHeight: 1.5,
  },

  /* ===================================================
     Notes
  =================================================== */

  notes: {
    marginTop: 20,
  },

  /* ===================================================
     Footer
  =================================================== */

  footer: {
    position: "absolute",
    bottom: 25,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 7,
    color: "#777",
  },
});


/* =====================================================
   Currency
===================================================== */

function formatCurrency(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(number);
}


/* =====================================================
   Date
===================================================== */

function formatDate(value) {
  if (!value) return "";

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("en-AU");
  } catch {
    return value;
  }
}


/* =====================================================
   Invoice PDF
===================================================== */

export default function InvoicePDF({
  invoice = {},
}) {
  /* ===================================================
     Invoice Data
  =================================================== */

const {
  invoiceNumber = "",
  invoiceDate = "",
  dueDate = "",

  client = {},

  clientName = "",

  projectName = "",

  items = [],

  notes = "",

  bankName = "",
  accountName = "YJ BUILDING EVOLUTION",
  bsb = "034115",
  accountNumber = "706930",

  paymentTerms =
    "Payment due by the due date shown above.",
} = invoice;


  /* ===================================================
     Client Data

     New Invoice saves:

     client: {
       id,
       name,
       abn,
       contact,
       email,
       phone,
       address
     }
  =================================================== */

  const companyName =
    client?.name ||
    invoice?.clientCompany ||
    clientName ||
    "";

  const clientABN =
    client?.abn ||
    invoice?.clientABN ||
    "";

  const clientEmail =
    client?.email ||
    invoice?.clientEmail ||
    "";

  const clientContact =
    client?.contact ||
    invoice?.clientContact ||
    "";

  const clientPhone =
    client?.phone ||
    invoice?.clientPhone ||
    "";

  const clientAddress =
    client?.address ||
    invoice?.clientAddress ||
    "";


  /* ===================================================
     Items
  =================================================== */

  const safeItems =
    Array.isArray(items)
      ? items
      : [];


  /* ===================================================
     Totals
  =================================================== */

  const subtotal =
    safeItems.reduce(
      (sum, item) => {
        const qty =
          Number(item?.qty || 0);

        const unitPrice =
          Number(
            item?.unitPrice || 0
          );

        return (
          sum +
          qty * unitPrice
        );
      },
      0
    );

  const gst =
    subtotal * 0.1;

  const total =
    subtotal + gst;


  /* ===================================================
     Render
  =================================================== */

  return (
    <Document>

      <Page
        size="A4"
        style={styles.page}
      >

        {/* =================================================
            Header
        ================================================= */}

        <View style={styles.header}>

          {/* Company */}

          <View style={styles.company}>

            <Image
              src="/logo.png"
              style={styles.logo}
            />

            <Text
              style={styles.companyName}
            >
              YJ Building Evolution Pty Ltd
            </Text>

            <Text
              style={styles.companyText}
            >
              ABN: 91 644 460 917
            </Text>

            <Text
              style={styles.companyText}
            >
              ACN: 644 460 917
            </Text>

            <Text
              style={styles.companyText}
            >
              29 Brandl St, Eight Mile Plains QLD 4113
            </Text>

            <Text
              style={styles.companyText}
            >
              Email: leo.l@yjliningscreation.com.au
            </Text>

             <Text
              style={styles.companyText}
            >
              Phone: 0425 460 711
            </Text>
          </View>


          {/* Invoice Information */}

          <View
            style={styles.invoiceBox}
          >

            <Text
              style={styles.invoiceTitle}
            >
              INVOICE
            </Text>

            <View
              style={styles.invoiceInfo}
            >

              <Text
                style={styles.invoiceLabel}
              >
                Invoice No:
              </Text>

              <Text
                style={styles.invoiceValue}
              >
                {invoiceNumber || "-"}
              </Text>

            </View>

            <View
              style={styles.invoiceInfo}
            >

              <Text
                style={styles.invoiceLabel}
              >
                Invoice Date:
              </Text>

              <Text
                style={styles.invoiceValue}
              >
                {formatDate(
                  invoiceDate
                ) || "-"}
              </Text>

            </View>

            <View
              style={styles.invoiceInfo}
            >

              <Text
                style={styles.invoiceLabel}
              >
                Due Date:
              </Text>

              <Text
                style={styles.invoiceValue}
              >
                {formatDate(
                  dueDate
                ) || "-"}
              </Text>

            </View>

            <View style={styles.invoiceInfo}>
              <Text style={styles.invoiceLabel}>
                Reference:
              </Text>

              <Text style={styles.invoiceValue}>
                {projectName || "-"}
              </Text>
            </View>

            <View
              style={styles.invoiceInfo}
            >

              <Text
                style={styles.invoiceLabel}
              >
                Due Amount:
              </Text>

              <Text
                style={styles.invoiceValue}
              >
                {formatCurrency(total)}
              </Text>

            </View>
            

          </View>

        </View>


        {/* =================================================
            Bill To
        ================================================= */}

        <View style={styles.section}>

          <Text
            style={styles.sectionTitle}
          >
            Bill To
          </Text>

          <View
            style={styles.billToBox}
          >

            {/* Company Name */}

            <Text
              style={styles.billToName}
            >
              {companyName || "-"}
            </Text>


            {/* ABN */}

            {clientABN && (
              <Text
                style={styles.billToText}
              >
                ABN: {clientABN}
              </Text>
            )}


            {/* Email */}

            {clientEmail && (
              <Text
                style={styles.billToText}
              >
                Email: {clientEmail}
              </Text>
            )}


            {/* Address */}

            {clientAddress && (
              <Text
                style={styles.billToText}
              >
                Address: {clientAddress}
              </Text>
            )}


            {/* Contact */}

            {clientContact && (
              <Text
                style={styles.billToText}
              >
                Contact: {clientContact}
              </Text>
            )}


            {/* Phone */}

            {clientPhone && (
              <Text
                style={styles.billToText}
              >
                Phone: {clientPhone}
              </Text>
            )}

          </View>

        </View>


        {/* =================================================
            Invoice Items
        ================================================= */}

        <View style={styles.section}>

          <Text
            style={styles.sectionTitle}
          >
            Invoice Details
          </Text>


          <View style={styles.table}>

            {/* Table Header */}

            <View
              style={styles.tableHeader}
            >

              <Text
                style={[
                  styles.colDescription,
                  styles.headerText,
                ]}
              >
                Description
              </Text>

              <Text
                style={[
                  styles.colQty,
                  styles.headerText,
                ]}
              >
                Qty
              </Text>

              <Text
                style={[
                  styles.colPrice,
                  styles.headerText,
                ]}
              >
                Unit Price
              </Text>

              <Text
                style={[
                  styles.colAmount,
                  styles.headerText,
                ]}
              >
                Amount
              </Text>

            </View>


            {/* Table Rows */}

            {safeItems.length > 0 ? (

              safeItems.map(
                (item, index) => {

                  const qty =
                    Number(
                      item?.qty || 0
                    );

                  const unitPrice =
                    Number(
                      item?.unitPrice ||
                        0
                    );

                  const amount =
                    qty *
                    unitPrice;

                  return (
                    <View
                      style={
                        styles.tableRow
                      }
                      key={
                        item?.id ||
                        index
                      }
                    >

                      <Text
                        style={
                          styles.colDescription
                        }
                      >
                        {item?.description ||
                          ""}
                      </Text>

                      <Text
                        style={
                          styles.colQty
                        }
                      >
                        {qty}
                      </Text>

                      <Text
                        style={
                          styles.colPrice
                        }
                      >
                        {formatCurrency(
                          unitPrice
                        )}
                      </Text>

                      <Text
                        style={
                          styles.colAmount
                        }
                      >
                        {formatCurrency(
                          amount
                        )}
                      </Text>

                    </View>
                  );
                }
              )

            ) : (

              <View
                style={styles.tableRow}
              >

                <Text
                  style={
                    styles.colDescription
                  }
                >
                  No invoice items
                </Text>

                <Text
                  style={
                    styles.colQty
                  }
                >
                  -
                </Text>

                <Text
                  style={
                    styles.colPrice
                  }
                >
                  -
                </Text>

                <Text
                  style={
                    styles.colAmount
                  }
                >
                  -
                </Text>

              </View>

            )}

          </View>

        </View>


        {/* =================================================
            Totals
        ================================================= */}

        <View
          style={styles.totalsContainer}
        >

          <View
            style={styles.totalRow}
          >

            <Text
              style={styles.totalLabel}
            >
              Subtotal
            </Text>

            <Text>
              {formatCurrency(
                subtotal
              )}
            </Text>

          </View>


          <View
            style={styles.totalRow}
          >

            <Text
              style={styles.totalLabel}
            >
              GST (10%)
            </Text>

            <Text>
              {formatCurrency(
                gst
              )}
            </Text>

          </View>


          <View
            style={styles.grandTotal}
          >

            <Text
              style={styles.grandTotalText}
            >
              TOTAL
            </Text>

            <Text
              style={styles.grandTotalText}
            >
              {formatCurrency(
                total
              )}
            </Text>

          </View>

        </View>


        {/* =================================================
            Payment Details
        ================================================= */}

        <View
          style={styles.paymentBox}
        >

          <Text
            style={styles.paymentTitle}
          >
            Payment Details
          </Text>

          <Text style={styles.paymentTitle}>
            Account Name: YJ BUILDING EVOLUTION
          </Text>

          <Text style={styles.paymentTitle}>
            BSB: 034115
          </Text>

          <Text style={styles.paymentTitle}>
            Account Number: 706930
          </Text>


          <Text
            style={styles.paymentText}
          >
            {paymentTerms}
          </Text>

          <Text
            style={styles.paymentText}
          >
            Please quote invoice number{" "}
            {invoiceNumber || ""}{" "}
            when making payment.
          </Text>

        </View>


        {/* =================================================
            Notes
        ================================================= */}

        {notes && (
          <View
            style={styles.notes}
          >

            <Text
              style={styles.sectionTitle}
            >
              Notes
            </Text>

            <Text
              style={styles.paymentText}
            >
              {notes}
            </Text>

          </View>
        )}


        {/* =================================================
            Footer
        ================================================= */}

        <Text
          style={styles.footer}
        >
          YJ Building Evolution Pty Ltd
        </Text>

      </Page>

    </Document>
  );
}

