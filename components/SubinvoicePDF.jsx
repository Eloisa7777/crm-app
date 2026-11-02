
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

// ============================================================
// 1. PDF Styles
// ============================================================

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#222",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  company: {
    width: "55%",
  },
  companyName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
  },
  companyText: {
    fontSize: 8,
    lineHeight: 1.4,
    marginBottom: 2,
  },
  invoiceBox: {
    width: "40%",
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
    width: 110,
    textAlign: "right",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 6,
    textTransform: "uppercase",
  },
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
  scopeBox: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    marginTop: 8,
  },
  scopeText: {
    fontSize: 8,
    lineHeight: 1.5,
    marginBottom: 3,
  },
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
    width: "42%",
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
  colTax: {
    width: "10%",
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
    marginBottom: 3,
  },
  notes: {
    marginTop: 20,
  },
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

// ============================================================
// 2. Helpers
// ============================================================

function formatCurrency(value) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "";

  try {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("en-AU");
  } catch {
    return String(value);
  }
}

// ============================================================
// 3. Sub-Invoice PDF
// ============================================================

export default function SubinvoicePDF({ invoice = {} }) {
  const {
    invoiceNumber = "",
    invoiceDate = "",
    dueDate = "",
    projectName = "",
    siteAddress = "",
    scopeOfWork = "",
    items = [],
    notes = "",
    supplier = {},
    paymentTerms = "Payment due by the due date shown above.",
  } = invoice;

  // Send From information
  const supplierName = supplier?.name || "";
  const supplierABN = supplier?.abn || "";
  const supplierAddress = supplier?.address || "";
  const supplierContact = supplier?.contact || "";
  const supplierEmail = supplier?.email || "";
  const supplierPhone = supplier?.phone || "";

  // Bank details from Supplier/Subcontractor record or edited invoice

  const accountName =supplier?.bankName || "";
  const bsb = supplier?.BSB || "";
  const accountNumber = supplier?.bankAccount || "";

  const safeItems = Array.isArray(items) ? items : [];

  // Keep the existing calculation logic.
  const subtotal = safeItems.reduce((sum, item) => {
    const qty = Number(item?.qty || 0);
    const unitPrice = Number(item?.unitPrice || 0);
    const tax = Number(item?.tax || 0);

    return sum + qty * unitPrice * (1 + tax / 100);
  }, 0);

  const gst = subtotal * 0.1;
  const total = subtotal + gst;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header - Send From */}
        <View style={styles.header}>
          <View style={styles.company}>
            <Text style={styles.companyName}>{supplierName}</Text>

            <Text style={styles.companyText}>ABN: {supplierABN}</Text>
            <Text style={styles.companyText}>Contact: {supplierContact}</Text>
            <Text style={styles.companyText}>Address: {supplierAddress}</Text>
            <Text style={styles.companyText}>Email: {supplierEmail}</Text>
            <Text style={styles.companyText}>Phone: {supplierPhone}</Text>
          </View>

          <View style={styles.invoiceBox}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>

            <View style={styles.invoiceInfo}>
              <Text style={styles.invoiceLabel}>Invoice No:</Text>
              <Text style={styles.invoiceValue}>{invoiceNumber}</Text>
            </View>

            <View style={styles.invoiceInfo}>
              <Text style={styles.invoiceLabel}>Invoice Date:</Text>
              <Text style={styles.invoiceValue}>{formatDate(invoiceDate)}</Text>
            </View>

            <View style={styles.invoiceInfo}>
              <Text style={styles.invoiceLabel}>Due Date:</Text>
              <Text style={styles.invoiceValue}>{formatDate(dueDate)}</Text>
            </View>

            <View style={styles.invoiceInfo}>
              <Text style={styles.invoiceLabel}>Reference:</Text>
              <Text style={styles.invoiceValue}>{projectName}</Text>
            </View>

            <View style={styles.invoiceInfo}>
              <Text style={styles.invoiceLabel}>Due Amount:</Text>
              <Text style={styles.invoiceValue}>{formatCurrency(total)}</Text>
            </View>
          </View>
        </View>

        {/* Bill To - Fixed YJ Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill To</Text>

          <View style={styles.billToBox}>
            <Text style={styles.billToName}>YJ BUILDING EVOLUTION</Text>
            <Text style={styles.billToText}>ABN: 91 644 460 917</Text>
            <Text style={styles.billToText}>
              Email: account@yjliningscreation.com.au
            </Text>
            <Text style={styles.billToText}>
              Address: 29 Brandl St, Eight Mile Plains QLD 4113
            </Text>
          </View>
        </View>

        {/* Project Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Information</Text>

          <View style={styles.scopeBox}>
            <Text style={styles.scopeText}>Project: {projectName}</Text>
            <Text style={styles.scopeText}>Site Address: {siteAddress}</Text>
            <Text style={styles.scopeText}>Scope of Work: {scopeOfWork}</Text>
          </View>
        </View>

        {/* Invoice Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Details</Text>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.colDescription, styles.headerText]}>
                Description
              </Text>
              <Text style={[styles.colQty, styles.headerText]}>Qty</Text>
              <Text style={[styles.colPrice, styles.headerText]}>
                Unit Price
              </Text>
              <Text style={[styles.colTax, styles.headerText]}>Tax %</Text>
              <Text style={[styles.colAmount, styles.headerText]}>Amount</Text>
            </View>

            {safeItems.length > 0 ? (
              safeItems.map((item, index) => {
                const qty = Number(item?.qty || 0);
                const unitPrice = Number(item?.unitPrice || 0);
                const tax = Number(item?.tax || 0);
                const amount = qty * unitPrice * (1 + tax / 100);

                return (
                  <View style={styles.tableRow} key={item?.id || index}>
                    <Text style={styles.colDescription}>
                      {item?.description || ""}
                    </Text>
                    <Text style={styles.colQty}>{qty}</Text>
                    <Text style={styles.colPrice}>
                      {formatCurrency(unitPrice)}
                    </Text>
                    <Text style={styles.colTax}>{tax}%</Text>
                    <Text style={styles.colAmount}>
                      {formatCurrency(amount)}
                    </Text>
                  </View>
                );
              })
            ) : (
              <View style={styles.tableRow}>
                <Text style={styles.colDescription}>No invoice items</Text>
                <Text style={styles.colQty}>-</Text>
                <Text style={styles.colPrice}>-</Text>
                <Text style={styles.colTax}>-</Text>
                <Text style={styles.colAmount}>-</Text>
              </View>
            )}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text>{formatCurrency(subtotal)}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>GST (10%)</Text>
            <Text>{formatCurrency(gst)}</Text>
          </View>

          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalText}>TOTAL</Text>
            <Text style={styles.grandTotalText}>{formatCurrency(total)}</Text>
          </View>
        </View>

        {/* Payment Details */}
        <View style={styles.paymentBox}>
          <Text style={styles.paymentTitle}>Payment Details</Text>
          <Text style={styles.paymentText}>Account Name: {accountName}</Text>
          <Text style={styles.paymentText}>BSB: {bsb}</Text>
          <Text style={styles.paymentText}>Account Number: {accountNumber}</Text>
          <Text style={styles.paymentText}>{paymentTerms}</Text>
          <Text style={styles.paymentText}>
            Please quote invoice number {invoiceNumber} when making payment.
          </Text>
        </View>

        {/* Notes */}
        {notes ? (
          <View style={styles.notes}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.paymentText}>{notes}</Text>
          </View>
        ) : null}

      </Page>
    </Document>
  );
}
