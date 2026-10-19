import { describe, expect, it, vi } from "vitest";
import { createInpost, inpostTrackingUrl } from "./inpost";
import { ShippingProviderError, type ShipmentRequest } from "./shipping";

const REQUEST: ShipmentRequest = {
  orderId: "6a1",
  orderNumber: 42,
  email: "buyer@example.com",
  address: {
    name: "Jan Kowalski",
    company: "Hydro-Tech Sp. z o.o.",
    line1: "ul. Przemysłowa 12",
    line2: null,
    postalCode: "00-001",
    city: "Warszawa",
    region: null,
    country: "pl",
    phone: "500600700",
  },
  parcel: { weightKg: 5, lengthCm: 40, widthCm: 30, heightCm: 20 },
  service: null,
  origin: null,
  currency: "PLN",
  lines: [],
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function provider(fetchImpl: typeof fetch, sandbox = true) {
  return createInpost({
    token: "tok",
    organizationId: "77",
    sandbox,
    fetch: fetchImpl,
    sleep: async () => {},
    pollAttempts: 3,
  });
}

describe("InPost", () => {
  it("creates a courier shipment in the sandbox and waits for the tracking number", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(201, { id: 9001, status: "created", tracking_number: null }))
      .mockResolvedValueOnce(json(200, { id: 9001, status: "created", tracking_number: null }))
      .mockResolvedValueOnce(json(200, { id: 9001, status: "confirmed", tracking_number: "520000011395200025754311" }));

    const booked = await provider(fetchImpl).book(REQUEST);

    expect(booked).toEqual({
      reference: "9001",
      trackingNumber: "520000011395200025754311",
      trackingUrl: inpostTrackingUrl("520000011395200025754311"),
    });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(
      "https://sandbox-api-shipx-pl.easypack24.net/v1/organizations/77/shipments",
    );
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>).authorization).toBe("Bearer tok");
    expect(JSON.parse(String(init?.body))).toEqual({
      receiver: {
        company_name: "Hydro-Tech Sp. z o.o.",
        first_name: "Jan",
        last_name: "Kowalski",
        email: "buyer@example.com",
        phone: "500600700",
        address: {
          street: "ul. Przemysłowa",
          building_number: "12",
          city: "Warszawa",
          post_code: "00-001",
          country_code: "PL",
        },
      },
      parcels: [
        {
          dimensions: { length: 400, width: 300, height: 200, unit: "mm" },
          weight: { amount: 5, unit: "kg" },
          is_non_standard: false,
        },
      ],
      service: "inpost_courier_standard",
      reference: "Order 42",
    });
    expect(fetchImpl.mock.calls[2]![0]).toBe(
      "https://sandbox-api-shipx-pl.easypack24.net/v1/shipments/9001",
    );
  });

  it("talks to production only when told to", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(json(201, { id: 1, status: "confirmed", tracking_number: "T1" }));

    await provider(fetchImpl, false).book(REQUEST);

    expect(String(fetchImpl.mock.calls[0]![0])).toMatch(
      /^https:\/\/api-shipx-pl\.easypack24\.net\//,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("gives up waiting after the last attempt and hands back the reference", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockImplementation(async () =>
        json(200, { id: 5, status: "created", tracking_number: null }),
      );

    const booked = await provider(fetchImpl).resume("5");

    expect(booked).toEqual({ reference: "5", trackingNumber: null, trackingUrl: null });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("refuses an address it cannot split without calling the API", async () => {
    const fetchImpl = vi.fn<typeof fetch>();

    await expect(
      provider(fetchImpl).book({
        ...REQUEST,
        address: { ...REQUEST.address, line1: "Plac Defilad" },
      }),
    ).rejects.toMatchObject({ retryable: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    [400, false],
    [422, false],
    [429, true],
    [503, true],
  ])("marks a %i as retryable: %s", async (status, retryable) => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(json(status, { message: "nope", details: { phone: ["invalid"] } }));

    const error = await provider(fetchImpl).book(REQUEST).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ShippingProviderError);
    expect(error).toMatchObject({ retryable, carrier: "InPost" });
    expect((error as Error).message).toContain(`${status} nope`);
    expect((error as Error).message).toContain("invalid");
  });
});
