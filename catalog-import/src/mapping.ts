export interface StockGroupRow {
  StockGroupID: number;
  StockGroupName: string;
}

export interface SupplierRow {
  SupplierID: number;
  SupplierName: string;
  SupplierCategoryName: string;
  WebsiteURL: string | null;
}

export interface StockItemRow {
  StockItemID: number;
  StockItemName: string;
  SupplierID: number;
  ColorName: string | null;
  Size: string | null;
  Brand: string | null;
  Barcode: string | null;
  UnitPrice: number;
  RecommendedRetailPrice: number | null;
  TaxRate: number;
  LeadTimeDays: number;
  QuantityPerOuter: number;
  IsChillerStock: boolean;
  TypicalWeightPerUnit: number;
  MarketingComments: string | null;
  CustomFields: string | null;
  StockGroupIDs: string | null;
}

export type RecordData = Record<string, unknown>;

export const MODELS = {
  groups: {
    name: "WWI stock group",
    slug: "wwi-stock-group",
    displayField: "name",
    fields: [
      { key: "wwiId", label: "WWI id", type: "number", required: true },
      { key: "name", label: "Name", type: "text", required: true },
    ],
  },
  suppliers: {
    name: "WWI supplier",
    slug: "wwi-supplier",
    displayField: "name",
    fields: [
      { key: "wwiId", label: "WWI id", type: "number", required: true },
      { key: "name", label: "Name", type: "text", required: true },
      { key: "category", label: "Category", type: "text" },
      { key: "website", label: "Website", type: "url" },
    ],
  },
  products: {
    name: "WWI product",
    slug: "wwi-product",
    displayField: "name",
    product: { enabled: true, skuField: "sku", priceField: "price" },
    fields: [
      { key: "sku", label: "SKU", type: "text", required: true },
      { key: "wwiId", label: "WWI id", type: "number", required: true },
      { key: "name", label: "Name", type: "text", required: true },
      { key: "price", label: "Price", type: "number", required: true },
      { key: "recommendedRetailPrice", label: "Recommended retail price", type: "number" },
      { key: "taxRate", label: "Tax rate", type: "number" },
      { key: "brand", label: "Brand", type: "text" },
      { key: "color", label: "Color", type: "text" },
      { key: "size", label: "Size", type: "text" },
      { key: "barcode", label: "Barcode", type: "text" },
      { key: "leadTimeDays", label: "Lead time (days)", type: "number" },
      { key: "unitsPerOuter", label: "Units per outer", type: "number" },
      { key: "chilled", label: "Chilled", type: "boolean" },
      { key: "weightKg", label: "Weight (kg)", type: "number" },
      { key: "marketingComments", label: "Marketing comments", type: "textarea" },
      { key: "countryOfManufacture", label: "Country of manufacture", type: "text" },
      { key: "tags", label: "Tags", type: "list", itemType: "text" },
      { key: "range", label: "Range", type: "text" },
      { key: "minimumAge", label: "Minimum age", type: "text" },
      { key: "shelfLife", label: "Shelf life", type: "text" },
      {
        key: "supplier",
        label: "Supplier",
        type: "relation",
        relationTo: "model:wwi-supplier",
        relationType: "hasOne",
      },
      {
        key: "groups",
        label: "Stock groups",
        type: "relation",
        relationTo: "model:wwi-stock-group",
        relationType: "hasMany",
      },
    ],
  },
} as const;

const CUSTOM_FIELD_KEYS: Record<string, string> = {
  CountryOfManufacture: "countryOfManufacture",
  Tags: "tags",
  Range: "range",
  MinimumAge: "minimumAge",
  ShelfLife: "shelfLife",
};

export function groupData(row: StockGroupRow): RecordData {
  return { wwiId: row.StockGroupID, name: row.StockGroupName };
}

export function supplierData(row: SupplierRow): RecordData {
  return compact({
    wwiId: row.SupplierID,
    name: row.SupplierName,
    category: row.SupplierCategoryName,
    website: row.WebsiteURL,
  });
}

export function productSku(stockItemId: number): string {
  return `WWI-${stockItemId}`;
}

export function customFields(raw: string | null): {
  mapped: RecordData;
  unmapped: string[];
} {
  const mapped: RecordData = {};
  const unmapped: string[] = [];
  if (!raw) return { mapped, unmapped };
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  for (const [key, value] of Object.entries(parsed)) {
    const target = CUSTOM_FIELD_KEYS[key];
    if (!target) {
      unmapped.push(key);
      continue;
    }
    if (target === "tags") {
      if (Array.isArray(value) && value.length > 0) mapped.tags = value.map(String);
      continue;
    }
    mapped[target] = String(value);
  }
  return { mapped, unmapped };
}

export function productData(
  row: StockItemRow,
  supplierId: string | undefined,
  groupIds: string[],
): RecordData {
  return compact({
    sku: productSku(row.StockItemID),
    wwiId: row.StockItemID,
    name: row.StockItemName,
    price: Number(row.UnitPrice),
    recommendedRetailPrice:
      row.RecommendedRetailPrice === null ? null : Number(row.RecommendedRetailPrice),
    taxRate: Number(row.TaxRate),
    brand: row.Brand,
    color: row.ColorName,
    size: row.Size,
    barcode: row.Barcode,
    leadTimeDays: row.LeadTimeDays,
    unitsPerOuter: row.QuantityPerOuter,
    chilled: row.IsChillerStock,
    weightKg: Number(row.TypicalWeightPerUnit),
    marketingComments: row.MarketingComments,
    ...customFields(row.CustomFields).mapped,
    supplier: supplierId,
    groups: groupIds.length > 0 ? groupIds : null,
  });
}

export function stockGroupIds(row: StockItemRow): number[] {
  return (row.StockGroupIDs ?? "")
    .split(",")
    .filter((id) => id !== "")
    .map(Number)
    .sort((a, b) => a - b);
}

export function compact(data: RecordData): RecordData {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== null && value !== undefined),
  );
}

export function recordPatch(
  stored: RecordData,
  next: RecordData,
  owned: readonly string[],
): RecordData {
  const patch: RecordData = {};
  for (const [key, value] of Object.entries(next)) {
    if (!sameValue(stored[key], value)) patch[key] = value;
  }
  for (const key of owned) {
    if (key in stored && !(key in next)) patch[key] = null;
  }
  return patch;
}

export function ownedKeys(model: { fields: readonly { key: string }[] }): string[] {
  return model.fields.map((field) => field.key);
}

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
