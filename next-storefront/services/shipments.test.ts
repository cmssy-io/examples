import { describe, expect, it, vi } from "vitest";
import type { BookedShipment, ShippingProvider } from "@/lib/shipping";
import type { AdminResult } from "./admin";
import { shipOrder, type ShipDeps } from "./shipments";

vi.mock("@/cmssy.config", () => ({ cmssy: {} }));

const ADDRESS = {
  name: "Jan Kowalski",
  company: null,
  line1: "ul. Przemysłowa 12",
  line2: null,
  postalCode: "00-001",
  city: "Warszawa",
  country: "PL",
  phone: "500600700",
};

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: "o1",
    orderNumber: 42,
    customerEmail: "buyer@example.com",
    paymentStatus: "paid",
    shippingMethod: { id: "courier24" },
    shippingAddress: ADDRESS,
    shipments: [],
    ...overrides,
  };
}

function fakeProvider(
  carrier: string,
  booked: BookedShipment,
  resumed: BookedShipment = booked,
): ShippingProvider & {
  book: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
} {
  return {
    carrier,
    book: vi.fn(async () => booked),
    resume: vi.fn(async () => resumed),
  };
}

function deps(
  current: unknown,
  providers: ShipDeps["providers"],
  mutationErrors: AdminResult<unknown>["errors"] = [],
) {
  const request = vi.fn(
    async (
      query: string,
      _variables: Record<string, unknown>,
    ): Promise<AdminResult<unknown>> =>
      query.includes("OrderForShipping")
        ? { data: { order: { get: current } }, errors: [] }
        : { data: {}, errors: mutationErrors },
  );
  return { request: request as unknown as ShipDeps["request"], providers, calls: request };
}

const TRACKED: BookedShipment = {
  reference: "9001",
  trackingNumber: "520000011395200025754311",
  trackingUrl: "https://inpost.pl/sledzenie-przesylek?number=520000011395200025754311",
};

describe("shipOrder", () => {
  it("books the carrier the method routes to and records the parcel on the order", async () => {
    const inpost = fakeProvider("InPost", TRACKED);
    const bring = fakeProvider("Bring", TRACKED);
    const d = deps(order(), { inpost, bring });

    const outcome = await shipOrder("o1", d);

    expect(outcome).toEqual({ shipped: { ...TRACKED, carrier: "InPost" } });
    expect(bring.book).not.toHaveBeenCalled();
    expect(inpost.book).toHaveBeenCalledWith({
      orderId: "o1",
      orderNumber: 42,
      email: "buyer@example.com",
      address: ADDRESS,
      parcel: { weightKg: 5, lengthCm: 40, widthCm: 30, heightCm: 20 },
    });
    const [query, variables] = d.calls.mock.calls[1]!;
    expect(query).toContain("createShipment");
    expect(variables).toEqual({
      input: {
        orderId: "o1",
        carrier: "InPost",
        trackingNumber: TRACKED.trackingNumber,
        trackingUrl: TRACKED.trackingUrl,
        note: "InPost shipment 9001",
      },
    });
  });

  it("routes a Norwegian home delivery to Bring", async () => {
    const inpost = fakeProvider("InPost", TRACKED);
    const bring = fakeProvider("Bring", { reference: "7043", trackingNumber: "7043", trackingUrl: null });
    const d = deps(
      order({
        shippingMethod: { id: "bring-home" },
        shippingAddress: { ...ADDRESS, country: "NO" },
      }),
      { inpost, bring },
    );

    const outcome = await shipOrder("o1", d);

    expect(outcome).toMatchObject({ shipped: { carrier: "Bring", trackingNumber: "7043" } });
    expect(inpost.book).not.toHaveBeenCalled();
  });

  it.each([
    ["an unpaid order", order({ paymentStatus: "unpaid" }), "order is not paid"],
    ["an order without an address", order({ shippingAddress: null }), "order has no shipping method or address"],
    ["a pallet", order({ shippingMethod: { id: "pallet" } }), "no provider for this shipping method"],
    ["a courier abroad", order({ shippingAddress: { ...ADDRESS, country: "DE" } }), "no provider for this shipping method"],
  ])("leaves %s alone", async (_label, current, skipped) => {
    const inpost = fakeProvider("InPost", TRACKED);
    const d = deps(current, { inpost });

    expect(await shipOrder("o1", d)).toEqual({ skipped });
    expect(inpost.book).not.toHaveBeenCalled();
    expect(d.calls).toHaveBeenCalledTimes(1);
  });

  it("says so when the routed carrier has no credentials", async () => {
    const d = deps(order(), { inpost: null });

    expect(await shipOrder("o1", d)).toEqual({ skipped: "inpost is not configured" });
  });

  it("does not book twice when the parcel already has a tracking number", async () => {
    const inpost = fakeProvider("InPost", TRACKED);
    const d = deps(
      order({
        shipments: [{ id: "s1", carrier: "InPost", trackingNumber: "X", events: [] }],
      }),
      { inpost },
    );

    expect(await shipOrder("o1", d)).toEqual({ skipped: "already shipped" });
    expect(inpost.book).not.toHaveBeenCalled();
    expect(inpost.resume).not.toHaveBeenCalled();
  });

  it("does not touch a parcel a person recorded by hand", async () => {
    const inpost = fakeProvider("InPost", TRACKED);
    const d = deps(
      order({
        shipments: [
          { id: "s1", carrier: "InPost", trackingNumber: null, events: [{ note: "dropped at the locker" }] },
        ],
      }),
      { inpost },
    );

    expect(await shipOrder("o1", d)).toEqual({ skipped: "shipment recorded by hand" });
    expect(inpost.book).not.toHaveBeenCalled();
  });

  it("resumes a booked parcel instead of booking a second one, and fills in its tracking", async () => {
    const inpost = fakeProvider("InPost", TRACKED);
    const d = deps(
      order({
        shipments: [
          { id: "s1", carrier: "InPost", trackingNumber: null, events: [{ note: "InPost shipment 9001" }] },
        ],
      }),
      { inpost },
    );

    const outcome = await shipOrder("o1", d);

    expect(outcome).toEqual({ shipped: { ...TRACKED, carrier: "InPost" } });
    expect(inpost.book).not.toHaveBeenCalled();
    expect(inpost.resume).toHaveBeenCalledWith("9001");
    const [query, variables] = d.calls.mock.calls[1]!;
    expect(query).toContain("updateShipment");
    expect(variables).toEqual({
      input: {
        orderId: "o1",
        shipmentId: "s1",
        trackingNumber: TRACKED.trackingNumber,
        trackingUrl: TRACKED.trackingUrl,
      },
    });
  });

  it("records a parcel still waiting for its number and reports it pending", async () => {
    const inpost = fakeProvider("InPost", { reference: "9001", trackingNumber: null, trackingUrl: null });
    const d = deps(order(), { inpost });

    expect(await shipOrder("o1", d)).toEqual({
      pending: { carrier: "InPost", reference: "9001" },
    });
    expect(d.calls.mock.calls[1]![1]).toMatchObject({
      input: { note: "InPost shipment 9001", trackingNumber: null },
    });
  });

  it("reports pending again while the resumed parcel has no number, writing nothing", async () => {
    const inpost = fakeProvider("InPost", TRACKED, { reference: "9001", trackingNumber: null, trackingUrl: null });
    const d = deps(
      order({
        shipments: [
          { id: "s1", carrier: "InPost", trackingNumber: null, events: [{ note: "InPost shipment 9001" }] },
        ],
      }),
      { inpost },
    );

    expect(await shipOrder("o1", d)).toEqual({ pending: { carrier: "InPost", reference: "9001" } });
    expect(d.calls).toHaveBeenCalledTimes(1);
  });

  it("throws when cmssy refuses to record the parcel, so the delivery is retried", async () => {
    const inpost = fakeProvider("InPost", TRACKED);
    const d = deps(order(), { inpost }, [{ message: "boom", extensions: { code: "INTERNAL" } }]);

    await expect(shipOrder("o1", d)).rejects.toThrow("record the shipment - boom");
  });

  it("skips an order cmssy cannot find", async () => {
    const d = {
      providers: {},
      request: (async () => ({
        errors: [{ message: "Order not found", extensions: { code: "NOT_FOUND" } }],
      })) as unknown as ShipDeps["request"],
    };

    expect(await shipOrder("o1", d)).toEqual({ skipped: "Order not found" });
  });
});
