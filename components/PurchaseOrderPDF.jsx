import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#111827",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  companyLeft: {
    width: "55%",
  },

  companyRight: {
    width: "40%",
    textAlign: "right",
  },

  companyName: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },

  logo: {
    width: 90,
    height: 45,
    objectFit: "contain",
    marginTop: 6,
  },

  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
    marginVertical: 10,
  },

  title: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },

  topInfo: {
    flexDirection: "row",
    marginBottom: 10,
  },

  supplierSection: {
    width: "65%",
    paddingRight: 15,
  },

  poSection: {
    width: "35%",
  },

  sectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#374151",
  },

  infoRow: {
    flexDirection: "row",
    marginBottom: 3,
  },

  label: {
    width: 75,
    fontWeight: "bold",
  },

  value: {
    flex: 1,
  },

  siteAddress: {
    marginBottom: 12,
  },

  table: {
    width: "100%",
    marginTop: 5,
    marginBottom: 15,
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#D1D5DB",
    paddingVertical: 6,
  },

  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 6,
  },

  description: {
    width: "55%",
    paddingRight: 5,
  },

  qty: {
    width: "12%",
    textAlign: "center",
  },

  unitPrice: {
    width: "15%",
    textAlign: "right",
  },

  itemTotal: {
    width: "18%",
    textAlign: "right",
  },

  scopeBox: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    minHeight: 100,
    padding: 8,
    marginTop: 5,
    marginBottom: 15,
  },

  scopeLine: {
    marginBottom: 3,
    lineHeight: 1.3,
  },

  totals: {
    alignItems: "flex-end",
    marginBottom: 15,
  },

  totalRow: {
    flexDirection: "row",
    width: 180,
    justifyContent: "space-between",
    marginBottom: 4,
  },

  totalLabel: {
    fontWeight: "bold",
  },

  grandTotal: {
    fontSize: 11,
    fontWeight: "bold",
    borderTopWidth: 1,
    borderTopColor: "#111827",
    paddingTop: 5,
    marginTop: 3,
  },

  invoiceNote: {
    backgroundColor: "#F9FAFB",
    padding: 8,
    marginBottom: 12,
    lineHeight: 1.4,
  },

  contactSection: {
    marginBottom: 12,
  },

  terms: {
    marginTop: 5,
  },

  term: {
    marginBottom: 4,
    lineHeight: 1.4,
  },

  bold: {
    fontWeight: "bold",
  },
});

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-AU");
}

export default function PurchaseOrderPDF({ data }) {
  const subtotal = data.items.reduce(
    (sum, item) =>
      sum +
      Number(item.qty || 0) * Number(item.unitPrice || 0),
    0
  );

  const gst = subtotal * 0.1;
  const total = subtotal + gst;

  const scopeLines = (data.scopeOfWork || "")
    .split("\n")
    .slice(0, 20);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.companyLeft}>
            <Text style={styles.companyName}>
              YJ Building Evolution Pty Ltd
            </Text>

            <Text>ABN: 91 644 460 917 </Text>
            <Text>ACN: 644 460 917</Text>

            <Image
              src="/logo.png"
              style={styles.logo}
            />
          </View>

          <View style={styles.companyRight}>
            <Text>29 Brandl St, Eight Mile Plains QLD 4113</Text>
            <Text>leo.l@yjliningscreation.com.au</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* TITLE */}
        <Text style={styles.title}>
          Purchase Order
        </Text>

        {/* SUPPLIER + PO INFO */}
        <View style={styles.topInfo}>
          <View style={styles.supplierSection}>
            <Text style={styles.sectionTitle}>
              SUPPLIER
            </Text>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Supplier:</Text>
              <Text style={styles.value}>
                {data.supplier?.name || ""}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>ABN:</Text>
              <Text style={styles.value}>
                {data.supplier?.abn || ""}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Attention:</Text>
              <Text style={styles.value}>
                {data.supplier?.contact || ""}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>
                {data.supplier?.email || ""}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Phone:</Text>
              <Text style={styles.value}>
                {data.supplier?.phone || ""}
              </Text>
            </View>
          </View>

          <View style={styles.poSection}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>No:</Text>
              <Text style={styles.value}>
                {data.poNumber}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Date:</Text>
              <Text style={styles.value}>
                {formatDate(data.poDate)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Delivery:</Text>
              <Text style={styles.value}>
                {formatDate(data.deliveryDate)}
              </Text>
            </View>
          </View>
        </View>

        {/* SITE ADDRESS */}
        <View style={styles.siteAddress}>
          <Text style={styles.sectionTitle}>
            SITE ADDRESS
          </Text>

          <Text>
            {data.siteAddress || ""}
          </Text>
        </View>

        {/* ITEMS */}
        <Text style={styles.sectionTitle}>
          ORDER DETAILS
        </Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.description}>
              Description
            </Text>

            <Text style={styles.qty}>
              Qty
            </Text>

            <Text style={styles.unitPrice}>
              Unit Price
            </Text>

            <Text style={styles.itemTotal}>
              Total
            </Text>
          </View>

          {data.items.map((item, index) => {
            const itemTotal =
              Number(item.qty || 0) *
              Number(item.unitPrice || 0);

            return (
              <View
                style={styles.tableRow}
                key={index}
              >
                <Text style={styles.description}>
                  {item.description || ""}
                </Text>

                <Text style={styles.qty}>
                  {item.qty || 0}
                </Text>

                <Text style={styles.unitPrice}>
                  {formatMoney(item.unitPrice)}
                </Text>

                <Text style={styles.itemTotal}>
                  {formatMoney(itemTotal)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* SCOPE */}
        <Text style={styles.sectionTitle}>
          SCOPE OF WORK
        </Text>

        <View style={styles.scopeBox}>
          {scopeLines.length > 0 ? (
            scopeLines.map((line, index) => (
              <Text
                key={index}
                style={styles.scopeLine}
              >
                {line || " "}
              </Text>
            ))
          ) : (
            <Text> </Text>
          )}
        </View>

        {/* TOTALS */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{formatMoney(subtotal)}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text>GST 10%</Text>
            <Text>{formatMoney(gst)}</Text>
          </View>

          <View
            style={[
              styles.totalRow,
              styles.grandTotal,
            ]}
          >
            <Text>Total</Text>
            <Text>{formatMoney(total)}</Text>
          </View>
        </View>

        {/* INVOICE NOTE */}
        <View style={styles.invoiceNote}>
          <Text>
            Invoice must be supplied in the name of
            {" "}
            <Text style={styles.bold}>
              YJ Building Evolution Pty Ltd
            </Text>
            , and please quote{" "}
            <Text style={styles.bold}>
              {data.poNumber}
            </Text>
            {" "}each claim.
          </Text>
        </View>

        {/* SITE CONTACT */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>
            YJ SITE CONTACT
          </Text>

          <View style={styles.infoRow}>
            <Text style={styles.label}>
              Project Manager:
            </Text>

            <Text style={styles.value}>
              {data.projectManager || ""}
              {data.projectManagerEmail
                ? ` — ${data.projectManagerEmail}`
                : ""}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>
              Site Manager:
            </Text>

            <Text style={styles.value}>
              {data.siteManager || ""}
              {data.siteManagerEmail
                ? ` — ${data.siteManagerEmail}`
                : ""}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* TERMS */}
        <Text style={styles.sectionTitle}>
          TRADING TERMS
        </Text>

        <View style={styles.terms}>
          <Text style={styles.term}>
            1. On completion of job, payment is due
            15 days from receipt of invoice on the
            15th/30th Day of each month.
          </Text>

          <Text style={styles.term}>
            2. ALL Variations must be approved by
            YJ Building Evolution Pty Ltd before
            commencement.
          </Text>

          <Text style={styles.term}>
            3. Send all invoices directly to:
            {" "}
            account@yjliningscreation.com.au
          </Text>
        </View>
      </Page>
    </Document>
  );
}