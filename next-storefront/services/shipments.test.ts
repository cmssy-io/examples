import { describe, expect, it, vi } from "vitest";
import {
  ShippingProviderError,
  type BookedShipment,
  type ShippingProvider,
} from "@/lib/shipping";
import type { AdminResult } from "./admin";
import {
  attemptOf,
  CLAIM_TIMEOUT_MS,
  claimNote,
  notMadeNote,
  shipOrder,
  type ShipDeps,
} from "./shipments";

vi.mock("@/cmssy.config", () => ({ cmssy: {} }));

const NOW = Date.parse("2026-10-19T08:00:00Z");
const TOKEN = "t-1";
const KEY = "shippo:o1:USPS";

const ADDRESS = {
  name: "Jane Doe",
  company: null,
  line1: "215 Clayton St",
  line2: null,
  postalCode: "94117",
  city: "San Francisco",
  region: "CA",
  country: "US",
  phone: "+14155550101",
};

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: "o1",
    orderNumber: 42,
    customerEmail: "buyer@example.com",
    paymentStatus: "paid",
    currency: "EUR",
    items: [{ name: "Oak desk", sku: "DESK-1", quantity: 2, price: 24900 }],
    shippingMethod: { id: "us-priority" },
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
    carrier: "USPS",
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
  trackingNumber: "9405500106025018341219",
  trackingUrl:
    "https://tools.usps.com/go/TrackConfirmAction?tLabels=9405500106025018341219",
  labelUrl: "https://deliver.goshippo.com/9001.pdf",
};

describe("shipOrder", () => {
  it("claims the parcel, then books it and records the label on that parcel", async () => {
    const shippo = fakeProvider("USPS", TRACKED);
    const d = deps(order(), { shippo });

    const outcome = await shipOrder("o1", d);

    expect(outcome).toEqual({ shipped: { ...TRACKED, carrier: "USPS" } });
    expect(shippo.book).toHaveBeenCalledWith({
      orderId: "o1",
      orderNumber: 42,
      email: "buyer@example.com",
      address: ADDRESS,
      parcel: { weightKg: 5, lengthCm: 40, widthCm: 30, heightCm: 20 },
      service: "usps_priority",
      origin: "us",
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
        carrier: "USPS",
        idempotencyKey: KEY,
        note: claimNote("USPS", TOKEN),
      },
    ]);
    expect(writes(d, "UpdateShipment")).toEqual([
      {
        orderId: "o1",
        shipmentId: "s1",
        trackingNumber: TRACKED.trackingNumber,
        trackingUrl: TRACKED.trackingUrl,
        labelUrl: TRACKED.labelUrl,
        note: "USPS shipment 9001",
      },
    ]);
  });

  it("books nothing when another delivery's claim won", async () => {
    const shippo = fakeProvider("USPS", TRACKED);
    const d = deps(
      order(),
      { shippo },
      { claimNoteOnServer: claimNote("USPS", "other") },
    );

    expect(await shipOrder("o1", d)).toEqual({
      pending: { carrier: "USPS", reference: null },
    });
    expect(shippo.book).not.toHaveBeenCalled();
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
      const shippo = fakeProvider("Shippo", {
        reference: "tx1",
        trackingNumber: "8503175446",
        trackingUrl: null,
        labelUrl: null,
      });
      const d = deps(
        order({
          shippingMethod: { id: method },
          shippingAddress: { ...ADDRESS, country },
        }),
        { shippo },
      );

      const outcome = await shipOrder("o1", d);

      expect(outcome).toEqual({
        shipped: {
          reference: "tx1",
          trackingNumber: "8503175446",
          trackingUrl: null,
          labelUrl: null,
          carrier,
        },
      });
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
      "priority mail abroad",
      order({ shippingAddress: { ...ADDRESS, country: "DE" } }),
      "no provider for this shipping method",
    ],
  ])("leaves %s alone", async (_label, current, skipped) => {
    const shippo = fakeProvider("USPS", TRACKED);
    const d = deps(current, { shippo });

    expect(await shipOrder("o1", d)).toEqual({ skipped });
    expect(shippo.book).not.toHaveBeenCalled();
    expect(d.calls).toHaveBeenCalledTimes(1);
  });

  it("says so when the routed carrier has no credentials", async () => {
    const d = deps(order(), { shippo: null });

    expect(await shipOrder("o1", d)).toEqual({
      skipped: "shippo is not configured",
    });
  });

  it("does not book twice when the claimed parcel already has a tracking number", async () => {
    const shippo = fakeProvider("USPS", TRACKED);
    const d = deps(
      order({ shipments: [claimed([{ note: "x" }], { trackingNumber: "X" })] }),
      { shippo },
    );

    expect(await shipOrder("o1", d)).toEqual({ skipped: "already shipped" });
    expect(shippo.book).not.toHaveBeenCalled();
    expect(d.calls).toHaveBeenCalledTimes(1);
  });

  it("does not touch a parcel a person recorded by hand", async () => {
    const shippo = fakeProvider("USPS", TRACKED);
    const d = deps(
      order({
        shipments: [
          claimed([{ note: "dropped at the locker" }], {
            idempotencyKey: null,
          }),
        ],
      }),
      { shippo },
    );

    expect(await shipOrder("o1", d)).toEqual({
      skipped: "shipment recorded by hand",
    });
    expect(shippo.book).not.toHaveBeenCalled();
    expect(d.calls).toHaveBeenCalledTimes(1);
  });

  it("resumes a booked parcel instead of booking a second one, and fills in its tracking", async () => {
    const shippo = fakeProvider("USPS", TRACKED);
    const d = deps(
      order({
        shipments: [
          claimed([
            { note: claimNote("USPS", "old") },
            { note: "USPS shipment 9001" },
          ]),
        ],
      }),
      { shippo },
    );

    expect(await shipOrder("o1", d)).toEqual({
      shipped: { ...TRACKED, carrier: "USPS" },
    });
    expect(shippo.book).not.toHaveBeenCalled();
    expect(shippo.resume).toHaveBeenCalledWith("9001");
    expect(writes(d, "UpdateShipment")).toEqual([
      {
        orderId: "o1",
        shipmentId: "s1",
        trackingNumber: TRACKED.trackingNumber,
        trackingUrl: TRACKED.trackingUrl,
        labelUrl: TRACKED.labelUrl,
      },
    ]);
  });

  it("records a parcel still waiting for its number and reports it pending", async () => {
    const shippo = fakeProvider("USPS", {
      reference: "9001",
      trackingNumber: null,
      trackingUrl: null,
      labelUrl: null,
    });
    const d = deps(order(), { shippo });

    expect(await shipOrder("o1", d)).toEqual({
      pending: { carrier: "USPS", reference: "9001" },
    });
    expect(writes(d, "UpdateShipment")[0]).toMatchObject({
      note: "USPS shipment 9001",
      trackingNumber: null,
    });
  });

  it("reports pending again while the resumed parcel has no number, writing nothing", async () => {
    const shippo = fakeProvider("USPS", TRACKED, {
      reference: "9001",
      trackingNumber: null,
      trackingUrl: null,
      labelUrl: null,
    });
    const d = deps(
      order({ shipments: [claimed([{ note: "USPS shipment 9001" }])] }),
      { shippo },
    );

    expect(await shipOrder("o1", d)).toEqual({
      pending: { carrier: "USPS", reference: "9001" },
    });
    expect(d.calls).toHaveBeenCalledTimes(1);
  });

  it("waits for a fresh claim another delivery is still booking", async () => {
    const shippo = fakeProvider("USPS", TRACKED);
    const d = deps(
      order({
        shipments: [
          claimed([
            {
              at: new Date(NOW - CLAIM_TIMEOUT_MS + 1000).toISOString(),
              note: claimNote("USPS", "other"),
            },
          ]),
        ],
      }),
      { shippo },
    );

    expect(await shipOrder("o1", d)).toEqual({
      pending: { carrier: "USPS", reference: null },
    });
    expect(shippo.book).not.toHaveBeenCalled();
    expect(d.calls).toHaveBeenCalledTimes(1);
  });

  it("flags a claim that never finished for a person instead of booking again", async () => {
    const shippo = fakeProvider("USPS", TRACKED);
    const d = deps(
      order({
        shipments: [
          claimed([
            {
              at: new Date(NOW - CLAIM_TIMEOUT_MS - 1000).toISOString(),
              note: claimNote("USPS", "other"),
            },
          ]),
        ],
      }),
      { shippo },
    );

    expect(await shipOrder("o1", d)).toEqual({
      skipped: "booking outcome unknown, flagged on the order",
    });
    expect(shippo.book).not.toHaveBeenCalled();
    expect(writes(d, "UpdateShipment")).toEqual([
      expect.objectContaining({ shipmentId: "s1", status: "exception" }),
    ]);
  });

  describe("when a person asks for the label again", () => {
    const refused = (overrides: Record<string, unknown> = {}) =>
      claimed([{ note: "USPS booking refused: no state" }], {
        status: "exception",
        ...overrides,
      });

    it("claims the next attempt after the admin canceled the failed one", async () => {
      const shippo = fakeProvider("USPS", TRACKED);
      const d = deps(order({ shipments: [refused({ status: "canceled" })] }), {
        shippo,
      });

      expect(await shipOrder("o1", d, { retry: true })).toEqual({
        shipped: { ...TRACKED, carrier: "USPS" },
      });
      expect(writes(d, "ClaimShipment")[0]).toMatchObject({
        idempotencyKey: `${KEY}:2`,
      });
    });

    it("starts nothing for a canceled booking unless asked to", async () => {
      const shippo = fakeProvider("USPS", TRACKED);
      const d = deps(order({ shipments: [refused({ status: "canceled" })] }), {
        shippo,
      });

      expect(await shipOrder("o1", d)).toEqual({
        skipped: "the last booking was canceled",
      });
      expect(writes(d, "ClaimShipment")).toEqual([]);
    });

    it("claims the next attempt under a new key and books it", async () => {
      const shippo = fakeProvider("USPS", TRACKED);
      const d = deps(order({ shipments: [refused()] }), { shippo });

      const outcome = await shipOrder("o1", d, { retry: true });

      expect(outcome).toEqual({ shipped: { ...TRACKED, carrier: "USPS" } });
      expect(writes(d, "ClaimShipment")).toEqual([
        {
          orderId: "o1",
          carrier: "USPS",
          idempotencyKey: `${KEY}:2`,
          note: claimNote("USPS", TOKEN),
        },
      ]);
      expect(shippo.book).toHaveBeenCalledTimes(1);
    });

    it("counts from the latest attempt", async () => {
      const shippo = fakeProvider("USPS", TRACKED);
      const d = deps(
        order({
          shipments: [
            refused({ id: "s3", idempotencyKey: `${KEY}:3` }),
            refused(),
            refused({ id: "s2", idempotencyKey: `${KEY}:2` }),
          ],
        }),
        { shippo },
      );

      await shipOrder("o1", d, { retry: true });

      expect(writes(d, "ClaimShipment")[0]).toMatchObject({
        idempotencyKey: `${KEY}:4`,
      });
    });

    it("books nothing when another delivery already claimed the next attempt", async () => {
      const shippo = fakeProvider("USPS", TRACKED);
      const d = deps(
        order({ shipments: [refused()] }),
        { shippo },
        { claimNoteOnServer: claimNote("USPS", "other") },
      );

      expect(await shipOrder("o1", d, { retry: true })).toEqual({
        pending: { carrier: "USPS", reference: null },
      });
      expect(shippo.book).not.toHaveBeenCalled();
    });

    it("leaves a shipped latest attempt alone", async () => {
      const shippo = fakeProvider("USPS", TRACKED);
      const d = deps(
        order({
          shipments: [
            refused(),
            claimed([{ note: "USPS shipment 9001" }], {
              id: "s2",
              idempotencyKey: `${KEY}:2`,
              trackingNumber: "T1",
            }),
          ],
        }),
        { shippo },
      );

      expect(await shipOrder("o1", d, { retry: true })).toEqual({
        skipped: "already shipped",
      });
      expect(writes(d, "ClaimShipment")).toEqual([]);
    });

    it("does not start a new attempt while the latest one is still booking", async () => {
      const shippo = fakeProvider("USPS", TRACKED);
      const d = deps(
        order({
          shipments: [
            refused(),
            claimed([{ note: claimNote("USPS", "other") }], {
              id: "s2",
              idempotencyKey: `${KEY}:2`,
            }),
          ],
        }),
        { shippo },
      );

      expect(await shipOrder("o1", d, { retry: true })).toEqual({
        pending: { carrier: "USPS", reference: null },
      });
      expect(writes(d, "ClaimShipment")).toEqual([]);
    });
  });

  describe("attemptOf", () => {
    it.each([
      [KEY, 1],
      [`${KEY}:2`, 2],
      [`${KEY}:12`, 12],
      [`${KEY}:1`, null],
      [`${KEY}:0`, null],
      [`${KEY}:x`, null],
      [`${KEY}x`, null],
      ["shippo:o2:USPS", null],
      [null, null],
    ])("reads %s as attempt %s", (key, attempt) => {
      expect(attemptOf(key, KEY)).toBe(attempt);
    });
  });

  it("leaves a parcel already flagged for a person alone", async () => {
    const shippo = fakeProvider("USPS", TRACKED);
    const d = deps(
      order({
        shipments: [claimed([{ note: "refused" }], { status: "exception" })],
      }),
      { shippo },
    );

    expect(await shipOrder("o1", d)).toEqual({
      skipped: "the booking needs a person: see the shipment on the order",
    });
    expect(shippo.book).not.toHaveBeenCalled();
    expect(d.calls).toHaveBeenCalledTimes(1);
  });

  it("marks the claim as an exception when the carrier refuses, then rethrows", async () => {
    const refusal = new ShippingProviderError("USPS", "bad postcode", false);
    const shippo = fakeProvider("USPS", refusal);
    const d = deps(order(), { shippo });

    await expect(shipOrder("o1", d)).rejects.toBe(refusal);
    expect(writes(d, "UpdateShipment")).toEqual([
      {
        orderId: "o1",
        shipmentId: "s1",
        status: "exception",
        note: "USPS booking refused: USPS: bad postcode",
      },
    ]);
  });

  it("notes a booking the carrier did not make, so the redelivery books it on the same claim", async () => {
    const outage = new ShippingProviderError("USPS", "503 down", true);
    const first = deps(order(), { shippo: fakeProvider("USPS", outage) });

    await expect(shipOrder("o1", first)).rejects.toBe(outage);
    const note = (writes(first, "UpdateShipment")[0] as { note: string }).note;
    expect(note).toBe(notMadeNote("USPS", "USPS: 503 down"));

    const shippo = fakeProvider("USPS", TRACKED);
    const retry = deps(
      order({
        shipments: [claimed([{ note: claimNote("USPS", TOKEN) }, { note }])],
      }),
      { shippo },
    );

    expect(await shipOrder("o1", retry)).toEqual({
      shipped: { ...TRACKED, carrier: "USPS" },
    });
    expect(writes(retry, "ClaimShipment")).toEqual([]);
    expect(writes(retry, "UpdateShipment")[0]).toMatchObject({
      shipmentId: "s1",
    });
  });

  it("leaves the claim untouched when the booking failed in a way nobody can read", async () => {
    const lost = new TypeError("fetch failed");
    const d = deps(order(), { shippo: fakeProvider("USPS", lost) });

    await expect(shipOrder("o1", d)).rejects.toBe(lost);
    expect(writes(d, "UpdateShipment")).toEqual([]);
  });

  it("throws when cmssy refuses to record the parcel, so the delivery is retried", async () => {
    const shippo = fakeProvider("USPS", TRACKED);
    const d = deps(
      order(),
      { shippo },
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
