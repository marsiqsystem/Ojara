import nodemailer from "nodemailer";
import { isValidEmail } from "./validateEmail";
import { brandMarkHtml, logoAttachments } from "./emailBrand";
import { SITE_URL, SUPPORT_EMAIL, BRAND_NAME } from "./commerce/config";

// Branded, invoice-style confirmation sent from our own Gmail, so the customer
// sees the CORRECT amount and payment status — unlike Wix's automatic email,
// which always says "pay cash to courier" and shows the pre-discount total.
// (Bundle §9, rebranded to OJARA.)
//
// >> See OJARA-HANDOVER §6 / bundle §0.2: turn Wix's automatic order-confirmation
//    email OFF in the dashboard, or customers receive two.

// OJARA "Quiet Luxury" palette.
const NAVY = "#071a47";
const GOLD = "#d6af7a";
const IVORY = "#f7f3eb";
const INK = "#1a2338";
const MUTED = "#6b7280";



type OrderEmailItem = {
  name: string;
  quantity: number;
  sku?: string;
  options?: { name: string; value: string }[];
  unitPrice?: string;
  lineTotal?: string;
  /** Raw Wix media string (wix:image://…) or an https URL. */
  image?: string;
};

export type OrderEmailParams = {
  to: string;
  customerName: string;
  orderNumber: string;
  orderDate?: string;
  paymentMethod: "COD" | "PREPAID";
  /** What the customer ACTUALLY pays (discounted total for prepaid). */
  amount: string;
  razorpayPaymentId?: string;
  items: OrderEmailItem[];
  summary?: {
    subtotal?: string;
    shipping?: string;
    tax?: string;
    discount?: string;
    total?: string;
  };
  address: { line1?: string; city?: string; state?: string; postalCode?: string };
  phone?: string;
};

const escapeHtml = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const fmtINR = (amount: string | number | undefined) =>
  amount == null || amount === "" ? "" : `₹${amount}`;

// Wix media strings look like:
//   wix:image://v1/<mediaId>/<filename>#originWidth=W&originHeight=H
// Email clients can't render those — convert to a scaled static CDN URL.
const toEmailImage = (raw: string | undefined): string | undefined => {
  if (!raw) return undefined;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (!raw.startsWith("wix:image://")) return undefined;
  const m = raw.match(/^wix:image:\/\/v1\/([^/#?]+)(?:\/([^#?]+))?/);
  if (!m) return undefined;
  const [, mediaId, filename = "image.jpg"] = m;
  return `https://static.wixstatic.com/media/${mediaId}/v1/fill/w_160,h_160,al_c,q_85,enc_auto/${filename}`;
};

/** PURE — no I/O. Testable and previewable without sending. */
export const renderOrderEmail = (
  params: OrderEmailParams,
): { subject: string; html: string; text: string } => {
  const isPrepaid = params.paymentMethod === "PREPAID";

  const paymentLine = isPrepaid
    ? `Payment received online — <strong>nothing to pay on delivery.</strong>`
    : `Cash on Delivery — please keep <strong>${fmtINR(
        params.amount,
      )}</strong> ready for the courier.`;

  const paymentLabel = isPrepaid ? "Paid online (Razorpay)" : "Cash on Delivery";

  const addressText = [
    params.address.line1,
    params.address.city,
    params.address.state,
    params.address.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  const itemsRows = params.items
    .map((it) => {
      const img = toEmailImage(it.image);
      const optionsHtml = (it.options || [])
        .filter((o) => o && o.value)
        .map(
          (o) =>
            `<div style="color:${MUTED};font-size:12px;">${escapeHtml(
              o.name,
            )}: ${escapeHtml(o.value)}</div>`,
        )
        .join("");
      const skuHtml = it.sku
        ? `<div style="color:${MUTED};font-size:12px;">SKU: ${escapeHtml(
            it.sku,
          )}</div>`
        : "";
      const unitHtml = it.unitPrice
        ? `<div style="color:${MUTED};font-size:12px;">${fmtINR(
            escapeHtml(it.unitPrice),
          )}</div>`
        : "";
      const thumb = img
        ? `<img src="${escapeHtml(
            img,
          )}" width="64" height="64" alt="" style="display:block;border-radius:8px;border:1px solid #e7ddcb;object-fit:cover;" />`
        : `<div style="width:64px;height:64px;border-radius:8px;background:${IVORY};"></div>`;

      return `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #efe7d6;vertical-align:top;width:64px;">${thumb}</td>
        <td style="padding:14px 12px;border-bottom:1px solid #efe7d6;vertical-align:top;">
          <div style="font-weight:bold;color:${INK};">${escapeHtml(it.name)}</div>
          ${skuHtml}${optionsHtml}${unitHtml}
        </td>
        <td style="padding:14px 0;border-bottom:1px solid #efe7d6;text-align:center;color:${MUTED};white-space:nowrap;">
          Qty: ${escapeHtml(it.quantity)}
        </td>
        <td style="padding:14px 0;border-bottom:1px solid #efe7d6;text-align:right;white-space:nowrap;font-weight:bold;color:${INK};">
          ${it.lineTotal ? fmtINR(escapeHtml(it.lineTotal)) : ""}
        </td>
      </tr>`;
    })
    .join("");

  const s = params.summary || {};
  const summaryRow = (
    label: string,
    value: string | undefined,
    opts: { bold?: boolean; accent?: boolean } = {},
  ) =>
    value == null || value === ""
      ? ""
      : `<tr>
          <td style="padding:6px 0;color:${
            opts.accent ? GOLD : MUTED
          };font-weight:${opts.bold ? "bold" : "normal"};font-size:${
            opts.bold ? "16px" : "14px"
          };">${escapeHtml(label)}</td>
          <td style="padding:6px 0;text-align:right;color:${
            opts.accent ? GOLD : INK
          };font-weight:${opts.bold ? "bold" : "normal"};font-size:${
            opts.bold ? "16px" : "14px"
          };white-space:nowrap;">${fmtINR(escapeHtml(value))}</td>
        </tr>`;

  const summaryRows =
    summaryRow("Subtotal", s.subtotal) +
    summaryRow("Shipping", s.shipping) +
    summaryRow("Tax", s.tax) +
    (s.discount && Number(s.discount) > 0
      ? summaryRow("Discount", `-${s.discount}`, { accent: true })
      : "") +
    summaryRow(isPrepaid ? "Total paid" : "Total to pay", s.total || params.amount, {
      bold: true,
    });

  const subject = `Your ${BRAND_NAME} order ${params.orderNumber} is confirmed`;

  const brandMark = brandMarkHtml();

  const html = `
  <div style="background:${IVORY};padding:24px 0;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:620px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #eadfca;color:${INK};">
      <div style="padding:28px 24px 8px;text-align:center;">
        ${brandMark}
      </div>
      <div style="padding:8px 32px 32px;">
        <h1 style="margin:18px 0 4px;font-size:24px;color:${NAVY};">Thanks for your order, ${escapeHtml(
          params.customerName,
        )}!</h1>
        <p style="margin:0 0 18px;color:${MUTED};">Your intention is on its way. We'll be in touch with updates.</p>

        <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
          <tr>
            <td style="font-weight:bold;">Order ${escapeHtml(params.orderNumber)}</td>
            ${
              params.orderDate
                ? `<td style="text-align:right;color:${MUTED};">Placed on ${escapeHtml(
                    params.orderDate,
                  )}</td>`
                : ""
            }
          </tr>
        </table>

        <div style="background:${
          isPrepaid ? "#eef7ef" : "#fdf6e9"
        };border:1px solid ${
          isPrepaid ? "#cfe8d2" : "#f0e2c0"
        };border-radius:10px;padding:14px 16px;margin-bottom:24px;">
          <p style="margin:0;">${paymentLine}</p>
        </div>

        <h2 style="margin:0 0 6px;font-size:15px;color:${GOLD};text-transform:uppercase;letter-spacing:.5px;">Order Summary</h2>
        <table style="width:100%;border-collapse:collapse;">${itemsRows}</table>
        <table style="width:100%;border-collapse:collapse;margin:14px 0 6px;">${summaryRows}</table>

        <table style="width:100%;border-collapse:collapse;margin-top:26px;">
          <tr>
            <td style="vertical-align:top;width:50%;padding-right:12px;">
              <h3 style="margin:0 0 8px;font-size:14px;color:${GOLD};">Customer</h3>
              <div style="color:${MUTED};line-height:1.6;">
                ${escapeHtml(params.customerName)}<br/>
                ${params.phone ? `${escapeHtml(params.phone)}<br/>` : ""}
                ${escapeHtml(params.to)}
              </div>
            </td>
            <td style="vertical-align:top;width:50%;padding-left:12px;">
              <h3 style="margin:0 0 8px;font-size:14px;color:${GOLD};">Delivery address</h3>
              <div style="color:${MUTED};line-height:1.6;">${escapeHtml(
                addressText,
              )}</div>
            </td>
          </tr>
        </table>

        <h3 style="margin:26px 0 6px;font-size:14px;color:${GOLD};">Payment</h3>
        <p style="margin:0;color:${MUTED};">${paymentLabel}</p>
        ${
          params.razorpayPaymentId
            ? `<p style="margin:2px 0 0;color:#9a8f88;font-size:12px;">Payment ID: ${escapeHtml(
                params.razorpayPaymentId,
              )}</p>`
            : ""
        }

        <div style="border-top:1px solid #efe7d6;margin-top:28px;padding-top:20px;">
          <h3 style="margin:0 0 6px;font-size:15px;">Need assistance? We're here.</h3>
          <p style="margin:0;color:${MUTED};">Email us: <a href="mailto:${SUPPORT_EMAIL}" style="color:${GOLD};">${SUPPORT_EMAIL}</a></p>
        </div>

        <div style="text-align:center;margin-top:24px;">
          <a href="${SITE_URL}" style="display:inline-block;background:${NAVY};color:${GOLD};text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:bold;letter-spacing:1px;">Visit ${BRAND_NAME}</a>
        </div>
      </div>
      <div style="background:#faf6ee;padding:16px;text-align:center;color:#9a8f88;font-size:12px;">
        © ${BRAND_NAME} · <a href="${SITE_URL}" style="color:#9a8f88;">${SITE_URL.replace(
          /^https?:\/\//,
          "",
        )}</a>
      </div>
    </div>
  </div>`;

  const textLines = [
    `Thanks for your order, ${params.customerName}!`,
    `Order ${params.orderNumber}${
      params.orderDate ? ` — placed on ${params.orderDate}` : ""
    }`,
    "",
    isPrepaid
      ? "Payment received online — nothing to pay on delivery."
      : `Cash on Delivery — keep ${fmtINR(params.amount)} ready for the courier.`,
    "",
    "Order summary:",
    ...params.items.map((it) => {
      const opts = (it.options || [])
        .filter((o) => o && o.value)
        .map((o) => `${o.name}: ${o.value}`)
        .join(", ");
      return `- ${it.name}${opts ? ` (${opts})` : ""} x${it.quantity}${
        it.lineTotal ? ` — ${fmtINR(it.lineTotal)}` : ""
      }`;
    }),
    "",
    s.subtotal ? `Subtotal: ${fmtINR(s.subtotal)}` : "",
    s.shipping ? `Shipping: ${fmtINR(s.shipping)}` : "",
    s.tax ? `Tax: ${fmtINR(s.tax)}` : "",
    s.discount && Number(s.discount) > 0 ? `Discount: -${fmtINR(s.discount)}` : "",
    `${isPrepaid ? "Total paid" : "Total to pay"}: ${fmtINR(
      s.total || params.amount,
    )}`,
    `Payment method: ${paymentLabel}`,
    params.razorpayPaymentId ? `Payment ID: ${params.razorpayPaymentId}` : "",
    "",
    `Delivery address: ${addressText}`,
    params.phone ? `Phone: ${params.phone}` : "",
    "",
    `Need help? Email ${SUPPORT_EMAIL}`,
    SITE_URL,
  ].filter(Boolean);

  return { subject, html, text: textLines.join("\n") };
};


/**
 * Sends the confirmation. NEVER throws — a failure here must not fail the order
 * (the order already exists and is paid). Returns whether it sent, so the caller
 * can log it.
 */
export const sendOrderConfirmationEmail = async (
  params: OrderEmailParams,
): Promise<boolean> => {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailAppPassword) {
    console.error("Order email skipped: GMAIL_USER / GMAIL_APP_PASSWORD missing.");
    return false;
  }

  if (!isValidEmail(params.to)) {
    console.error(`Order email skipped: invalid recipient "${params.to}".`);
    return false;
  }

  const { subject, html, text } = renderOrderEmail(params);
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailAppPassword },
  });

  try {
    await transporter.sendMail({
      from: `"${BRAND_NAME}" <${gmailUser}>`,
      to: params.to,
      subject,
      text,
      html,
      // Inline logo. `cid` must match the src="cid:…" in the rendered html, and
      // contentDisposition:"inline" stops clients listing it as a download.
      attachments: logoAttachments(),
    });
    return true;
  } catch (err) {
    console.error("Order confirmation email failed:", err);
    return false;
  }
};
