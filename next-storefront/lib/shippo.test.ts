import { describe, expect, it, vi } from "vitest";
import { ShippingProviderError, type ShipmentRequest } from "./shipping";
import { createShippo, needsCustoms, shippoFromEnv } from "./shippo";

const ORIGINS = {
  us: { addressId: "addr_us", country: "US" },
  de: { addressId: "addr_de", country: "DE" },
};

function request(overrides: Partial<ShipmentRequest> = {}): ShipmentRequest {
  return {
    key: "shippo:o1:USPS",
    orderId: "o1",
    orderNumber: 42,
    email: "buyer@example.com",
    address: {
      name: "Jane Doe",
      company: null,
      line1: "215 Clayton St",
      line2: null,
      postalCode: "94117",
      city: "San Francisco",
      region: "CA",
      country: "us",
      phone: "+14155550101",
    },
    parcel: { weightKg: 5, lengthCm: 40, widthCm: 30, heightCm: 20 },
    service: "usps_ground_advantage",
    origin: "us",
    currency: "EUR",
    lines: [
      { name: "Oak desk", sku: "DESK-1", quantity: 1, unitPrice: 24900 },
      { name: "Lamp", sku: null, quantity: 3, unitPrice: 1999 },
    ],
    ...overrides,
  };
}

const NORWAY = {
  name: "Ola Nordmann",
  company: "Nordmann AS",
  line1: "Karl Johans gate 22",
  line2: "3. etasje",
  postalCode: "0159",
  city: "Oslo",
  region: null,
  country: "NO",
  phone: null,
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const RATES = {
  rates: [
    { object_id: "rate_priority", servicelevel: { token: "usps_priority" } },
    {
      object_id: "rate_ground",
      servicelevel: { token: "usps_ground_advantage" },
    },
  ],
  messages: [],
};

const SOLD = {
  object_id: "tx1",
  status: "SUCCESS",
  tracking_number: "9334620845500002019083",
  tracking_url_provider:
    "https://tools.usps.com/go/TrackConfirmAction_input?origTrackNum=9334620845500002019083",
  label_url: "https://deliver.goshippo.com/tx1.pdf",
};

function shippo(
  responses: Array<() => Response>,
  customsSigner: string | null = "Demo Ops",
) {
  const queue = [...responses];
  const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
    async () => {
      const next = queue.shift();
      if (!next) throw new Error("unexpected request");
      return next();
    },
  );
  const provider = createShippo({
    token: "shippo_test_t",
    origins: ORIGINS,
    customsSigner,
    fetch: fetch as unknown as typeof globalThis.fetch,
  });
  const body = (call: number) =>
    JSON.parse(String(fetch.mock.calls[call]![1]!.body)) as Record<
      string,
      unknown
    >;
  return { provider, fetch, body };
}

describe("needsCustoms", () => {
  it.each([
    ["US", "US", false],
    ["DE", "SE", false],
    ["DE", "DE", false],
    ["DE", "NO", true],
    ["US", "DE", true],
    ["US", "NO", true],
  ])("%s to %s: %s", (from, to, expected) => {
    expect(needsCustoms(from, to)).toBe(expected);
  });
});

describe("createShippo", () => {
  it("buys the routed rate from the configured warehouse and returns its tracking", async () => {
    const { provider, fetch, body } = shippo([
      () => json(RATES),
      () => json(SOLD),
    ]);

    const booked = await provider.book(request());

    expect(booked).toEqual({
      reference: "tx1",
      trackingNumber: SOLD.tracking_number,
      trackingUrl: SOLD.tracking_url_provider,
      labelUrl: SOLD.label_url,
    });
    expect(fetch.mock.calls[0]![0]).toBe("https://api.goshippo.com/shipments/");
    expect(fetch.mock.calls[0]![1]!.headers).toMatchObject({
      authorization: "ShippoToken shippo_test_t",
    });
    expect(body(0)).toEqual({
      address_from: "addr_us",
      address_to: {
        name: "Jane Doe",
        street1: "215 Clayton St",
        city: "San Francisco",
        state: "CA",
        zip: "94117",
        country: "US",
        phone: "+14155550101",
        email: "buyer@example.com",
      },
      parcels: [
        {
          length: "40",
          width: "30",
          height: "20",
          distance_unit: "cm",
          weight: "5",
          mass_unit: "kg",
        },
      ],
      metadata: "Order 42",
      async: false,
    });
    expect(fetch.mock.calls[1]![0]).toBe(
      "https://api.goshippo.com/transactions/",
    );
    expect(body(1)).toEqual({
      rate: "rate_ground",
      label_file_type: "PDF",
      metadata: "shippo:o1:USPS",
      async: false,
    });
  });

  it("declares every order line to customs when the parcel leaves the customs area", async () => {
    const { provider, body } = shippo([
      () =>
        json({
          rates: [
            {
              object_id: "rate_dhl",
              servicelevel: { token: "dhl_express_worldwide" },
            },
          ],
        }),
      () => json(SOLD),
    ]);

    await provider.book(
      request({ address: NORWAY, service: "dhl_express_worldwide" }),
    );

    expect(body(0).address_to).toEqual({
      name: "Ola Nordmann",
      company: "Nordmann AS",
      street1: "Karl Johans gate 22",
      street2: "3. etasje",
      city: "Oslo",
      zip: "0159",
      country: "NO",
      email: "buyer@example.com",
    });
    expect(body(0).customs_declaration).toEqual({
      contents_type: "MERCHANDISE",
      non_delivery_option: "RETURN",
      certify: true,
      certify_signer: "Demo Ops",
      incoterm: "DDU",
      invoice: "#42",
      items: [
        {
          description: "Oak desk",
          quantity: 1,
          net_weight: "1.250",
          mass_unit: "kg",
          value_amount: "249.00",
          value_currency: "EUR",
          origin_country: "US",
          sku_code: "DESK-1",
        },
        {
          description: "Lamp",
          quantity: 3,
          net_weight: "3.750",
          mass_unit: "kg",
          value_amount: "59.97",
          value_currency: "EUR",
          origin_country: "US",
        },
      ],
    });
  });

  it("sends no customs inside the EU", async () => {
    const { provider, body } = shippo([
      () =>
        json({
          rates: [
            {
              object_id: "r",
              servicelevel: { token: "deutsche_post_maxibrief_plus" },
            },
          ],
        }),
      () => json(SOLD),
    ]);

    await provider.book(
      request({
        address: { ...NORWAY, country: "SE", city: "Stockholm" },
        origin: "de",
        service: "deutsche_post_maxibrief_plus",
      }),
    );

    expect(body(0).address_from).toBe("addr_de");
    expect(body(0)).not.toHaveProperty("customs_declaration");
  });

  it.each([
    [
      "a declaration without a signer",
      request({ address: NORWAY, service: "dhl_express_worldwide" }),
      null,
      "SHIPPO_CUSTOMS_SIGNER is required",
    ],
    [
      "a declaration without order lines",
      request({ address: NORWAY, service: "dhl_express_worldwide", lines: [] }),
      "Demo Ops",
      "customs needs at least one order line",
    ],
    [
      "a warehouse with no address",
      request({ origin: "pl" }),
      "Demo Ops",
      'no "pl" sender address configured',
    ],
    [
      "a US address without a state",
      request({
        address: {
          ...request().address,
          region: null,
        },
      }),
      "Demo Ops",
      "an address in US needs a state or region",
    ],
    [
      "a route without a service",
      request({ service: null }),
      "Demo Ops",
      "the route names no service or origin",
    ],
  ])(
    "refuses %s before calling Shippo",
    async (_label, input, signer, message) => {
      const { provider, fetch } = shippo([], signer);

      const error = await provider.book(input).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ShippingProviderError);
      expect(error).toMatchObject({ retryable: false });
      expect((error as Error).message).toContain(message);
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("refuses when Shippo offers no rate for the routed service, buying nothing", async () => {
    const { provider, fetch } = shippo([
      () =>
        json({
          rates: [
            {
              object_id: "rate_priority",
              servicelevel: { token: "usps_priority" },
            },
          ],
          messages: [{ text: "Address could not be validated" }],
        }),
    ]);

    await expect(provider.book(request())).rejects.toMatchObject({
      retryable: false,
      message:
        "Shippo: no usps_ground_advantage rate: Address could not be validated",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("names only the routed carrier's reason when it offers no rate", async () => {
    const { provider } = shippo([
      () =>
        json({
          rates: [],
          messages: [
            {
              source: "shippo_dpd_de_account",
              text: "Carrier account shippo_dpd_de_account doesn't support one or more shipment options",
            },
            {
              source: "DHLExpress",
              text: "DHL Express requires a phone number for the consignee address.",
            },
            { source: "UPS", text: "Shipment origin is out of service area" },
          ],
        }),
    ]);

    await expect(
      provider.book(
        request({ address: NORWAY, service: "dhl_express_worldwide" }),
      ),
    ).rejects.toMatchObject({
      retryable: false,
      message:
        "Shippo: no dhl_express_worldwide rate: DHL Express requires a phone number for the consignee address.",
    });
  });

  it("refuses a label the carrier rejected, with the carrier's reason", async () => {
    const { provider } = shippo([
      () => json(RATES),
      () =>
        json({
          object_id: "tx1",
          status: "ERROR",
          messages: [{ text: "The UPS account is not yet registered" }],
        }),
    ]);

    await expect(provider.book(request())).rejects.toMatchObject({
      retryable: false,
      message: "Shippo: The UPS account is not yet registered",
    });
  });

  it("returns a queued label as pending and resumes it by its transaction id", async () => {
    const { provider, fetch } = shippo([
      () => json(RATES),
      () =>
        json({
          object_id: "tx1",
          status: "QUEUED",
          tracking_number: "PROVISIONAL",
        }),
      () => json(SOLD),
    ]);

    expect(await provider.book(request())).toEqual({
      reference: "tx1",
      trackingNumber: null,
      trackingUrl: null,
      labelUrl: null,
    });
    expect(await provider.resume("tx1")).toMatchObject({
      reference: "tx1",
      trackingNumber: SOLD.tracking_number,
      labelUrl: SOLD.label_url,
    });
    expect(fetch.mock.calls[2]![0]).toBe(
      "https://api.goshippo.com/transactions/tx1",
    );
    expect(fetch.mock.calls[2]![1]!.method).toBe("GET");
    expect(fetch.mock.calls[2]![1]!).not.toHaveProperty("body");
  });

  it.each([
    [500, true],
    [429, true],
    [400, false],
    [401, false],
  ])("marks a %s from Shippo retryable: %s", async (status, retryable) => {
    const { provider } = shippo([
      () => json({ detail: "Token does not exist" }, status),
    ]);

    await expect(provider.book(request())).rejects.toMatchObject({
      retryable,
      message: `Shippo: ${status} Token does not exist`,
    });
  });
});

describe("shippoFromEnv", () => {
  it("is off without a token", () => {
    expect(shippoFromEnv({ SHIPPO_ADDRESS_FROM_US: "addr_us" })).toBeNull();
  });

  it("ships only from the warehouses it has an address for", async () => {
    const provider = shippoFromEnv({
      SHIPPO_API_TOKEN: "shippo_test_t",
      SHIPPO_ADDRESS_FROM_US: "addr_us",
      SHIPPO_CUSTOMS_SIGNER: "Demo Ops",
    });

    expect(provider?.name).toBe("Shippo");
    await expect(provider!.book(request({ origin: "de" }))).rejects.toThrow(
      'no "de" sender address configured',
    );
  });
});
