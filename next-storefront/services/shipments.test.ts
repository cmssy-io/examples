import { describe, expect, it, vi } from "vitest";
import {
  ShippingProviderError,
  type BookedShipment,
  type ShippingProvider,
} from "@/lib/shipping";
import type { AdminResult } from "./admin";
import type { ShippoEvent } from "@/lib/shippo";
import {
  applyShippoEvent,
  attemptOf,
  CLAIM_TIMEOUT_MS,
  claimNote,
  notMadeNote,
  orderIdFromKey,
  refundNote,
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
  track: ReturnType<typeof vi.fn>;
} {
  return {
    name,
    book: vi.fn(async () => {
      if (booked instanceof Error) throw booked;
      return booked;
    }),
    resume: vi.fn(async () => resumed ?? (booked as BookedShipment)),
    track: vi.fn(async () => {}),
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
    if (
      query.includes("OrderForShipping") ||
      query.includes("ShipmentsForTracking")
    ) {
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
      key: KEY,
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
        status: "label_purchased",
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
        status: "label_purchased",
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
        status: "canceled",
        ...overrides,
      });

    it("starts nothing for a refused booking nobody asked to retry", async () => {
      const shippo = fakeProvider("USPS", TRACKED);
      const d = deps(order({ shipments: [refused({ status: "exception" })] }), {
        shippo,
      });

      expect(await shipOrder("o1", d, { retryOf: "s1" })).toEqual({
        skipped: "the booking needs a person: see the shipment on the order",
      });
      expect(writes(d, "ClaimShipment")).toEqual([]);
    });

    it("starts nothing for a canceled booking unless asked to", async () => {
      const shippo = fakeProvider("USPS", TRACKED);
      const d = deps(order({ shipments: [refused()] }), { shippo });

      expect(await shipOrder("o1", d)).toEqual({
        skipped: "the last booking was canceled",
      });
      expect(writes(d, "ClaimShipment")).toEqual([]);
    });

    it("does not start another attempt when a redelivered request finds its attempt refused", async () => {
      const shippo = fakeProvider("USPS", TRACKED);
      const d = deps(
        order({
          shipments: [
            refused(),
            refused({
              id: "s2",
              idempotencyKey: `${KEY}:2`,
              status: "exception",
            }),
          ],
        }),
        { shippo },
      );

      expect(await shipOrder("o1", d, { retryOf: "s1" })).toEqual({
        skipped: "the booking needs a person: see the shipment on the order",
      });
      expect(writes(d, "ClaimShipment")).toEqual([]);
    });

    it("leaves a newer canceled attempt to the request that names it", async () => {
      const shippo = fakeProvider("USPS", TRACKED);
      const d = deps(
        order({
          shipments: [
            refused(),
            refused({ id: "s2", idempotencyKey: `${KEY}:2` }),
          ],
        }),
        { shippo },
      );

      expect(await shipOrder("o1", d, { retryOf: "s1" })).toEqual({
        skipped: "the last booking was canceled",
      });
      expect(writes(d, "ClaimShipment")).toEqual([]);
    });

    it("buys no label when the order was shipped by hand after the refusal", async () => {
      const shippo = fakeProvider("USPS", TRACKED);
      const d = deps(
        order({
          shipments: [
            refused(),
            claimed([], {
              id: "m1",
              idempotencyKey: null,
              status: "shipped",
              trackingNumber: "HAND1",
            }),
          ],
        }),
        { shippo },
      );

      expect(await shipOrder("o1", d, { retryOf: "s1" })).toEqual({
        skipped: "shipment recorded by hand",
      });
      expect(writes(d, "ClaimShipment")).toEqual([]);
    });

    it("claims the next attempt under a new key and books it", async () => {
      const shippo = fakeProvider("USPS", TRACKED);
      const d = deps(order({ shipments: [refused()] }), { shippo });

      const outcome = await shipOrder("o1", d, { retryOf: "s1" });

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
      expect(shippo.book).toHaveBeenCalledWith(
        expect.objectContaining({ key: `${KEY}:2` }),
      );
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

      await shipOrder("o1", d, { retryOf: "s3" });

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

      expect(await shipOrder("o1", d, { retryOf: "s1" })).toEqual({
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

      expect(await shipOrder("o1", d, { retryOf: "s1" })).toEqual({
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

      expect(await shipOrder("o1", d, { retryOf: "s1" })).toEqual({
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
    expect(shippo.book).toHaveBeenCalledWith(
      expect.objectContaining({ key: KEY }),
    );
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

describe("tracking the parcel after the label", () => {
  it("registers the tracking number with the carrier token and the attempt key", async () => {
    const shippo = fakeProvider("USPS", TRACKED);
    const d = deps(order(), { shippo });

    await shipOrder("o1", d);

    expect(shippo.track).toHaveBeenCalledWith({
      carrier: "usps",
      trackingNumber: TRACKED.trackingNumber,
      metadata: KEY,
    });
  });

  it("keeps the booking when the carrier will not take the tracking registration", async () => {
    const shippo = fakeProvider("USPS", TRACKED);
    shippo.track.mockRejectedValue(new Error("Shippo: 500 down"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const d = deps(order(), { shippo });

    expect(await shipOrder("o1", d)).toEqual({
      shipped: { ...TRACKED, carrier: "USPS" },
    });
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("registers nothing while the label has no tracking number yet", async () => {
    const shippo = fakeProvider("USPS", { ...TRACKED, trackingNumber: null });
    const d = deps(order(), { shippo });

    await shipOrder("o1", d);

    expect(shippo.track).not.toHaveBeenCalled();
    expect(
      writes(d, "UpdateShipment").map(
        (input) => (input as { status?: string }).status,
      ),
      "A label with no tracking number yet is not a bought label: the parcel stays pending.",
    ).toEqual([undefined]);
  });
});

describe("applyShippoEvent", () => {
  const TRACKING = TRACKED.trackingNumber!;
  const READ_AT = "2026-10-19T10:58:57.987Z";
  const tracked = (overrides: Record<string, unknown> = {}) =>
    claimed([{ note: "USPS shipment 9001" }], {
      trackingNumber: TRACKING,
      updatedAt: READ_AT,
      ...overrides,
    });
  const status = (
    value: Extract<ShippoEvent, { kind: "tracking" }>["status"],
    details: string | null = "Arrived at USPS facility",
  ): ShippoEvent => ({
    kind: "tracking",
    key: KEY,
    trackingNumber: TRACKING,
    status: value,
    details,
  });
  const label = (reference = "tx9"): ShippoEvent => ({
    kind: "label",
    key: KEY,
    reference,
    trackingNumber: TRACKING,
    trackingUrl: TRACKED.trackingUrl,
    labelUrl: TRACKED.labelUrl,
  });
  const run = (shipments: unknown[], event: ShippoEvent) => {
    const shippo = fakeProvider("USPS", TRACKED);
    const d = deps(order({ shipments }), { shippo });
    return { d, shippo, outcome: applyShippoEvent(event, d) };
  };

  it("records the carrier status and its details on the parcel", async () => {
    const { d, outcome } = run([tracked()], status("in_transit"));

    expect(await outcome).toEqual({ applied: "in_transit" });
    expect(writes(d, "UpdateShipment")).toEqual([
      {
        orderId: "o1",
        shipmentId: "s1",
        expectedUpdatedAt: READ_AT,
        status: "in_transit",
        note: "Arrived at USPS facility",
      },
    ]);
    expect(
      d.calls.mock.calls[0]![0],
      "The read must fetch the parcel's updatedAt, or every write goes out without a precondition.",
    ).toMatch(/shipments \{[^}]*\bupdatedAt\b/);
  });

  it("writes nothing when the status did not change", async () => {
    const { d, outcome } = run([tracked({ status: "in_transit" })], status("in_transit"));

    expect(await outcome).toEqual({ skipped: "the status is unchanged" });
    expect(writes(d, "UpdateShipment")).toEqual([]);
  });

  it.each([
    ["in_transit", "pending"],
    ["in_transit", "label_purchased"],
    ["out_for_delivery", "in_transit"],
    ["delivered", "in_transit"],
    ["delivered", "exception"],
    ["exception", "pending"],
  ] as const)("does not move a %s parcel back to %s", async (from, to) => {
    const { d, outcome } = run([tracked({ status: from })], status(to));

    expect(await outcome).toEqual({ skipped: `the parcel is already ${from}` });
    expect(writes(d, "UpdateShipment")).toEqual([]);
  });

  it.each([
    ["delivered", "returned_to_sender"],
    ["label_purchased", "in_transit"],
    ["in_transit", "exception"],
    ["exception", "in_transit"],
    ["pending", "delivered"],
  ] as const)("moves a %s parcel on to %s", async (from, to) => {
    const { outcome } = run([tracked({ status: from })], status(to));

    expect(await outcome).toEqual({ applied: to });
  });

  it("ignores a status for another tracking number", async () => {
    const { d, outcome } = run([tracked({ trackingNumber: "OTHER" })], status("delivered"));

    expect(await outcome).toEqual({
      skipped: "the tracking number is not this parcel's",
    });
    expect(writes(d, "UpdateShipment")).toEqual([]);
  });

  it("ignores a status the carrier could not name", async () => {
    const { d, outcome } = run([tracked()], status(null));

    expect(await outcome).toEqual({ skipped: "the carrier status is unknown" });
    expect(writes(d, "UpdateShipment")).toEqual([]);
  });

  it("leaves a canceled parcel alone", async () => {
    const { d, outcome } = run([tracked({ status: "canceled" })], status("delivered"));

    expect(await outcome).toEqual({ skipped: "the parcel was canceled" });
    expect(writes(d, "UpdateShipment")).toEqual([]);
  });

  it("does not ask cmssy about a key this app did not make", async () => {
    const { d, outcome } = run([tracked()], {
      ...status("delivered"),
      key: "Order 42",
    });

    expect(await outcome).toEqual({ skipped: "not a parcel this app booked" });
    expect(d.calls).not.toHaveBeenCalled();
  });

  it("skips a key no parcel on the order holds", async () => {
    const { d, outcome } = run([tracked({ idempotencyKey: `${KEY}:2` })], status("delivered"));

    expect(await outcome).toEqual({ skipped: "no parcel holds this key" });
    expect(writes(d, "UpdateShipment")).toEqual([]);
  });

  it("records a label whose booking answer was lost, and starts tracking it", async () => {
    const unknown = claimed(
      [{ note: claimNote("USPS", TOKEN) }, { note: "USPS booking outcome unknown" }],
      { status: "exception" },
    );
    const { d, shippo, outcome } = run(
      [{ ...unknown, updatedAt: READ_AT }],
      label(),
    );

    expect(await outcome).toEqual({ applied: "label recorded" });
    expect(writes(d, "UpdateShipment")).toEqual([
      {
        orderId: "o1",
        shipmentId: "s1",
        expectedUpdatedAt: READ_AT,
        trackingNumber: TRACKING,
        trackingUrl: TRACKED.trackingUrl,
        labelUrl: TRACKED.labelUrl,
        status: "label_purchased",
        note: "USPS shipment tx9",
      },
    ]);
    expect(shippo.track).toHaveBeenCalledWith({
      carrier: "usps",
      trackingNumber: TRACKING,
      metadata: KEY,
    });
  });

  it("leaves a label the booking already recorded", async () => {
    const { d, outcome } = run([tracked()], label());

    expect(await outcome).toEqual({ skipped: "the label is already recorded" });
    expect(writes(d, "UpdateShipment")).toEqual([]);
  });

  it("flags a label bought for a canceled attempt so a person refunds it", async () => {
    const { d, outcome } = run(
      [claimed([{ note: "Label requested again" }], { status: "canceled" })],
      label("tx7"),
    );

    expect(await outcome).toEqual({
      applied: "extra label flagged for a refund",
    });
    expect(writes(d, "UpdateShipment")).toEqual([
      { orderId: "o1", shipmentId: "s1", note: refundNote("tx7") },
    ]);
  });

  it("flags that extra label once", async () => {
    const { d, outcome } = run(
      [claimed([{ note: refundNote("tx7") }], { status: "canceled" })],
      label("tx7"),
    );

    expect(await outcome).toEqual({
      skipped: "the extra label is already flagged",
    });
    expect(writes(d, "UpdateShipment")).toEqual([]);
  });

  it.each([
    ["shippo:o1:USPS", "o1"],
    ["shippo:o1:DHL Express:2", "o1"],
    ["Order 42", null],
    ["other:o1:USPS", null],
    ["shippo:", null],
  ])("reads the order of %s as %s", (key, orderId) => {
    expect(orderIdFromKey(key)).toBe(orderId);
  });
});

describe("a parcel that changed between the read and the write", () => {
  it("throws on cmssy's VERSION_CONFLICT so the webhook answers 500 and Shippo sends it again", async () => {
    const d = deps(
      order({
        shipments: [
          claimed([{ note: "USPS shipment 9001" }], {
            trackingNumber: TRACKED.trackingNumber,
            updatedAt: "2026-10-19T10:58:57.987Z",
          }),
        ],
      }),
      { shippo: fakeProvider("USPS", TRACKED) },
      {
        mutationErrors: [
          {
            message: "Shipment changed since it was read",
            extensions: { code: "VERSION_CONFLICT" },
          },
        ],
      },
    );

    await expect(
      applyShippoEvent(
        {
          kind: "tracking",
          key: KEY,
          trackingNumber: TRACKED.trackingNumber!,
          status: "delivered",
          details: null,
        },
        d,
      ),
    ).rejects.toThrow("Shipment changed since it was read");
  });
});
