
export const runtime = "nodejs";

const MODEL =
  process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

const MAX_FILE_SIZE = 15 * 1024 * 1024;

const PROMPT = `
You are an invoice data extraction assistant.

Read the uploaded supplier invoice carefully.

Extract ONLY the following information.

Return valid JSON only. Do not include markdown or explanations.

JSON structure:

{
  "billNumber": "string or null",
  "billDate": "YYYY-MM-DD or null",
  "dueDate": "YYYY-MM-DD or null",

  "supplierName": "string or null",
  "supplierABN": "string or null",

  "items": [
    {
      "description": "string",
      "quantity": 1,
      "rate": 0,
      "gstRate": 10
    }
  ],

  "gstRate": 10,
  "subtotal": 0,
  "gstAmount": 0,
  "total": 0,
  "amountPaid": 0,
  "amountDue": 0,
  "notes": "string or null"
}

Important rules:

1. Do NOT extract or match Project.
2. Do NOT extract or match Purchase Order.
3. billNumber must be the invoice number, not ABN.
4. Dates must use YYYY-MM-DD format.
5. rate means the unit price excluding GST, where the invoice
   clearly provides an exclusive GST price.
6. Extract every invoice line item separately.
7. Do not invent missing information.
8. Use null for missing values.
9. GST rate should be a number, such as 10.
10. subtotal, gstAmount, total, amountPaid and amountDue
    must be numeric values.
11. Distinguish Total from Amount Due.
12. If the invoice has already been paid, still return the
    original invoice total as total.
13. Do not use Amount Due as the invoice total.
14. Keep the original meaning of each description.
15. If there are multiple tax rates, use the applicable
    GST rate for each line item.
`;

function getMimeType(file) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  const mimeTypes = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };

  return mimeTypes[extension] || file.type;
}

function cleanJson(text) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function normaliseInvoice(data) {
  const items = Array.isArray(data.items)
    ? data.items.map((item) => ({
        description: String(item.description || "").trim(),
        quantity: Number(item.quantity) || 1,
        rate: Number(item.rate) || 0,
        gstRate: Number(item.gstRate) || 0,
      })).filter((item) => item.description)
    : [];

  return {
    billNumber: data.billNumber || "",
    billDate: data.billDate || "",
    dueDate: data.dueDate || "",

    supplierName: data.supplierName || "",
    supplierABN: data.supplierABN || "",

    items,

    gstRate: Number(data.gstRate) || 0,
    subtotal: Number(data.subtotal) || 0,
    gstAmount: Number(data.gstAmount) || 0,
    total: Number(data.total) || 0,
    amountPaid: Number(data.amountPaid) || 0,
    amountDue: Number(data.amountDue) || 0,

    notes: data.notes || "",
  };
}

export async function POST(request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "GEMINI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file.arrayBuffer !== "function") {
      return Response.json(
        { error: "Please upload an invoice file." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: "File size must be less than 15MB." },
        { status: 400 }
      );
    }

    const mimeType = getMimeType(file);

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(mimeType)) {
      return Response.json(
        { error: "Unsupported file format." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString("base64");

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: PROMPT,
                },
                {
                  inlineData: {
                    mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        }),
      }
    );

    const geminiData = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error("Gemini API error:", geminiData);

      return Response.json(
        {
          error:
            geminiData.error?.message ||
            "Gemini API request failed.",
        },
        { status: geminiResponse.status }
      );
    }

    const responseText =
      geminiData.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim();

    if (!responseText) {
      return Response.json(
        { error: "Gemini returned an empty response." },
        { status: 502 }
      );
    }

    let parsedData;

    try {
      parsedData = JSON.parse(cleanJson(responseText));
    } catch (err) {
      console.error("Invalid Gemini JSON:", responseText);

      return Response.json(
        { error: "AI returned invalid invoice data. Please try again." },
        { status: 502 }
      );
    }

    return Response.json({
      success: true,
      invoice: normaliseInvoice(parsedData),
    });

  } catch (error) {
    console.error("Invoice recognition API error:", error);

    return Response.json(
      {
        error: error.message || "Invoice recognition failed.",
      },
      { status: 500 }
    );
  }
}
