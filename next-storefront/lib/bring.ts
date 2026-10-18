import {
  ShippingProviderError,
  type BookedShipment,
  type ShipmentRequest,
  type ShippingProvider,
} from "@/lib/shipping";

const BOOKING_URL = "https://api.bring.com/booking/api/create";
const CARRIER = "Bring";
const TEST_CUSTOMER_NUMBER = "5";
const HOME_DELIVERY_PRODUCT = "5600";

export interface BringSender {
  name: string;
  addressLine: string;
  postalCode: string;
  city: string;
  countryCode: string;
  email: string;
  phoneNumber: string;
}

export interface BringOptions {
  uid: string;
  apiKey: string;
  clientUrl: string;
  test: boolean;
  customerNumber: string;
  sender: BringSender;
  fetch?: typeof fetch;
  now?: () => Date;
}

interface BringConsignment {
  confirmation?: {
    consignmentNumber?: string;
    links?: { tracking?: string };
  };
  errors?: Array<{ code?: string; messages?: Array<{ message?: string }> }>;
}

export function bringFromEnv(
  env: Record<string, string | undefined> = process.env,
  clientUrl: string,
): ShippingProvider | null {
  const uid = env.BRING_API_UID;
  const apiKey = env.BRING_API_KEY;
  if (!uid || !apiKey) return null;
  const test = env.BRING_TEST !== "false";
  const customerNumber =
    env.BRING_CUSTOMER_NUMBER || (test ? TEST_CUSTOMER_NUMBER : "");
  const sender: BringSender = {
    name: env.BRING_SENDER_NAME ?? "",
    addressLine: env.BRING_SENDER_ADDRESS ?? "",
    postalCode: env.BRING_SENDER_POSTAL_CODE ?? "",
    city: env.BRING_SENDER_CITY ?? "",
    countryCode: env.BRING_SENDER_COUNTRY ?? "NO",
    email: env.BRING_SENDER_EMAIL ?? "",
    phoneNumber: env.BRING_SENDER_PHONE ?? "",
  };
  if (!customerNumber || !sender.name || !sender.phoneNumber) return null;
  return createBring({ uid, apiKey, clientUrl, test, customerNumber, sender });
}

function errorMessage(consignment: BringConsignment): string {
  return (consignment.errors ?? [])
    .map(
      (error) =>
        error.messages?.map((item) => item.message).join(", ") ||
        error.code ||
        "error",
    )
    .join("; ");
}

export function createBring(options: BringOptions): ShippingProvider {
  const fetchImpl = options.fetch ?? fetch;
  const now = options.now ?? (() => new Date());

  return {
    carrier: CARRIER,

    async book(request: ShipmentRequest): Promise<BookedShipment> {
      const { address, parcel } = request;
      const response = await fetchImpl(BOOKING_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          "X-Mybring-API-Uid": options.uid,
          "X-Mybring-API-Key": options.apiKey,
          "X-Bring-Client-URL": options.clientUrl,
          "X-Bring-Test-Indicator": String(options.test),
        },
        body: JSON.stringify({
          schemaVersion: 1,
          consignments: [
            {
              shippingDateTime: now().toISOString().slice(0, 19),
              parties: {
                sender: {
                  name: options.sender.name,
                  addressLine: options.sender.addressLine,
                  postalCode: options.sender.postalCode,
                  city: options.sender.city,
                  countryCode: options.sender.countryCode,
                  contact: {
                    email: options.sender.email,
                    phoneNumber: options.sender.phoneNumber,
                  },
                },
                recipient: {
                  name: address.company ?? address.name,
                  addressLine: address.line1,
                  ...(address.line2 ? { addressLine2: address.line2 } : {}),
                  postalCode: address.postalCode,
                  city: address.city,
                  countryCode: address.country.toUpperCase(),
                  reference: request.orderNumber
                    ? `Order ${request.orderNumber}`
                    : request.orderId,
                  contact: {
                    name: address.name,
                    email: request.email,
                    phoneNumber: address.phone ?? "",
                  },
                },
              },
              product: {
                id: HOME_DELIVERY_PRODUCT,
                customerNumber: options.customerNumber,
              },
              packages: [
                {
                  weightInKg: parcel.weightKg,
                  dimensions: {
                    heightInCm: parcel.heightCm,
                    lengthInCm: parcel.lengthCm,
                    widthInCm: parcel.widthCm,
                  },
                },
              ],
            },
          ],
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        consignments?: BringConsignment[];
      } | null;
      const consignment = body?.consignments?.[0];
      if (!response.ok || !consignment) {
        throw new ShippingProviderError(
          CARRIER,
          `${response.status} booking failed`,
          response.status >= 500 || response.status === 429,
        );
      }
      const number = consignment.confirmation?.consignmentNumber;
      if (!number) {
        throw new ShippingProviderError(
          CARRIER,
          errorMessage(consignment) || "no consignment number",
          false,
        );
      }
      return {
        reference: number,
        trackingNumber: number,
        trackingUrl: consignment.confirmation?.links?.tracking ?? null,
      };
    },

    async resume(reference: string): Promise<BookedShipment> {
      return { reference, trackingNumber: reference, trackingUrl: null };
    },
  };
}
