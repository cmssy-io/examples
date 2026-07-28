import { createCmssyClient } from "@cmssy/core";
import { cmssy } from "@/cmssy.config";
import {
  PublicModelProductsDocument,
  PublicModelRecordsDocument,
} from "@/graphql/generated/graphql";
// Generated from the workspace's models by `pnpm types`.
import type {
  CategoryData,
  CmssyLocalized,
  ProductData,
} from "@/graphql/models";
import { localizedText } from "@/lib/localized";

const client = createCmssyClient(cmssy);

export { PRODUCT_MODEL, CATEGORY_MODEL } from "./catalog-models";
import { PRODUCT_MODEL, CATEGORY_MODEL } from "./catalog-models";
export const PAGE_SIZE = 12;

export type Category = {
  id: string;
  name: string;
  slug: string;
  code: string | null;
  description: string | null;
  sortOrder: number | null;
};

/** The `specs` object as the `product` model declares it. */
export type ProductSpecs = NonNullable<ProductData["specs"]>;

export type PriceTier = { minQty: number; price: number };

export type Product = {
  id: string;
  title: string;
  slug: string;
  sku: string;
  brand: string | null;
  categoryId: string | null;
  description: string | null;
  price: number;
  taxRate: number | null;
  unit: string | null;
  packaging: string | null;
  inventory: number;
  specs: ProductSpecs | null;
  datasheetUrl: string | null;
  tiers: PriceTier[];
  image: string | null;
  gallery: string[];
};

type RecordRow = { id: string; data: unknown };

/**
 * These queries carry a locale, so the field usually arrives resolved - but the
 * delivery API answers with the whole map whenever it does not, and a record
 * missing this language falls back to whichever one it has.
 */
function text(value: CmssyLocalized | undefined, fallback = ""): string {
  return localizedText(value, { fallback });
}

function blank(value: string | null | undefined): string | null {
  return value?.trim() ? value : null;
}

function toCategory(row: RecordRow): Category {
  // The one cast in the file: `data` is a JSON scalar on the wire, and
  // `CategoryData` is generated from the model (pnpm types).
  const data = row.data as CategoryData;
  return {
    id: row.id,
    name: text(data.name, "Unnamed"),
    slug: data.slug || row.id,
    code: blank(data.code),
    description: blank(text(data.description)),
    sortOrder: data.sortOrder ?? null,
  };
}

export async function loadCategories(locale?: string): Promise<Category[]> {
  const data = await client.queryScoped(PublicModelRecordsDocument, {
    modelSlug: CATEGORY_MODEL,
    locale: locale ?? null,
    limit: 50,
    offset: 0,
    sort: "sortOrder",
  });

  const items = data?.public?.model?.records?.items ?? [];
  return items.map(toCategory).sort((a, b) => {
    const left = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const right = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
    return left - right;
  });
}

function toProduct(item: {
  id: string;
  data: unknown;
  priceTiers?: PriceTier[];
}): Product {

  const data = item.data as ProductData;

  return {
    id: item.id,
    title: text(data.title, "Untitled"),
    slug: data.slug || item.id,
    sku: data.sku ?? "",
    brand: blank(data.brand),
    // A relation stores the related record's id.
    categoryId: blank(data.category),
    description: blank(text(data.description)),
    // The model stores a net price in major units; the app works in cents.
    price: Math.round((data.price ?? 0) * 100),
    taxRate: data.taxRate ?? null,
    unit: data.unit ?? null,
    packaging: blank(data.packaging),
    inventory: data.inventory ?? 0,
    specs: data.specs ?? null,
    datasheetUrl: blank(data.datasheetUrl),
    tiers: [...(item.priceTiers ?? [])].sort((a, b) => a.minQty - b.minQty),
    image: blank(data.image),
    gallery: data.gallery ?? [],
  };
}

export type StockState = "in" | "low" | "out";

export type ProductQuery = {
  categoryId?: string;
  brand?: string;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
  stockState?: StockState;

  locale?: string;
};

export type ProductPage = {
  items: Product[];
  total: number;
  hasMore: boolean;
};

function sortProducts(items: Product[], sort: string | undefined): Product[] {
  const sorted = [...items];
  if (sort === "price") sorted.sort((a, b) => a.price - b.price);
  else if (sort === "-price") sorted.sort((a, b) => b.price - a.price);
  else sorted.sort((a, b) => a.title.localeCompare(b.title));
  return sorted;
}

type ProductRecord = {
  id: string;
  data: unknown;
  priceTiers?: PriceTier[];
};

async function queryProducts(vars: {
  filter?: Record<string, unknown>;
  stockState?: StockState;
  locale?: string;
  limit?: number;
  offset?: number;
  sort?: string;
}): Promise<{ items: ProductRecord[]; total: number; hasMore: boolean }> {
  const data = await client.queryScoped(PublicModelProductsDocument, {
    modelSlug: PRODUCT_MODEL,
    filter: vars.filter ?? {},
    stockState: vars.stockState ?? null,
    locale: vars.locale ?? null,
    limit: vars.limit ?? 50,
    offset: vars.offset ?? 0,
    sort: vars.sort ?? null,
  });
  const records = data?.public?.model?.records;
  return {
    items: records?.items ?? [],
    total: records?.total ?? 0,
    hasMore: records?.hasMore ?? false,
  };
}

async function fetchAllProducts(
  filter: Record<string, unknown>,
  stockState: StockState | undefined,
  locale: string | undefined,
): Promise<Product[]> {
  const items: Product[] = [];
  let offset = 0;
  for (let guard = 0; guard < 100; guard += 1) {
    const result = await queryProducts({
      filter,
      stockState,
      locale,
      limit: 50,
      offset,
    });
    items.push(...result.items.map(toProduct));
    if (!result.hasMore || result.items.length === 0) break;
    offset += result.items.length;
  }
  return items;
}

export async function loadProducts(query: ProductQuery): Promise<ProductPage> {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.max(1, query.limit ?? PAGE_SIZE);
  const filter: Record<string, unknown> = {};
  if (query.categoryId) filter.category = query.categoryId;
  if (query.brand) filter.brand = query.brand;

  const sorted = sortProducts(
    await fetchAllProducts(filter, query.stockState, query.locale),
    query.sort,
  );
  const total = sorted.length;
  const start = (page - 1) * limit;
  const items = sorted.slice(start, start + limit);

  return {
    items,
    total,
    hasMore: start + items.length < total,
  };
}

export async function loadProductBySlug(
  slug: string,
  locale?: string,
): Promise<Product | null> {
  const page = await queryProducts({ filter: { slug }, locale, limit: 1 });
  const record = page.items[0];
  return record ? toProduct(record) : null;
}

export async function loadBrandFacets(
  categoryId?: string,
  locale?: string,
): Promise<Array<{ brand: string; count: number }>> {
  const filter: Record<string, unknown> = {};
  if (categoryId) filter.category = categoryId;

  const all = await fetchAllProducts(filter, undefined, locale);

  const counts = new Map<string, number>();
  for (const product of all) {
    if (!product.brand) continue;
    counts.set(product.brand, (counts.get(product.brand) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => a.brand.localeCompare(b.brand));
}

export async function loadStockFacets(
  categoryId?: string,
  brand?: string,
  locale?: string,
): Promise<Array<{ state: StockState; count: number }>> {
  const filter: Record<string, unknown> = {};
  if (categoryId) filter.category = categoryId;
  if (brand) filter.brand = brand;

  const states: StockState[] = ["in", "low", "out"];
  const counts = await Promise.all(
    states.map((state) =>
      queryProducts({ filter, stockState: state, locale, limit: 1 }).then(
        (page) => ({ state, count: page.total }),
      ),
    ),
  );

  return counts.filter((facet) => facet.count > 0);
}
