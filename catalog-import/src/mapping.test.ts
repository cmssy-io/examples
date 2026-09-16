import { describe, expect, it } from "vitest";
import {
  MODELS,
  customFields,
  ownedKeys,
  productData,
  recordPatch,
  stockGroupIds,
  type StockItemRow,
} from "./mapping.js";

const row: StockItemRow = {
  StockItemID: 7,
  StockItemName: "USB food flash drive - pizza slice",
  SupplierID: 12,
  ColorName: null,
  Size: null,
  Brand: "Northwind",
  Barcode: null,
  UnitPrice: 32,
  RecommendedRetailPrice: 47.84,
  TaxRate: 15,
  LeadTimeDays: 14,
  QuantityPerOuter: 1,
  IsChillerStock: false,
  TypicalWeightPerUnit: 0.05,
  MarketingComments: null,
  CustomFields: '{ "CountryOfManufacture": "Japan", "Tags": ["16GB","USB Powered"], "Novelty": true }',
  StockGroupIDs: "9,2",
};

describe("productData", () => {
  it("maps a stock item and drops the columns the source left empty", () => {
    expect(productData(row, "sup-1", ["g-2", "g-9"])).toEqual({
      sku: "WWI-7",
      wwiId: 7,
      name: "USB food flash drive - pizza slice",
      price: 32,
      recommendedRetailPrice: 47.84,
      taxRate: 15,
      brand: "Northwind",
      leadTimeDays: 14,
      unitsPerOuter: 1,
      chilled: false,
      weightKg: 0.05,
      countryOfManufacture: "Japan",
      tags: ["16GB", "USB Powered"],
      supplier: "sup-1",
      groups: ["g-2", "g-9"],
    });
  });

  it("leaves out relations it could not resolve", () => {
    const data = productData(row, undefined, []);
    expect(data).not.toHaveProperty("supplier");
    expect(data).not.toHaveProperty("groups");
  });
});

describe("customFields", () => {
  it("reports the keys it has no field for instead of dropping them silently", () => {
    expect(customFields(row.CustomFields).unmapped).toEqual(["Novelty"]);
  });

  it("omits an empty tag list", () => {
    expect(customFields('{ "Tags": [] }').mapped).toEqual({});
  });

  it("reads nothing from a missing column", () => {
    expect(customFields(null)).toEqual({ mapped: {}, unmapped: [] });
  });
});

describe("stockGroupIds", () => {
  it("reads the aggregated ids in a stable order", () => {
    expect(stockGroupIds(row)).toEqual([2, 9]);
    expect(stockGroupIds({ ...row, StockGroupIDs: null })).toEqual([]);
  });
});

describe("recordPatch", () => {
  const owned = ownedKeys(MODELS.products);

  it("sends only what changed", () => {
    expect(
      recordPatch({ name: "A", price: 1, tags: ["x"] }, { name: "A", price: 2, tags: ["x"] }, owned),
    ).toEqual({ price: 2 });
  });

  it("clears an owned field the source no longer has", () => {
    expect(recordPatch({ name: "A", range: "Adult" }, { name: "A" }, owned)).toEqual({
      range: null,
    });
  });

  it("leaves a field the integration does not own alone", () => {
    expect(recordPatch({ name: "A", seoTitle: "Kept" }, { name: "A" }, owned)).toEqual({});
  });

  it("treats a reordered list as a change", () => {
    expect(recordPatch({ tags: ["a", "b"] }, { tags: ["b", "a"] }, owned)).toEqual({
      tags: ["b", "a"],
    });
  });
});
