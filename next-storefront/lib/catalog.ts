import { createCmssyClient, mediaAlt, mediaUrl, mediaUrls } from "@cmssy/core";
import { cmssy } from "@/cmssy.config";
import {
  ProductDocument,
  PublicModelProductsDocument,
  PublicModelRecordsDocument,
} from "@/graphql/generated/graphql";
// Generated from the workspace's models by `pnpm types`.
import type {
  CategoryData,
  CmssyLocalized,
  CmssyMedia,
  ProductData,
} from "@/graphql/models";
import { localizedText } from "@/lib/localized";
import { ttlCache } from "@/lib/ttl-cache";
import {
  fetchProductRoles,
  fetchTaxRates,
  type ProductRoles,
  type SiteTaxRates,
} from "@/services/site";

const client = createCmssyClient(cmssy);

export { PRODUCT_MODEL, CATEGORY_MODEL } from "./catalog-models";
import { PRODUCT_MODEL, CATEGORY_MODEL } from "./catalog-models";
import { retryMode } from "@/lib/cmssy/retry-mode";
export const PAGE_SIZE = 12;
const API_PAGE_SIZE = 50;
const SCAN_TTL_MS = 60_000;

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

export type ProductMedia = { url: string; alt: string | null };

export type VariantOption = { name: string; value: string };

export type ProductVariant = {
  id: string;
  sku: string | null;
  price: number;
  inventory: number | null;
  selectedOptions: VariantOption[];
  tiers: PriceTier[];
};

type VariantRow = Pick<ProductVariant, "id"> | ProductVariant;

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
  documents: ProductMedia[];
  video: ProductMedia | null;
  hasVariants: boolean;
  variants: ProductVariant[];
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

function toMedia(media: CmssyMedia | null | undefined): ProductMedia | null {
  const url = mediaUrl(media);
  return url ? { url, alt: blank(mediaAlt(media)) } : null;
}

function byMinQty(a: PriceTier, b: PriceTier): number {
  return a.minQty - b.minQty;
}

function toVariant(variant: ProductVariant): ProductVariant {
  return {
    id: variant.id,
    sku: blank(variant.sku),
    price: variant.price,
    inventory: variant.inventory ?? null,
    selectedOptions: variant.selectedOptions.map(({ name, value }) => ({
      name,
      value,
    })),
    tiers: [...variant.tiers].sort(byMinQty),
  };
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
  const data = await client.queryScoped(
    PublicModelRecordsDocument,
    {
      modelSlug: CATEGORY_MODEL,
      locale: locale ?? null,
      limit: API_PAGE_SIZE,
      offset: 0,
      sort: "sortOrder_asc",
    },
    { retry: retryMode() },
  );

  const items = data?.public?.model?.records?.items ?? [];
  return items.map(toCategory).sort((a, b) => {
    const left = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const right = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
    return left - right;
  });
}

export function resolveTaxRate(
  value: unknown,
  tax: SiteTaxRates | null,
): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return tax?.rates.get(value) ?? null;
  if (value == null && tax?.defaultTaxRateId) {
    return tax.rates.get(tax.defaultTaxRateId) ?? null;
  }
  return null;
}

function toProduct(
  item: {
    id: string;
    data: unknown;
    priceTiers?: PriceTier[];
    variants?: VariantRow[];
  },
  tax: SiteTaxRates | null,
  roles: ProductRoles | null,
): Product {
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
    taxRate: resolveTaxRate(
      (data as unknown as Record<string, unknown>)[roles?.taxRate ?? "taxRate"],
      tax,
    ),
    unit: data.unit ?? null,
    packaging: blank(data.packaging),
    inventory: data.inventory ?? 0,
    specs: data.specs ?? null,
    datasheetUrl: blank(data.datasheetUrl),
    tiers: [...(item.priceTiers ?? [])].sort(byMinQty),
    image: mediaUrl(data.image),
    gallery: mediaUrls(data.gallery),
    documents: (data.documents ?? []).flatMap((media) => toMedia(media) ?? []),
    video: toMedia(data.video),
    hasVariants: (item.variants ?? []).length > 0,
    variants: (item.variants ?? []).flatMap((row) =>
      "selectedOptions" in row ? [toVariant(row)] : [],
    ),
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

const API_SORTS: Record<string, string> = {
  price: "price_asc",
  "-price": "price_desc",
};

function apiSort(sort: string | undefined): string | null {
  return API_SORTS[sort ?? ""] ?? null;
}

export function sortProducts(
  items: Product[],
  sort: string | undefined,
): Product[] {
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
  variants?: VariantRow[];
};

async function queryProducts(vars: {
  filter?: Record<string, unknown>;
  stockState?: StockState;
  locale?: string;
  limit?: number;
  offset?: number;
  sort?: string;
}): Promise<{ items: ProductRecord[]; total: number; hasMore: boolean }> {
  const data = await client.queryScoped(
    PublicModelProductsDocument,
    {
      modelSlug: PRODUCT_MODEL,
      filter: vars.filter ?? {},
      stockState: vars.stockState ?? null,
      locale: vars.locale ?? null,
      limit: vars.limit ?? API_PAGE_SIZE,
      offset: vars.offset ?? 0,
      sort: vars.sort ?? null,
    },
    { retry: retryMode() },
  );
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
  const [tax, roles] = await Promise.all([
    fetchTaxRates(),
    fetchProductRoles(PRODUCT_MODEL),
  ]);
  let offset = 0;
  for (let guard = 0; guard < 100; guard += 1) {
    const result = await queryProducts({
      filter,
      stockState,
      locale,
      limit: API_PAGE_SIZE,
      offset,
    });
    items.push(...result.items.map((item) => toProduct(item, tax, roles)));
    if (!result.hasMore || result.items.length === 0) break;
    offset += result.items.length;
  }
  return items;
}

const scanCache = ttlCache<Product[]>(SCAN_TTL_MS);

function scanProducts(
  filter: Record<string, unknown>,
  stockState: StockState | undefined,
  locale: string | undefined,
): Promise<Product[]> {
  const key = JSON.stringify([filter, stockState ?? "", locale ?? ""]);
  return scanCache(key, () => fetchAllProducts(filter, stockState, locale));
}

function productFilter(query: {
  categoryId?: string;
  brand?: string;
}): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  if (query.categoryId) filter.category = query.categoryId;
  if (query.brand) filter.brand = query.brand;
  return filter;
}

function matchesSearch(product: Product, needle: string): boolean {
  return [product.title, product.sku, product.brand ?? ""]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

export async function loadProducts(query: ProductQuery): Promise<ProductPage> {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(Math.max(1, query.limit ?? PAGE_SIZE), API_PAGE_SIZE);
  const offset = (page - 1) * limit;
  const filter = productFilter(query);
  const needle = query.search?.trim().toLowerCase();
  const sort = apiSort(query.sort);

  if (needle || sort === null) {
    const all = await scanProducts(filter, query.stockState, query.locale);
    const sorted = sortProducts(
      needle ? all.filter((product) => matchesSearch(product, needle)) : all,
      query.sort,
    );
    const items = sorted.slice(offset, offset + limit);
    return {
      items,
      total: sorted.length,
      hasMore: offset + items.length < sorted.length,
    };
  }

  const [result, tax, roles] = await Promise.all([
    queryProducts({
      filter,
      stockState: query.stockState,
      locale: query.locale,
      limit,
      offset,
      sort,
    }),
    fetchTaxRates(),
    fetchProductRoles(PRODUCT_MODEL),
  ]);
  return {
    items: result.items.map((item) => toProduct(item, tax, roles)),
    total: result.total,
    hasMore: result.hasMore,
  };
}

export function loadAllProducts(locale?: string): Promise<Product[]> {
  return scanProducts({}, undefined, locale);
}

export async function loadProductSlugs(locale?: string): Promise<string[]> {
  const products = await loadAllProducts(locale);
  return products.map((product) => product.slug);
}

export async function loadProductBySlug(
  slug: string,
  locale?: string,
): Promise<Product | null> {
  const [data, tax, roles] = await Promise.all([
    client.queryScoped(
      ProductDocument,
      { modelSlug: PRODUCT_MODEL, filter: { slug }, locale: locale ?? null },
      { retry: retryMode() },
    ),
    fetchTaxRates(),
    fetchProductRoles(PRODUCT_MODEL),
  ]);
  const record = data?.public?.model?.records?.items[0];
  return record ? toProduct(record, tax, roles) : null;
}

export async function loadBrandFacets(
  categoryId?: string,
  locale?: string,
): Promise<Array<{ brand: string; count: number }>> {
  const all = await scanProducts(
    productFilter({ categoryId }),
    undefined,
    locale,
  );

  const counts = new Map<string, number>();
  for (const product of all) {
    if (!product.brand) continue;
    counts.set(product.brand, (counts.get(product.brand) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => a.brand.localeCompare(b.brand));
}

const STOCK_STATES: StockState[] = ["in", "low", "out"];
const stockFacetCache =
  ttlCache<Array<{ state: StockState; count: number }>>(SCAN_TTL_MS);

export function loadStockFacets(
  categoryId?: string,
  brand?: string,
  locale?: string,
): Promise<Array<{ state: StockState; count: number }>> {
  const filter = productFilter({ categoryId, brand });
  const key = JSON.stringify([filter, locale ?? ""]);
  return stockFacetCache(key, async () => {
    const counts = await Promise.all(
      STOCK_STATES.map((state) =>
        queryProducts({ filter, stockState: state, locale, limit: 1 }).then(
          (page) => ({ state, count: page.total }),
        ),
      ),
    );
    return counts.filter((facet) => facet.count > 0);
  });
}
