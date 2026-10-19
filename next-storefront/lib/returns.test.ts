import { describe, expect, it } from "vitest";
import { returnableLines, type ReturnableOrder } from "./returns";

const ITEMS = [
  { id: "drill", name: "Drill", quantity: 3 },
  { id: "bit", name: "Bit", quantity: 1 },
];

function order(overrides: Partial<ReturnableOrder>): ReturnableOrder {
  return { state: "open", items: ITEMS, shipments: [], returns: [], ...overrides };
}

function parcel(
  status: ReturnableOrder["shipments"][number]["status"],
  quantity: number,
  itemId = "drill",
  trackingNumber: string | null = "TRK",
) {
  return { status, trackingNumber, items: [{ itemId, quantity }] };
}

describe("returnableLines", () => {
  it("offers only units in parcels that were handed over", () => {
    expect(
      returnableLines(
        order({
          shipments: [
            parcel("delivered", 1),
            parcel("in_transit", 1),
            parcel("pending", 1),
            parcel("label_purchased", 1, "bit"),
          ],
        }),
      ),
    ).toEqual([{ itemId: "drill", name: "Drill", returnable: 2 }]);
  });

  it("skips a parcel whose label was never bought", () => {
    expect(
      returnableLines(
        order({
          shipments: [parcel("exception", 2, "drill", null), parcel("exception", 1)],
        }),
      ),
    ).toEqual([{ itemId: "drill", name: "Drill", returnable: 1 }]);
  });

  it("subtracts units already in a standing return and gives back void ones", () => {
    expect(
      returnableLines(
        order({
          shipments: [parcel("delivered", 3), parcel("delivered", 1, "bit")],
          returns: [
            { status: "requested", lines: [{ itemId: "drill", quantity: 2 }] },
            { status: "rejected", lines: [{ itemId: "drill", quantity: 1 }] },
            { status: "completed", lines: [{ itemId: "bit", quantity: 1 }] },
          ],
        }),
      ),
    ).toEqual([{ itemId: "drill", name: "Drill", returnable: 1 }]);
  });

  it("never offers more than the line was ordered for", () => {
    expect(
      returnableLines(
        order({
          shipments: [parcel("delivered", 1, "bit"), parcel("delivered", 1, "bit")],
        }),
      ),
    ).toEqual([{ itemId: "bit", name: "Bit", returnable: 1 }]);
  });

  it("offers nothing on a canceled order", () => {
    expect(
      returnableLines(order({ state: "canceled", shipments: [parcel("delivered", 3)] })),
    ).toEqual([]);
  });
});
