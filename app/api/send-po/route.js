
import { Resend } from "resend";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

const ALLOWED_FROM_DOMAIN = "yjliningscreation.com.au";

function isValidEmail(email) {
  return (
    typeof email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  );
}

function normaliseEmails(value) {
  const list = Array.isArray(value) ? value : [value];

  return [
    ...new Set(
      list
        .filter((email) => typeof email === "string")
        .flatMap((email) => email.split(/[;,]/))
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
}

export async function POST(request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return Response.json(
        { error: "RESEND_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const body = await request.json();

    const {
      from,
      to,
      cc = [],
      subject,
      message,
      poNumber,
      filename,
      pdfBase64,
    } = body;

    // 1. Validate sender
    const cleanFrom =
      typeof from === "string" ? from.trim().toLowerCase() : "";

    if (!isValidEmail(cleanFrom)) {
      return Response.json(
        { error: "Invalid From email address." },
        { status: 400 }
      );
    }

    // Only allow senders from your verified company domain
    if (
      cleanFrom.split("@")[1] !== ALLOWED_FROM_DOMAIN
    ) {
      return Response.json(
        {
          error:
            "From must use the verified @yjliningscreation.com.au domain.",
        },
        { status: 400 }
      );
    }

    // 2. Validate recipients
    const toEmails = normaliseEmails(to);
    const ccEmails = normaliseEmails(cc);

    if (toEmails.length === 0) {
      return Response.json(
        { error: "At least one To recipient is required." },
        { status: 400 }
      );
    }

    if (
      [...toEmails, ...ccEmails].some(
        (email) => !isValidEmail(email)
      )
    ) {
      return Response.json(
        { error: "One or more email addresses are invalid." },
        { status: 400 }
      );
    }

    if (ccEmails.some((email) => toEmails.includes(email))) {
      return Response.json(
        { error: "A recipient cannot be both To and CC." },
        { status: 400 }
      );
    }

    // 3. Validate email content
    if (
      typeof subject !== "string" ||
      !subject.trim() ||
      typeof message !== "string"
    ) {
      return Response.json(
        { error: "Subject and message are required." },
        { status: 400 }
      );
    }

    // 4. Validate PDF attachment
    if (
      typeof pdfBase64 !== "string" ||
      !pdfBase64 ||
      pdfBase64.length > 18 * 1024 * 1024
    ) {
      return Response.json(
        { error: "Missing PDF or PDF attachment is too large." },
        { status: 400 }
      );
    }

    const cleanBase64 = pdfBase64.replace(/\s/g, "");

    if (
      !/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64) ||
      cleanBase64.length % 4 !== 0
    ) {
      return Response.json(
        { error: "Invalid PDF Base64 data." },
        { status: 400 }
      );
    }

    const pdfBuffer = Buffer.from(cleanBase64, "base64");

    // Check that the decoded file is a PDF
    if (
      pdfBuffer.length < 5 ||
      pdfBuffer.subarray(0, 5).toString() !== "%PDF-"
    ) {
      return Response.json(
        { error: "The attachment is not a valid PDF." },
        { status: 400 }
      );
    }

    const safePoNumber = String(poNumber || "PurchaseOrder")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 100);

    const safeFilename = `PO-${safePoNumber}.pdf`;

    // 5. Send email through Resend with the PDF attached
    const { data, error } = await resend.emails.send({
      from: cleanFrom,
      to: toEmails,
      ...(ccEmails.length > 0 ? { cc: ccEmails } : {}),
      subject: subject.trim(),
      text: message,
      attachments: [
        {
          filename: safeFilename,
          content: pdfBuffer.toString("base64"),
          contentType: "application/pdf",
        },
      ],
    });

    if (error) {
      console.error("Resend API error:", error);

      return Response.json(
        { error: error.message || "Resend failed to send the email." },
        { status: 502 }
      );
    }

    return Response.json({
      success: true,
      id: data?.id,
      message: "Purchase Order email sent successfully.",
    });
  } catch (error) {
    console.error("Send PO API error:", error);

    return Response.json(
      { error: "Failed to send Purchase Order email." },
      { status: 500 }
    );
  }
}
