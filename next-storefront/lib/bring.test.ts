import { describe, expect, it, vi } from "vitest";
import { bringFromEnv, createBring, type BringOptions } from "./bring";
import { ShippingProviderError, type ShipmentRequest } from "./shipping";

const REQUEST: ShipmentRequest = {
  orderId: "6a2",
  orderNumber: 7,
  email: "kunde@example.no",
  address: {
    name: "Ola Nordmann",
    company: null,
    line1: "Storgata 7",
    line2: "Leilighet 3",
    postalCode: "0155",
    city: "Oslo",
    country: "no",
    phone: "+4791234567",
  },
  parcel: { weightKg: 2, lengthCm: 30, widthCm: 20, heightCm: 10 },
};

const OPTIONS: Omit<BringOptions, "fetch"> = {
  uid: "ops@example.com",
  apiKey: "key",
  clientUrl: "https://shop.example",
  test: true,
  customerNumber: "5",
  sender: {
    name: "Demo Lager AS",
    addressLine: "Lagerveien 1",
    postalCode: "0581",
    city: "Oslo",
    countryCode: "NO",
    email: "lager@example.no",
    phoneNumber: "+4722000000",
  },
  now: () => new Date("2026-10-19T08:30:00.000Z"),
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Bring", () => {
  it("books home delivery as a test consignment and returns its tracking link", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      json(200, {
        consignments: [
          {
            confirmation: {
              consignmentNumber: "70438101015432113",
              links: { tracking: "https://sporing.posten.no/sporing/70438101015432113" },
            },
          },
        ],
      }),
    );

    const booked = await createBring({ ...OPTIONS, fetch: fetchImpl }).book(REQUEST);

    expect(booked).toEqual({
      reference: "70438101015432113",
      trackingNumber: "70438101015432113",
      trackingUrl: "https://sporing.posten.no/sporing/70438101015432113",
    });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://api.bring.com/booking/api/create");
    expect(init?.headers).toMatchObject({
      "X-Mybring-API-Uid": "ops@example.com",
      "X-Mybring-API-Key": "key",
      "X-Bring-Client-URL": "https://shop.example",
      "X-Bring-Test-Indicator": "true",
    });
    const consignment = JSON.parse(String(init?.body)).consignments[0];
    expect(consignment.shippingDateTime).toBe("2026-10-19T08:30:00");
    expect(consignment.product).toEqual({ id: "5600", customerNumber: "5" });
    expect(consignment.parties.recipient).toEqual({
      name: "Ola Nordmann",
      addressLine: "Storgata 7",
      addressLine2: "Leilighet 3",
      postalCode: "0155",
      city: "Oslo",
      countryCode: "NO",
      reference: "Order 7",
      contact: {
        name: "Ola Nordmann",
        email: "kunde@example.no",
        phoneNumber: "+4791234567",
      },
    });
    expect(consignment.parties.sender.contact.phoneNumber).toBe("+4722000000");
    expect(consignment.packages).toEqual([
      { weightInKg: 2, dimensions: { heightInCm: 10, lengthInCm: 30, widthInCm: 20 } },
    ]);
  });

  it("sends a live booking only when test mode is off", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      json(200, { consignments: [{ confirmation: { consignmentNumber: "1" } }] }),
    );

    await createBring({ ...OPTIONS, test: false, fetch: fetchImpl }).book(REQUEST);

    expect(fetchImpl.mock.calls[0]![1]?.headers).toMatchObject({
      "X-Bring-Test-Indicator": "false",
    });
  });

  it("surfaces the consignment's own errors as a refusal", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      json(200, {
        consignments: [
          { errors: [{ code: "INVALID_POSTAL_CODE", messages: [{ message: "Postal code 0000 is invalid" }] }] },
        ],
      }),
    );

    const error = await createBring({ ...OPTIONS, fetch: fetchImpl })
      .book(REQUEST)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ShippingProviderError);
    expect(error).toMatchObject({ retryable: false });
    expect((error as Error).message).toBe("Bring: Postal code 0000 is invalid");
  });

  it.each([
    [400, false],
    [500, true],
  ])("marks a %i as retryable: %s", async (status, retryable) => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(json(status, {}));

    await expect(
      createBring({ ...OPTIONS, fetch: fetchImpl }).book(REQUEST),
    ).rejects.toMatchObject({ retryable });
  });
});

describe("bringFromEnv", () => {
  const ENV = {
    BRING_API_UID: "ops@example.com",
    BRING_API_KEY: "key",
    BRING_SENDER_NAME: "Demo Lager AS",
    BRING_SENDER_PHONE: "+4722000000",
  };

  it("is off without credentials", () => {
    expect(bringFromEnv({}, "https://shop.example")).toBeNull();
  });

  it("is off without a sender phone, which Bring requires", () => {
    expect(
      bringFromEnv({ ...ENV, BRING_SENDER_PHONE: "" }, "https://shop.example"),
    ).toBeNull();
  });

  it("is off in live mode without a real customer number", () => {
    expect(
      bringFromEnv({ ...ENV, BRING_TEST: "false" }, "https://shop.example"),
    ).toBeNull();
  });

  it("books with Bring's test customer number in test mode", async () => {
    const fetchImpl = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      json(200, { consignments: [{ confirmation: { consignmentNumber: "1" } }] }),
    );
    try {
      await bringFromEnv(ENV, "https://shop.example")!.book(REQUEST);
      const body = JSON.parse(String(fetchImpl.mock.calls[0]![1]?.body));
      expect(body.consignments[0].product.customerNumber).toBe("5");
    } finally {
      fetchImpl.mockRestore();
    }
  });
});
