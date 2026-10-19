import { describe, expect, it, vi } from "vitest";
import {
  ShippingProviderError,
  type BookedShipment,
  type ShippingProvider,
} from "@/lib/shipping";
import type { AdminResult } from "./admin";
import {
  CLAIM_TIMEOUT_MS,
  claimNote,
  notMadeNote,
  shipOrder,
  type ShipDeps,
} from "./shipments";

vi.mock("@/cmssy.config", () => ({ cmssy: {} }));

const NOW = Date.parse("2026-10-19T08:00:00Z");
const TOKEN = "t-1";
const KEY = "inpost:o1:InPost";

const ADDRESS = {
  name: "Jan Kowalski",
  company: null,
  line1: "ul. Przemysłowa 12",
  line2: null,
  postalCode: "00-001",
  city: "Warszawa",
  region: null,
  country: "PL",
  phone: "500600700",
};

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: "o1",
    orderNumber: 42,
    customerEmail: "buyer@example.com",
    paymentStatus: "paid",
    currency: "EUR",
    items: [{ name: "Oak desk", sku: "DESK-1", quantity: 2, price: 24900 }],
    shippingMethod: { id: "courier24" },
    shippingAddress: ADDRESS,
    shipments: [],
    ...overrides,
  };
}

function claimed(
  events: Array<{ at?: string; note: string | null }>,
  overrides: Record<string, unknown> = {},
) {
  return {
    id: "s1",
    carrier: "InPost",
    status: "pending",
    trackingNumber: null,
    idempotencyKey: KEY,
    events: events.map((e) => ({
      at: e.at ?? new Date(NOW).toISOString(),
      ...e,
    })),
    ...overrides,
  };
}

function fakeProvider(
  name: string,
  booked: BookedShipment | Error,
  resumed?: BookedShipment,
): ShippingProvider & {
  book: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
} {
  return {
    name,
    book: vi.fn(async () => {
      if (booked instanceof Error) throw booked;
      return booked;
    }),
    resume: vi.fn(async () => resumed ?? (booked as BookedShipment)),
  };
}

function deps(
  current: unknown,
  providers: ShipDeps["providers"],
  options: {
    claimNoteOnServer?: string;
    mutationErrors?: AdminResult<unknown>["errors"];
  } = {},
) {
  const request = vi.fn<
    (
      query: string,
      variables: Record<string, unknown>,
    ) => Promise<AdminResult<unknown>>
  >(async (query, variables) => {
    if (query.includes("OrderForShipping")) {
      return { data: { order: { get: current } }, errors: [] };
    }
    if (query.includes("ClaimShipment")) {
      const input = variables.input as { idempotencyKey: string; note: string };
      return {
        data: {
          order: {
            createShipment: {
              shipments: [
                {
                  id: "s1",
                  idempotencyKey: input.idempotencyKey,
                  events: [
                    {
                      at: new Date(NOW).toISOString(),
                      note: options.claimNoteOnServer ?? input.note,
                    },
                  ],
                },
              ],
            },
          },
        },
        errors: [],
      };
    }
    return { data: {}, errors: options.mutationErrors ?? [] };
  });
  return {
    request: request as unknown as ShipDeps["request"],
    providers,
    now: () => NOW,
    claimToken: () => TOKEN,
    calls: request,
  };
}

function writes(d: ReturnType<typeof deps>, name: string) {
  return d.calls.mock.calls
    .filter(([query]) => query.includes(name))
    .map(([, variables]) => variables.input);
}

const TRACKED: BookedShipment = {
  reference: "9001",
  trackingNumber: "520000011395200025754311",
  trackingUrl:
    "https://inpost.pl/sledzenie-przesylek?number=520000011395200025754311",
};

describe("shipOrder", () => {
  it("claims the parcel, then books it and records the label on that parcel", async () => {
    const inpost = fakeProvider("InPost", TRACKED);
    const shippo = fakeProvider("Shippo", TRACKED);
    const d = deps(order(), { inpost, shippo });

    const outcome = await shipOrder("o1", d);

    expect(outcome).toEqual({ shipped: { ...TRACKED, carrier: "InPost" } });
    expect(shippo.book).not.toHaveBeenCalled();
    expect(inpost.book).toHaveBeenCalledWith({
      orderId: "o1",
      orderNumber: 42,
      email: "buyer@example.com",
      address: ADDRESS,
      parcel: { weightKg: 5, lengthCm: 40, widthCm: 30, heightCm: 20 },
      service: null,
      origin: null,
      currency: "EUR",
      lines: [
        { name: "Oak desk", sku: "DESK-1", quantity: 2, unitPrice: 24900 },
      ],
    });
    expect(
      d.calls.mock.calls.map(([q]) => q.match(/(query|mutation) (\w+)/)![2]),
    ).toEqual(["OrderForShipping", "ClaimShipment", "UpdateShipment"]);
    expect(writes(d, "ClaimShipment")).toEqual([
      {
        orderId: "o1",
        carrier: "InPost",
        idempotencyKey: KEY,
        note: claimNote("InPost", TOKEN),
      },
    ]);
    expect(writes(d, "UpdateShipment")).toEqual([
      {
        orderId: "o1",
        shipmentId: "s1",
        trackingNumber: TRACKED.trackingNumber,
        trackingUrl: TRACKED.trackingUrl,
        note: "InPost shipment 9001",
      },
    ]);
  });

  it("books nothing when another delivery's claim won", async () => {
    const inpost = fakeProvider("InPost", TRACKED);
    const d = deps(
      order(),
      { inpost },
      { claimNoteOnServer: claimNote("InPost", "other") },
    );

    expect(await shipOrder("o1", d)).toEqual({
      pending: { carrier: "InPost", reference: null },
    });
    expect(inpost.book).not.toHaveBeenCalled();
    expect(writes(d, "UpdateShipment")).toEqual([]);
  });

  it.each([
    ["dhl-express", "NO", "DHL Express", "dhl_express_worldwide", "us", 5],
    [
      "nordic-letter",
      "SE",
      "Deutsche Post",
      "deutsche_post_maxibrief_plus",
      "de",
      1.5,
    ],
    ["us-ground", "US", "USPS", "usps_ground_advantage", "us", 5],
  ])(
    "books %s to %s through Shippo and records it under %s",
    async (method, country, carrier, service, origin, weightKg) => {
      const inpost = fakeProvider("InPost", TRACKED);
      const shippo = fakeProvider("Shippo", {
        reference: "tx1",
        trackingNumber: "8503175446",
        trackingUrl: null,
      });
      const d = deps(
        order({
          shippingMethod: { id: method },
          shippingAddress: { ...ADDRESS, country },
        }),
        { inpost, shippo },
      );

      const outcome = await shipOrder("o1", d);

      expect(outcome).toEqual({
        shipped: {
          reference: "tx1",
          trackingNumber: "8503175446",
          trackingUrl: null,
          carrier,
        },
      });
      expect(inpost.book).not.toHaveBeenCalled();
      expect(shippo.book).toHaveBeenCalledWith(
        expect.objectContaining({
          service,
          origin,
          parcel: expect.objectContaining({ weightKg }),
        }),
      );
      expect(writes(d, "ClaimShipment")[0]).toMatchObject({
        carrier,
        idempotencyKey: `shippo:o1:${carrier}`,
      });
      expect(writes(d, "UpdateShipment")[0]).toMatchObject({
        note: `${carrier} shipment tx1`,
      });
    },
  );

  it.each([
    [
      "an unpaid order",
      order({ paymentStatus: "unpaid" }),
      "order is not paid",
    ],
    [
      "an order without an address",
      order({ shippingAddress: null }),
      "order has no shipping method or address",
    ],
    [
      "a pallet",
      order({ shippingMethod: { id: "pallet" } }),
      "no provider for this shipping method",
    ],
    [
      "a courier abroad",
      order({ shippingAddress: { ...ADDRESS, country: "DE" } }),
      "no provider for this shipping method",
    ],
  ])("leaves %s alone", async (_label, current, skipped) => {
    const inpost = fakeProvider("InPost", TRACKED);
    const d = deps(current, { inpost });

    expect(await shipOrder("o1", d)).toEqual({ skipped });
    expect(inpost.book).not.toHaveBeenCalled();
    expect(d.calls).toHaveBeenCalledTimes(1);
  });

  it("says so when the routed carrier has no credentials", async () => {
    const d = deps(order(), { inpost: null });

    expect(await shipOrder("o1", d)).toEqual({
      skipped: "inpost is not configured",
    });
  });

  it("does not book twice when the claimed parcel already has a tracking number", async () => {
    const inpost = fakeProvider("InPost", TRACKED);
    const d = deps(
      order({ shipments: [claimed([{ note: "x" }], { trackingNumber: "X" })] }),
      { inpost },
    );

    expect(await shipOrder("o1", d)).toEqual({ skipped: "already shipped" });
    expect(inpost.book).not.toHaveBeenCalled();
    expect(d.calls).toHaveBeenCalledTimes(1);
  });

  it("does not touch a parcel a person recorded by hand", async () => {
    const inpost = fakeProvider("InPost", TRACKED);
    const d = deps(
      order({
        shipments: [
          claimed([{ note: "dropped at the locker" }], {
            idempotencyKey: null,
          }),
        ],
      }),
      { inpost },
    );

    expect(await shipOrder("o1", d)).toEqual({
      skipped: "shipment recorded by hand",
    });
    expect(inpost.book).not.toHaveBeenCalled();
    expect(d.calls).toHaveBeenCalledTimes(1);
  });

  it("resumes a booked parcel instead of booking a second one, and fills in its tracking", async () => {
    const inpost = fakeProvider("InPost", TRACKED);
    const d = deps(
      order({
        shipments: [
          claimed([
            { note: claimNote("InPost", "old") },
            { note: "InPost shipment 9001" },
          ]),
        ],
      }),
      { inpost },
    );

    expect(await shipOrder("o1", d)).toEqual({
      shipped: { ...TRACKED, carrier: "InPost" },
    });
    expect(inpost.book).not.toHaveBeenCalled();
    expect(inpost.resume).toHaveBeenCalledWith("9001");
    expect(writes(d, "UpdateShipment")).toEqual([
      {
        orderId: "o1",
        shipmentId: "s1",
        trackingNumber: TRACKED.trackingNumber,
        trackingUrl: TRACKED.trackingUrl,
      },
    ]);
  });

  it("records a parcel still waiting for its number and reports it pending", async () => {
    const inpost = fakeProvider("InPost", {
      reference: "9001",
      trackingNumber: null,
      trackingUrl: null,
    });
    const d = deps(order(), { inpost });

    expect(await shipOrder("o1", d)).toEqual({
      pending: { carrier: "InPost", reference: "9001" },
    });
    expect(writes(d, "UpdateShipment")[0]).toMatchObject({
      note: "InPost shipment 9001",
      trackingNumber: null,
    });
  });

  it("reports pending again while the resumed parcel has no number, writing nothing", async () => {
    const inpost = fakeProvider("InPost", TRACKED, {
      reference: "9001",
      trackingNumber: null,
      trackingUrl: null,
    });
    const d = deps(
      order({ shipments: [claimed([{ note: "InPost shipment 9001" }])] }),
      { inpost },
    );

    expect(await shipOrder("o1", d)).toEqual({
      pending: { carrier: "InPost", reference: "9001" },
    });
    expect(d.calls).toHaveBeenCalledTimes(1);
  });

  it("waits for a fresh claim another delivery is still booking", async () => {
    const inpost = fakeProvider("InPost", TRACKED);
    const d = deps(
      order({
        shipments: [
          claimed([
            {
              at: new Date(NOW - CLAIM_TIMEOUT_MS + 1000).toISOString(),
              note: claimNote("InPost", "other"),
            },
          ]),
        ],
      }),
      { inpost },
    );

    expect(await shipOrder("o1", d)).toEqual({
      pending: { carrier: "InPost", reference: null },
    });
    expect(inpost.book).not.toHaveBeenCalled();
    expect(d.calls).toHaveBeenCalledTimes(1);
  });

  it("flags a claim that never finished for a person instead of booking again", async () => {
    const inpost = fakeProvider("InPost", TRACKED);
    const d = deps(
      order({
        shipments: [
          claimed([
            {
              at: new Date(NOW - CLAIM_TIMEOUT_MS - 1000).toISOString(),
              note: claimNote("InPost", "other"),
            },
          ]),
        ],
      }),
      { inpost },
    );

    expect(await shipOrder("o1", d)).toEqual({
      skipped: "booking outcome unknown, flagged on the order",
    });
    expect(inpost.book).not.toHaveBeenCalled();
    expect(writes(d, "UpdateShipment")).toEqual([
      expect.objectContaining({ shipmentId: "s1", status: "exception" }),
    ]);
  });

  it("leaves a parcel already flagged for a person alone", async () => {
    const inpost = fakeProvider("InPost", TRACKED);
    const d = deps(
      order({
        shipments: [claimed([{ note: "refused" }], { status: "exception" })],
      }),
      { inpost },
    );

    expect(await shipOrder("o1", d)).toEqual({
      skipped: "the booking needs a person: see the shipment on the order",
    });
    expect(inpost.book).not.toHaveBeenCalled();
    expect(d.calls).toHaveBeenCalledTimes(1);
  });

  it("marks the claim as an exception when the carrier refuses, then rethrows", async () => {
    const refusal = new ShippingProviderError("InPost", "bad postcode", false);
    const inpost = fakeProvider("InPost", refusal);
    const d = deps(order(), { inpost });

    await expect(shipOrder("o1", d)).rejects.toBe(refusal);
    expect(writes(d, "UpdateShipment")).toEqual([
      {
        orderId: "o1",
        shipmentId: "s1",
        status: "exception",
        note: "InPost booking refused: InPost: bad postcode",
      },
    ]);
  });

  it("notes a booking the carrier did not make, so the redelivery books it on the same claim", async () => {
    const outage = new ShippingProviderError("InPost", "503 down", true);
    const first = deps(order(), { inpost: fakeProvider("InPost", outage) });

    await expect(shipOrder("o1", first)).rejects.toBe(outage);
    const note = (writes(first, "UpdateShipment")[0] as { note: string }).note;
    expect(note).toBe(notMadeNote("InPost", "InPost: 503 down"));

    const inpost = fakeProvider("InPost", TRACKED);
    const retry = deps(
      order({
        shipments: [claimed([{ note: claimNote("InPost", TOKEN) }, { note }])],
      }),
      { inpost },
    );

    expect(await shipOrder("o1", retry)).toEqual({
      shipped: { ...TRACKED, carrier: "InPost" },
    });
    expect(writes(retry, "ClaimShipment")).toEqual([]);
    expect(writes(retry, "UpdateShipment")[0]).toMatchObject({
      shipmentId: "s1",
    });
  });

  it("leaves the claim untouched when the booking failed in a way nobody can read", async () => {
    const lost = new TypeError("fetch failed");
    const d = deps(order(), { inpost: fakeProvider("InPost", lost) });

    await expect(shipOrder("o1", d)).rejects.toBe(lost);
    expect(writes(d, "UpdateShipment")).toEqual([]);
  });

  it("throws when cmssy refuses to record the parcel, so the delivery is retried", async () => {
    const inpost = fakeProvider("InPost", TRACKED);
    const d = deps(
      order(),
      { inpost },
      {
        mutationErrors: [{ message: "boom", extensions: { code: "INTERNAL" } }],
      },
    );

    await expect(shipOrder("o1", d)).rejects.toThrow(
      "record the shipment - boom",
    );
  });

  it("skips an order cmssy cannot find", async () => {
    const d = {
      providers: {},
      now: () => NOW,
      claimToken: () => TOKEN,
      request: (async () => ({
        errors: [
          { message: "Order not found", extensions: { code: "NOT_FOUND" } },
        ],
      })) as unknown as ShipDeps["request"],
    };

    expect(await shipOrder("o1", d)).toEqual({ skipped: "Order not found" });
  });
});
