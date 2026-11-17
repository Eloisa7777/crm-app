
"use client";

import { useRef, useState } from "react";

export default function AIInvoiceUpload({
  onInvoiceRecognized,
}) {
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0];

    setError("");
    setSuccess("");

    if (!selectedFile) return;

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Please upload a PDF, JPG, PNG or WEBP file.");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > 15 * 1024 * 1024) {
      setError("File size must be less than 15MB.");
      event.target.value = "";
      return;
    }

    setFile(selectedFile);
  }

  async function handleRecognize() {
    if (!file) {
      setError("Please select an invoice first.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "/api/invoice-recognition",
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Invoice recognition failed."
        );
      }

      if (!result.invoice) {
        throw new Error("No invoice data was returned.");
      }

      // Send the recognised data to NewBillPage
    const callbackResult = await onInvoiceRecognized(
    result.invoice
    );

    setSuccess(
    callbackResult?.warning ||
    "Invoice recognised. Please review the filled fields."
    );

    } catch (err) {
      console.error("Invoice recognition error:", err);
      setError(err.message || "Recognition failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-6 rounded-lg border border-blue-200 bg-blue-50/50 p-5">

      <div className="mb-3 flex items-center gap-2">
        <span className="text-xl">✨</span>

        <h2 className="text-lg font-semibold">
          AI Invoice Recognition
        </h2>

        <span className="ml-auto rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
          Optional
        </span>
      </div>

      <p className="mb-4 text-sm text-gray-600">
        Upload a supplier invoice and AI will automatically
        fill in the bill details.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex flex-wrap items-center gap-3">

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="rounded border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
        >
          Choose Invoice
        </button>

        {file && (
          <span className="max-w-full truncate text-sm text-gray-700">
            {file.name}
          </span>
        )}

        <button
          type="button"
          onClick={handleRecognize}
          disabled={!file || loading}
          className="rounded bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Recognising..." : "✨ Recognise & Fill"}
        </button>

      </div>

      <p className="mt-3 text-xs text-gray-500">
        Supported formats: PDF, JPG, PNG and WEBP. Maximum 15MB.
      </p>

      {error && (
        <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {success && (
        <p className="mt-3 rounded bg-green-50 p-2 text-sm text-green-700">
          {success}
        </p>
      )}

    </section>
  );
}
