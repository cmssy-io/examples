import type { CmssyWebhookEvent } from "@cmssy/core";
import {
  idempotencyKey,
  isAllowed,
  resendConfig,
  sendWithResend,
  type MailOutcome,
  type OutgoingMail,
  type ResendConfig,
} from "@/lib/mailer";
import type { Brand } from "@/lib/mail-layout";
import {
  orderCanceledMail,
  orderConfirmationMail,
  orderShippedMail,
  type OrderForMail,
  type WebhookShipment,
} from "@/lib/order-mail";
import {
  adminRequest,
  adminToken,
  errorText,
  isRefusal,
  type AdminResult,
} from "@/services/admin";
import { fetchBrand } from "@/services/site";

export const ORDER_MAIL_EVENTS = new Set([
  "order.created",
  "order.canceled",
  "shipment.created",
  "shipment.updated",
]);

const TAXED = "{ net tax gross }";

const ORDER_FOR_MAIL = `
  query OrderForMail($id: ID!) {
    order {
      get(id: $id) {
        id
        orderNumber
        customerEmail
        customerId
        currency
        items { name sku quantity taxRate line ${TAXED} }
        amounts {
          subtotal ${TAXED}
          discount ${TAXED}
          shipping ${TAXED}
          total ${TAXED}
        }
        taxTreatment { kind legalNote buyerVatId }
      }
    }
  }
`;

export type OrderMailOutcome =
  | MailOutcome
  | "no_mail"
  | "not_configured"
  | "no_admin_token"
  | "order_not_found";

export interface OrderMailDeps {
  resend: ResendConfig | null;
  hasAdminToken: boolean;
  brand: () => Promise<Brand>;
  request: <T>(
    query: string,
    variables: Record<string, unknown>,
    purpose: string,
  ) => Promise<AdminResult<T>>;
  send: (
    mail: OutgoingMail,
    key: string,
    config: ResendConfig,
  ) => Promise<MailOutcome>;
}

const defaultDeps = (): OrderMailDeps => ({
  resend: resendConfig(),
  hasAdminToken: adminToken() !== null,
  brand: fetchBrand,
  request: adminRequest,
  send: sendWithResend,
});

type Template = (order: OrderForMail, brand: Brand) => OutgoingMail;

export function shippedWithTracking(
  event: Pick<CmssyWebhookEvent, "event" | "data">,
): WebhookShipment | null {
  const { shipment, previousStatus } = event.data;
  if (!shipment?.trackingNumber || shipment.status === "canceled") return null;
  if (event.event === "shipment.created") return shipment;
  return previousStatus === "pending" ? shipment : null;
}

export function templateFor(
  event: Pick<CmssyWebhookEvent, "event" | "data">,
): Template | null {
  if (event.event === "order.created") return orderConfirmationMail;
  if (event.event === "order.canceled") return orderCanceledMail;
  const shipment = shippedWithTracking(event);
  return shipment
    ? (order, brand) => orderShippedMail(order, shipment, brand)
    : null;
}

export async function mailOrderEvent(
  event: CmssyWebhookEvent,
  deps: OrderMailDeps = defaultDeps(),
): Promise<OrderMailOutcome> {
  const template = templateFor(event);
  if (!template) return "no_mail";
  const order = event.data.order;
  if (!deps.resend) {
    console.info("order mail skipped: RESEND_API_KEY or MAIL_FROM is not set", {
      event: event.event,
      orderId: order.id,
    });
    return "not_configured";
  }
  if (!isAllowed(order.customerEmail, deps.resend.allowlist)) {
    console.info("order mail skipped: recipient is not on MAIL_ALLOWLIST", {
      event: event.event,
      orderId: order.id,
      to: order.customerEmail,
    });
    return "not_allowed";
  }
  if (!deps.hasAdminToken) return "no_admin_token";

  const { data, errors } = await deps.request<{
    order: { get: OrderForMail | null };
  }>(ORDER_FOR_MAIL, { id: order.id }, "read the order to mail");
  if (errors.length > 0 && !isRefusal(errors)) {
    throw new Error(`cmssy: order not read (${errorText(errors)})`);
  }
  const found = data?.order.get;
  if (!found) {
    console.warn(`cmssy order ${order.id}: not found, no mail sent`);
    return "order_not_found";
  }
  const brand = await deps.brand();
  return deps.send(template(found, brand), idempotencyKey(event), deps.resend);
}
