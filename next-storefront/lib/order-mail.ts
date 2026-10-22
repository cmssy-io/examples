import type { CmssyTaxTreatmentKind, CmssyWebhookEvent } from "@cmssy/core";
import { escapeHtml, type OutgoingMail } from "@/lib/mailer";
import {
  button,
  details,
  MAIL_LOCALE,
  panel,
  paragraph,
  renderMail,
  safeUrl,
  type Brand,
} from "@/lib/mail-layout";
import { formatMoney } from "@/lib/money";

export type WebhookShipment = NonNullable<
  CmssyWebhookEvent["data"]["shipment"]
>;

interface TaxedAmount {
  net: number;
  tax: number;
  gross: number;
}

export interface OrderForMail {
  id: string;
  orderNumber: number | null;
  customerEmail: string;
  customerId: string | null;
  currency: string;
  items: {
    name: string;
    sku: string | null;
    quantity: number;
    taxRate: number;
    line: TaxedAmount;
  }[];
  amounts: {
    subtotal: TaxedAmount;
    discount: TaxedAmount;
    shipping: TaxedAmount;
    total: TaxedAmount;
  };
  taxTreatment: {
    kind: CmssyTaxTreatmentKind;
    legalNote: string | null;
    buyerVatId: string | null;
  };
}

type Row = [label: string, value: string];

const CELL = "font-size:14px;line-height:20px;color:#111827;";
const MUTED = "color:#6b7280;";
const SEPARATOR = "border-top:1px solid #e5e7eb;";

function orderName(order: OrderForMail): string {
  return order.orderNumber === null
    ? "Your order"
    : `Your order #${order.orderNumber}`;
}

function orderTitle(order: OrderForMail): string {
  return order.orderNumber === null ? "Order" : `Order #${order.orderNumber}`;
}

function textRows(rows: Row[]): string {
  return rows.map(([label, value]) => `${label}: ${value}`).join("\n");
}

function amountRow(
  label: string,
  amount: TaxedAmount,
  currency: string,
  sign = "",
): string[] {
  return [
    label,
    `${sign}${formatMoney(amount.net, currency, MAIL_LOCALE)}`,
    `${sign}${formatMoney(amount.tax, currency, MAIL_LOCALE)}`,
    `${sign}${formatMoney(amount.gross, currency, MAIL_LOCALE)}`,
  ];
}

export function orderUrl(order: OrderForMail, brand: Brand): string | null {
  if (!order.customerId) return null;
  return new URL(
    `/order/${encodeURIComponent(order.id)}`,
    `${brand.siteUrl}/`,
  ).toString();
}

export function taxNote(order: OrderForMail): string | null {
  const { kind } = order.taxTreatment;
  if (kind !== "reverse_charge" && kind !== "export") return null;
  const { legalNote, buyerVatId } = order.taxTreatment;
  const vatId = buyerVatId ? `Buyer VAT ID: ${buyerVatId}.` : null;
  return [legalNote, vatId].filter(Boolean).join(" ") || null;
}

function orderReason(brand: Brand): string {
  return `You received this email because you placed an order at ${brand.name}.`;
}

function itemsTable(order: OrderForMail): string {
  const money = (minor: number) =>
    formatMoney(minor, order.currency, MAIL_LOCALE);
  const head = (label: string, align: string) =>
    `<th align="${align}" style="padding:0 0 8px;font-size:12px;line-height:16px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;${MUTED}text-align:${align};">${label}</th>`;
  const rows = order.items.map((item) => {
    const sku = item.sku
      ? `<br><span style="font-size:12px;line-height:18px;${MUTED}">SKU ${escapeHtml(item.sku)}</span>`
      : "";
    const value = (text: string, style = "") =>
      `<td align="right" valign="top" style="padding:12px 0 12px 12px;${SEPARATOR}${CELL}white-space:nowrap;${style}">${text}</td>`;
    return [
      "<tr>",
      `<td valign="top" style="padding:12px 0;${SEPARATOR}${CELL}"><strong>${escapeHtml(item.name)}</strong>${sku}</td>`,
      value(String(item.quantity)),
      value(escapeHtml(money(item.line.net)), MUTED),
      value(escapeHtml(money(item.line.gross)), "font-weight:600;"),
      "</tr>",
    ].join("");
  });
  return [
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 16px;">',
    `<tr>${head("Item", "left")}${head("Qty", "right")}${head("Net", "right")}${head("Gross", "right")}</tr>`,
    ...rows,
    "</table>",
  ].join("\n");
}

function totalsTable(rows: Row[], net: Row, vat: Row, total: Row): string {
  const row = ([label, value]: Row, style = "", top = "") =>
    `<tr><td align="right" style="padding:4px 16px 4px 0;${CELL}${MUTED}${top}${style}">${escapeHtml(label)}</td><td align="right" style="padding:4px 0;${CELL}white-space:nowrap;${top}${style}">${escapeHtml(value)}</td></tr>`;
  const gap = "padding-top:12px;";
  return [
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;${SEPARATOR}">`,
    `<tr><td colspan="2" style="height:8px;line-height:8px;font-size:0;">&nbsp;</td></tr>`,
    ...rows.map((entry) => row(entry)),
    row(net, gap, SEPARATOR),
    row(vat),
    row(
      total,
      "font-size:18px;line-height:26px;font-weight:700;color:#111827;",
    ),
    "</table>",
  ].join("\n");
}

export function orderConfirmationMail(
  order: OrderForMail,
  brand: Brand,
): OutgoingMail {
  const money = (minor: number) =>
    formatMoney(minor, order.currency, MAIL_LOCALE);
  const lines = order.items.map((item) => [
    item.sku ? `${item.name} (${item.sku})` : item.name,
    String(item.quantity),
    money(item.line.gross),
  ]);
  const { subtotal, discount, shipping, total } = order.amounts;
  const totals = [
    amountRow("Subtotal", subtotal, order.currency),
    ...(discount.gross > 0
      ? [amountRow("Discount", discount, order.currency, "-")]
      : []),
    amountRow("Shipping", shipping, order.currency),
    amountRow("Total", total, order.currency),
  ];
  const note = taxNote(order);
  const view = orderUrl(order, brand);
  const intro = `Thank you. ${orderName(order)} has been placed.`;
  const text = [
    intro,
    lines
      .map(
        ([name, quantity, lineTotal]) => `${quantity} x ${name}  ${lineTotal}`,
      )
      .join("\n"),
    textRows(
      totals.map(([label, net, tax, gross]) => [
        label,
        `${gross} (net ${net}, VAT ${tax})`,
      ]),
    ),
    ...(note ? [note] : []),
    ...(view ? [`View your order: ${view}`] : []),
  ].join("\n\n");
  const grossRows: Row[] = totals
    .slice(0, -1)
    .map(([label, , , gross]) => [label, gross]);
  const body = [
    paragraph(
      `Thank you for shopping with ${brand.name}. We have received your order and will let you know as soon as it ships.`,
    ),
    itemsTable(order),
    totalsTable(
      grossRows,
      ["Total excl. VAT", money(total.net)],
      ["VAT", money(total.tax)],
      ["Total", money(total.gross)],
    ),
    ...(note ? [panel(escapeHtml(note))] : []),
    ...(view ? [button("View your order", view)] : []),
  ].join("\n");
  return {
    to: order.customerEmail,
    subject: `${orderName(order)} is confirmed`,
    text,
    html: renderMail({
      brand,
      preheader: intro,
      heading: `${orderTitle(order)} confirmed`,
      body,
      reason: orderReason(brand),
    }),
  };
}

export function orderShippedMail(
  order: OrderForMail,
  shipment: Pick<WebhookShipment, "carrier" | "trackingNumber" | "trackingUrl">,
  brand: Brand,
): OutgoingMail {
  const intro = `${orderName(order)} is on its way.`;
  const rows: Row[] = [
    ...(shipment.carrier ? [["Carrier", shipment.carrier] as Row] : []),
    ["Tracking number", shipment.trackingNumber ?? ""],
  ];
  const track = shipment.trackingUrl;
  const href = safeUrl(track);
  return {
    to: order.customerEmail,
    subject: `${orderName(order)} has shipped`,
    text: [
      intro,
      textRows(rows),
      ...(track ? [`Track it: ${track}`] : []),
    ].join("\n\n"),
    html: renderMail({
      brand,
      preheader: intro,
      heading: `${orderTitle(order)} has shipped`,
      body: [
        paragraph(
          `Good news - ${intro.charAt(0).toLowerCase()}${intro.slice(1)}`,
        ),
        details(rows),
        ...(href ? [button("Track your parcel", href)] : []),
      ].join("\n"),
      reason: orderReason(brand),
    }),
  };
}

export function orderCanceledMail(
  order: OrderForMail,
  brand: Brand,
): OutgoingMail {
  const total = formatMoney(
    order.amounts.total.gross,
    order.currency,
    MAIL_LOCALE,
  );
  const lines = [
    `${orderName(order)} has been canceled.`,
    `Order total: ${total}. Nothing will be charged for it.`,
  ];
  return {
    to: order.customerEmail,
    subject: `${orderName(order)} was canceled`,
    text: lines.join("\n\n"),
    html: renderMail({
      brand,
      preheader: lines[0],
      heading: `${orderTitle(order)} canceled`,
      body: [
        paragraph(lines[0]),
        paragraph("Nothing will be charged for it."),
        details([["Order total", total]]),
      ].join("\n"),
      reason: orderReason(brand),
    }),
  };
}
