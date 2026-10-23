import { describe, expect, it } from "vitest";
import { reorderLines } from "./reorder-lines";

describe("reorderLines", () => {
  it("adds each ordered SKU once, summing a SKU split over several lines", () => {
    expect(
      reorderLines([
        { sku: "BRG-6204", quantity: 10 },
        { sku: "HYD-H2", quantity: 2 },
        { sku: "BRG-6204", quantity: 5 },
      ]),
    ).toEqual([
      { sku: "BRG-6204", quantity: 15 },
      { sku: "HYD-H2", quantity: 2 },
    ]);
  });

  it("skips a line with no SKU, since it cannot be looked up in the catalog again", () => {
    expect(
      reorderLines([
        { sku: null, quantity: 1 },
        { sku: "  ", quantity: 3 },
        { sku: "PNU-1", quantity: 0 },
        { sku: " PNU-2 ", quantity: 1 },
      ]),
    ).toEqual([{ sku: "PNU-2", quantity: 1 }]);
  });
});
