import type { CmssyTaxTreatmentKind, CmssyWebhookEvent } from "@cmssy/core";
import { escapeHtml, type OutgoingMail } from "@/lib/mailer";
import { formatMoney } from "@/lib/money";

export type WebhookShipment = NonNullable<CmssyWebhookEvent["data"]["shipment"]>;

interface TaxedAmount {
  net: number;
  tax: number;
  gross: number;
}

export interface OrderForMail {
  id: string;
  orderNumber: number | null;
  customerEmail: string;
  currency: string;
  items: {
    name: string;
    sku: string | null;
    quantity: number;
    price: number;
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

function orderName(order: OrderForMail): string {
  return order.orderNumber === null
    ? "Your order"
    : `Your order #${order.orderNumber}`;
}

function paragraphs(lines: string[]): string {
  return lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("\n");
}

function table(head: string[], rows: string[][]): string {
  const cell = (tag: string, value: string, index: number) =>
    `<${tag} style="padding:4px 8px;text-align:${index === 0 ? "left" : "right"}">${escapeHtml(value)}</${tag}>`;
  return [
    '<table style="border-collapse:collapse">',
    `<tr>${head.map((value, index) => cell("th", value, index)).join("")}</tr>`,
    ...rows.map(
      (row) =>
        `<tr>${row.map((value, index) => cell("td", value, index)).join("")}</tr>`,
    ),
    "</table>",
  ].join("\n");
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
    `${sign}${formatMoney(amount.net, currency)}`,
    `${sign}${formatMoney(amount.tax, currency)}`,
    `${sign}${formatMoney(amount.gross, currency)}`,
  ];
}

export function taxNote(order: OrderForMail): string | null {
  if (order.taxTreatment.kind !== "reverse_charge") return null;
  const { legalNote, buyerVatId } = order.taxTreatment;
  const vatId = buyerVatId ? `Buyer VAT ID: ${buyerVatId}.` : null;
  return [legalNote, vatId].filter(Boolean).join(" ") || null;
}

export function orderConfirmationMail(order: OrderForMail): OutgoingMail {
  const money = (minor: number) => formatMoney(minor, order.currency);
  const lines = order.items.map((item) => [
    item.sku ? `${item.name} (${item.sku})` : item.name,
    String(item.quantity),
    money(item.price),
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
  const intro = `Thank you. ${orderName(order)} has been placed.`;
  const text = [
    intro,
    lines
      .map(
        ([name, quantity, , lineTotal]) =>
          `${quantity} x ${name}  ${lineTotal}`,
      )
      .join("\n"),
    textRows(
      totals.map(([label, net, tax, gross]) => [
        label,
        `${gross} (net ${net}, VAT ${tax})`,
      ]),
    ),
    ...(note ? [note] : []),
  ].join("\n\n");
  const html = [
    paragraphs([intro]),
    table(["Item", "Qty", "Unit price", "Total"], lines),
    table(["", "Net", "VAT", "Gross"], totals),
    ...(note ? [paragraphs([note])] : []),
  ].join("\n");
  return {
    to: order.customerEmail,
    subject: `${orderName(order)} is confirmed`,
    text,
    html,
  };
}

export function orderShippedMail(
  order: OrderForMail,
  shipment: Pick<
    WebhookShipment,
    "carrier" | "trackingNumber" | "trackingUrl"
  >,
): OutgoingMail {
  const intro = `${orderName(order)} is on its way.`;
  const details = [
    ...(shipment.carrier ? [`Carrier: ${shipment.carrier}`] : []),
    `Tracking number: ${shipment.trackingNumber ?? ""}`,
  ];
  const track = shipment.trackingUrl;
  return {
    to: order.customerEmail,
    subject: `${orderName(order)} has shipped`,
    text: [intro, details.join("\n"), ...(track ? [`Track it: ${track}`] : [])].join(
      "\n\n",
    ),
    html: [
      paragraphs([intro, ...details]),
      ...(track
        ? [`<p><a href="${escapeHtml(track)}">Track your parcel</a></p>`]
        : []),
    ].join("\n"),
  };
}

export function orderCanceledMail(order: OrderForMail): OutgoingMail {
  const lines = [
    `${orderName(order)} has been canceled.`,
    `Order total: ${formatMoney(order.amounts.total.gross, order.currency)}. Nothing will be charged for it.`,
  ];
  return {
    to: order.customerEmail,
    subject: `${orderName(order)} was canceled`,
    text: lines.join("\n\n"),
    html: paragraphs(lines),
  };
}
