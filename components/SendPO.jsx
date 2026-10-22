
"use client";

import { useMemo, useState } from "react";
import PurchaseOrderPDF from "./PurchaseOrderPDF";

// ============================================================
// 1. 默认邮件设置
// ============================================================

const DEFAULT_FROM = "account@yjliningscreation.com.au";

const DEFAULT_CC_EMAILS = [
  "leo.l@yjliningscreation.com.au",
  "mads.x@yjliningscreation.com.au",
  "eason.z@yjliningscreation.com.au",
  "nathan.l@yjliningscreation.com.au",
  "joshua.j@yjliningscreation.com.au",
  "kevin.k@yjliningscreation.com.au",
  "jordan.s@yjliningscreation.com.au"
];

// ============================================================
// 2. 邮箱校验
// ============================================================

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function parseEmails(value) {
  return value
    .split(/[;,]/)
    .map((email) => email.trim())
    .filter(Boolean);
}

// ============================================================
// 3. SendPO 组件
// ============================================================

export default function SendPO({
  purchaseOrder,
  supplier,
  form,
  poDataForPDF,
}) {
  // 邮件设置默认收起
  const [settingsExpanded, setSettingsExpanded] = useState(false);

  // 邮件基本信息
  const [fromEmail, setFromEmail] = useState(DEFAULT_FROM);
    const [toEmail, setToEmail] = useState(
    form?.supplier?.email ||
        supplier?.email ||
        purchaseOrder?.supplierEmail ||
        ""
    );
  const [subject, setSubject] = useState(
    `Purchase Order ${purchaseOrder?.poNumber || purchaseOrder?.number || ""}`
  );
  const [message, setMessage] = useState(
    "Hi Team,\n\nPlease find attached our Purchase Order.\n\nKind regards,\nYJ Linings"
  );

  // 默认 CC：每个邮箱独立控制是否发送
  const [defaultCC, setDefaultCC] = useState(
    DEFAULT_CC_EMAILS.map((email) => ({
      email,
      checked: true,
    }))
  );

  // 用户添加的自定义 CC
  const [customCC, setCustomCC] = useState([]);

  // 发送状态
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState({
    type: "",
    text: "",
  });

  // ==========================================================
  // 4. PO 编号及 PDF 文件名
  // ==========================================================

  const poNumber =
    purchaseOrder?.poNumber ||
    purchaseOrder?.number ||
    purchaseOrder?.id ||
    "PurchaseOrder";

  const filename = useMemo(
    () => `PO-${poNumber}.pdf`,
    [poNumber]
  );

  // ==========================================================
  // 5. 更新默认 CC 勾选状态
  // ==========================================================

  function toggleDefaultCC(index) {
    setDefaultCC((previous) =>
      previous.map((item, i) =>
        i === index
          ? { ...item, checked: !item.checked }
          : item
      )
    );
  }

  // ==========================================================
  // 6. 添加及修改自定义 CC
  // ==========================================================

  function addCustomCC() {
    setCustomCC((previous) => [
      ...previous,
      {
        id: `${Date.now()}-${previous.length}`,
        email: "",
        checked: true,
      },
    ]);
  }

  function updateCustomCC(id, changes) {
    setCustomCC((previous) =>
      previous.map((item) =>
        item.id === id ? { ...item, ...changes } : item
      )
    );
  }

  function removeCustomCC(id) {
    setCustomCC((previous) =>
      previous.filter((item) => item.id !== id)
    );
  }

  // ==========================================================
  // 7. 生成最终 CC 邮箱列表
  //    必须自动抄送当前 From 邮箱
  // ==========================================================

  function getSelectedCCEmails() {
    const selectedDefault = defaultCC
      .filter((item) => item.checked)
      .flatMap((item) => parseEmails(item.email));

    const selectedCustom = customCC
      .filter((item) => item.checked && item.email.trim())
      .flatMap((item) => parseEmails(item.email));

    // 当前 From 邮箱必须加入 CC
    const requiredFromCC = parseEmails(fromEmail);

    // 合并所有 CC，忽略大小写去重
    const uniqueEmails = new Map();

    [...selectedDefault, ...selectedCustom, ...requiredFromCC]
      .forEach((email) => {
        const cleanEmail = email.trim();

        if (cleanEmail) {
          uniqueEmails.set(cleanEmail.toLowerCase(), cleanEmail);
        }
      });

    return [...uniqueEmails.values()];
  }

  // ==========================================================
  // 8. 点击 Send PO：先展开设置，再发送
  // ==========================================================

  async function handleSendPO() {
    setStatus({ type: "", text: "" });

    // 第一次点击只展开设置，让用户确认邮件内容
    if (!settingsExpanded) {
      setSettingsExpanded(true);
      return;
    }

    const cleanFrom = fromEmail.trim();
    const recipients = parseEmails(toEmail);
    const ccEmails = getSelectedCCEmails();

    if (!isValidEmail(cleanFrom)) {
      setStatus({
        type: "error",
        text: "Please enter a valid From email address.",
      });
      return;
    }

    if (recipients.length === 0) {
      setStatus({
        type: "error",
        text: "Please enter at least one To email address.",
      });
      return;
    }

    if (recipients.some((email) => !isValidEmail(email))) {
      setStatus({
        type: "error",
        text: "One or more To email addresses are invalid.",
      });
      return;
    }

    if (ccEmails.some((email) => !isValidEmail(email))) {
      setStatus({
        type: "error",
        text: "One or more selected CC email addresses are invalid.",
      });
      return;
    }

    if (ccEmails.some((email) => recipients.includes(email))) {
      setStatus({
        type: "error",
        text: "The same email cannot be both To and CC.",
      });
      return;
    }

    if (!poDataForPDF) {
      setStatus({
        type: "error",
        text: "Purchase Order PDF data is missing.",
      });
      return;
    }

    try {
      setSending(true);

      // 生成 PO PDF 并转换成 Base64
      const { pdf } = await import("@react-pdf/renderer");

      const blob = await pdf(
        <PurchaseOrderPDF data={poDataForPDF} />
      ).toBlob();

      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      let binary = "";
      const chunkSize = 0x8000;

      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(
          ...bytes.subarray(i, i + chunkSize)
        );
      }

      const pdfBase64 = btoa(binary);

      // 发送邮件
      const response = await fetch("/api/send-po", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: cleanFrom,
          to: recipients,
          cc: ccEmails,
          subject: subject.trim(),
          message,
          poNumber: String(poNumber),
          filename,
          pdfBase64,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Failed to send Purchase Order."
        );
      }

      setStatus({
        type: "success",
        text: "Purchase Order email sent successfully.",
      });
    } catch (error) {
      console.error("Send PO error:", error);

      setStatus({
        type: "error",
        text: error?.message || "Failed to send Purchase Order.",
      });
    } finally {
      setSending(false);
    }
  }

  // ==========================================================
  // 9. 页面 UI
  // ==========================================================

  return (
    <section className="w-full space-y-4">
      {/* Send PO 主按钮 */}
      <button
        type="button"
        onClick={() => {
          if (!settingsExpanded) {
            setSettingsExpanded(true);
          } else {
            handleSendPO();
          }
        }}
        disabled={sending}
        className="cursor-pointer rounded-md bg-indigo-800 px-5 py-2.5 font-medium text-white hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {sending ? "Sending..." : "Send PO"}
      </button>

      {/* 邮件设置：默认收起，点击 Send PO 后展开 */}
      {settingsExpanded && (
        <div className="space-y-4 rounded-lg border border-gray-300 p-4">
          <h3 className="text-lg font-semibold">Email Settings</h3>

          {/* From */}
          <div className="space-y-1">
            <label
              htmlFor="po-from-email"
              className="block text-sm font-medium"
            >
              From
            </label>

            <input
              id="po-from-email"
              type="email"
              value={fromEmail}
              onChange={(event) => setFromEmail(event.target.value)}
              placeholder="account@yjliningscreation.com.au"
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />

            <p className="text-xs text-gray-500">
              The From email address will automatically be included in CC.
            </p>
          </div>

          {/* To */}
          <div className="space-y-1">
            <label
              htmlFor="po-to-email"
              className="block text-sm font-medium"
            >
              To
            </label>

            <input
              id="po-to-email"
              type="text"
              value={toEmail}
              onChange={(event) => setToEmail(event.target.value)}
              placeholder="supplier@example.com"
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />

            <p className="text-xs text-gray-500">
              You can enter multiple email addresses separated by commas.
            </p>
          </div>

          {/* 默认 CC */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              CC — Select/Add recipients
            </label>

            <div className="space-y-2">
              {defaultCC.map((item, index) => (
                <label
                  key={item.email}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => toggleDefaultCC(index)}
                    className="h-4 w-4"
                  />

                  <span>{item.email}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 自定义 CC */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium">
                Additional CC
              </label>

              <button
                type="button"
                onClick={addCustomCC}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100"
              >
                + Add CC
              </button>
            </div>

            {customCC.length === 0 && (
              <p className="text-sm text-gray-500">
                No additional CC recipients.
              </p>
            )}

            {customCC.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center gap-2"
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(event) =>
                    updateCustomCC(item.id, {
                      checked: event.target.checked,
                    })
                  }
                  aria-label={`Include additional CC ${index + 1}`}
                  className="h-4 w-4 shrink-0"
                />

                <input
                  type="text"
                  value={item.email}
                  onChange={(event) =>
                    updateCustomCC(item.id, {
                      email: event.target.value,
                    })
                  }
                  placeholder="Enter CC email"
                  aria-label={`Additional CC email ${index + 1}`}
                  className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2"
                />

                <button
                  type="button"
                  onClick={() => removeCustomCC(item.id)}
                  aria-label={`Remove additional CC ${index + 1}`}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* Subject */}
          <div className="space-y-1">
            <label
              htmlFor="po-subject"
              className="block text-sm font-medium"
            >
              Subject
            </label>

            <input
              id="po-subject"
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          {/* Email message */}
          <div className="space-y-1">
            <label
              htmlFor="po-message"
              className="block text-sm font-medium"
            >
              Message
            </label>

            <textarea
              id="po-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          {/* 邮件状态 */}
          {status.text && (
            <p
              role="status"
              className={`text-sm ${
                status.type === "success"
                  ? "text-green-700"
                  : "text-red-600"
              }`}
            >
              {status.text}
            </p>
          )}

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSendPO}
              disabled={sending}
              className="cursor-pointer rounded-md bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send PO Email"}
            </button>

            <button
              type="button"
              onClick={() => setSettingsExpanded(false)}
              disabled={sending}
              className="rounded-md border border-gray-300 px-5 py-2.5 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Hide Section
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
