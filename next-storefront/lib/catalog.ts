import { createCmssyClient, mediaAlt, mediaUrl, mediaUrls } from "@cmssy/core";
import { cmssy } from "@/cmssy.config";
import {
  ProductDocument,
  ProductVariantPageDocument,
  PublicModelProductsDocument,
  PublicModelRecordsDocument,
} from "@/graphql/generated/graphql";
// Generated from the workspace's models by `pnpm types`.
import type {
  BrandData,
  CategoryData,
  CmssyLocalized,
  CmssyMedia,
  ProductData,
} from "@/graphql/models";
import { localizedText } from "@/lib/localized";
import { ttlCache } from "@/lib/ttl-cache";
import type { ProductPricing } from "@/lib/price-overlay";
import {
  fetchProductRoles,
  fetchShopSettings,
  type ProductRoles,
  type ShopSettings,
  type SiteTaxRates,
} from "@/services/site";

const client = createCmssyClient(cmssy);

export { PRODUCT_MODEL, CATEGORY_MODEL, BRAND_MODEL } from "./catalog-models";
import { PRODUCT_MODEL, CATEGORY_MODEL, BRAND_MODEL } from "./catalog-models";
import { previewSecret } from "@/lib/cmssy/preview-secret";
import { retryMode } from "@/lib/cmssy/retry-mode";
import { readAllVariants, variantStates } from "@/lib/variants";
export const PAGE_SIZE = 20;
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

export type Brand = {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  website: string | null;
  description: string | null;
  logo: string | null;
};

export type BrandRef = Pick<Brand, "id" | "name" | "slug">;

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

export type Product = {
  id: string;
  title: string;
  slug: string;
  sku: string;
  brand: BrandRef | null;
  categoryId: string | null;
  description: string | null;
  price: number;
  taxRate: number | null;
  unit: string | null;
  packaging: string | null;
  available: number | null;
  lowStockThreshold: number | null;
  specs: ProductSpecs | null;
  datasheetUrl: string | null;
  tiers: PriceTier[];
  image: string | null;
  gallery: string[];
  documents: ProductMedia[];
  video: ProductMedia | null;
  fromPrice: number;
  hasVariants: boolean;
  variantCount: number;
  variants: ProductVariant[];
  /** Set when a buyer's or a channel's price replaced the catalogue price. */
  pricing?: ProductPricing;
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

function toBrand(row: RecordRow): Brand {
  const data = row.data as BrandData;
  return {
    id: row.id,
    name: data.name || "Unnamed",
    slug: data.slug || row.id,
    country: blank(text(data.country)),
    website: blank(data.website),
    description: blank(text(data.description)),
    logo: mediaUrl(data.logo),
  };
}

async function fetchBrands(
  locale: string | undefined,
  secret?: string,
): Promise<Brand[]> {
  const brands: Brand[] = [];
  for (let guard = 0; guard < 100; guard += 1) {
    const data = await client.queryScoped(
      PublicModelRecordsDocument,
      {
        modelSlug: BRAND_MODEL,
        locale: locale ?? null,
        limit: API_PAGE_SIZE,
        offset: brands.length,
        sort: "name_asc",
        previewSecret: secret ?? null,
      },
      { retry: retryMode() },
    );
    const records = data?.public?.model?.records;
    const items = records?.items ?? [];
    brands.push(...items.map(toBrand));
    if (!records?.hasMore || items.length === 0) break;
  }
  return brands;
}

const brandsCache = ttlCache<Brand[]>(SCAN_TTL_MS);

export function loadBrands(locale?: string): Promise<Brand[]> {
  return brandsCache(locale ?? "", () => fetchBrands(locale));
}

function readBrands(
  locale: string | undefined,
  secret: string | undefined,
): Promise<Brand[]> {
  return secret ? fetchBrands(locale, secret) : loadBrands(locale);
}

async function brandRefs(locale: string | undefined, secret?: string) {
  const brands = await readBrands(locale, secret);
  return new Map<string, BrandRef>(
    brands.map(({ id, name, slug }) => [id, { id, name, slug }]),
  );
}

export async function loadBrandBySlug(
  slug: string,
  locale?: string,
): Promise<Brand | null> {
  const brands = await readBrands(locale, await previewSecret());
  return brands.find((brand) => brand.slug === slug) ?? null;
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

type ProductRecord = {
  id: string;
  data: unknown;
  priceTiers?: PriceTier[];
  variantCount: number;
  variantPriceRange: { min: number } | null;
  available: number | null;
  variants?: ProductVariant[];
};

function toProduct(
  item: ProductRecord,
  shop: ShopSettings,
  roles: ProductRoles | null,
  brands: ReadonlyMap<string, BrandRef>,
): Product {
  const data = item.data as ProductData;
  const brandId = blank(data.brand);
  const price = Math.round((data.price ?? 0) * 100);

  return {
    id: item.id,
    title: text(data.title, "Untitled"),
    slug: data.slug || item.id,
    sku: data.sku ?? "",
    // A relation stores the related record's id.
    brand: brandId ? (brands.get(brandId) ?? null) : null,
    categoryId: blank(data.category),
    description: blank(text(data.description)),
    // The model stores a net price in major units; the app works in cents.
    price,
    taxRate: resolveTaxRate(
      (data as unknown as Record<string, unknown>)[roles?.taxRate ?? "taxRate"],
      shop.tax,
    ),
    unit: data.unit ?? null,
    packaging: blank(data.packaging),
    available: item.available,
    lowStockThreshold: shop.lowStockThreshold,
    specs: data.specs ?? null,
    datasheetUrl: blank(data.datasheetUrl),
    tiers: [...(item.priceTiers ?? [])].sort(byMinQty),
    image: mediaUrl(data.image),
    gallery: mediaUrls(data.gallery),
    documents: (data.documents ?? []).flatMap((media) => toMedia(media) ?? []),
    video: toMedia(data.video),
    fromPrice: item.variantPriceRange?.min ?? price,
    hasVariants: item.variantCount > 0,
    variantCount: item.variantCount,
    variants: (item.variants ?? []).map(toVariant),
  };
}

export type StockState = "in" | "low" | "out";

export type ProductQuery = {
  categoryId?: string;
  brandId?: string;
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

export function sortProducts(
  items: Product[],
  sort: string | undefined,
): Product[] {
  const sorted = [...items];
  if (sort === "price") sorted.sort((a, b) => a.fromPrice - b.fromPrice);
  else if (sort === "-price") sorted.sort((a, b) => b.fromPrice - a.fromPrice);
  else sorted.sort((a, b) => a.title.localeCompare(b.title));
  return sorted;
}

async function queryProducts(vars: {
  filter?: Record<string, unknown>;
  stockState?: StockState;
  locale?: string;
  limit?: number;
  offset?: number;
  previewSecret?: string;
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
      previewSecret: vars.previewSecret ?? null,
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
  secret: string | undefined,
): Promise<Product[]> {
  const items: Product[] = [];
  const [shop, roles, brands] = await Promise.all([
    fetchShopSettings(),
    fetchProductRoles(PRODUCT_MODEL),
    brandRefs(locale, secret),
  ]);
  let offset = 0;
  for (let guard = 0; guard < 100; guard += 1) {
    const result = await queryProducts({
      filter,
      stockState,
      locale,
      limit: API_PAGE_SIZE,
      offset,
      previewSecret: secret,
    });
    items.push(
      ...result.items.map((item) => toProduct(item, shop, roles, brands)),
    );
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
  secret?: string,
): Promise<Product[]> {
  if (secret) return fetchAllProducts(filter, stockState, locale, secret);
  const key = JSON.stringify([filter, stockState ?? "", locale ?? ""]);
  return scanCache(key, () =>
    fetchAllProducts(filter, stockState, locale, undefined),
  );
}

export function productFilter(query: {
  categoryId?: string;
  brandId?: string;
}): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  if (query.categoryId) filter.category = query.categoryId;
  if (query.brandId) filter.brand = query.brandId;
  return filter;
}

function matchesSearch(product: Product, needle: string): boolean {
  return [product.title, product.sku, product.brand?.name ?? ""]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

// `reprice` lays a buyer's or a channel's prices over the scan before it is
// sorted, so a price sort follows the price the visitor sees. The scan itself
// stays the shared, channel-neutral catalogue.
export async function loadProducts(
  query: ProductQuery,
  reprice?: (products: Product[]) => Promise<Product[]>,
): Promise<ProductPage> {
  const needle = query.search?.trim().toLowerCase();
  const all = await scanProducts(
    productFilter(query),
    query.stockState,
    query.locale,
    await previewSecret(),
  );
  const matching = needle
    ? all.filter((product) => matchesSearch(product, needle))
    : all;
  return pageProducts(reprice ? await reprice(matching) : matching, query);
}

// Pages what the listing sells: a product the reprice step dropped (not sold
// on the channel) is gone before counting, so total and hasMore never count it.
export function pageProducts(
  products: Product[],
  query: Pick<ProductQuery, "page" | "limit" | "sort">,
): ProductPage {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.max(1, query.limit ?? PAGE_SIZE);
  const offset = (page - 1) * limit;
  const sorted = sortProducts(products, query.sort);
  const items = sorted.slice(offset, offset + limit);
  return {
    items,
    total: sorted.length,
    hasMore: offset + items.length < sorted.length,
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
  const secret = await previewSecret();
  const [data, shop, roles, brands] = await Promise.all([
    queryProduct(slug, locale, secret),
    fetchShopSettings(),
    fetchProductRoles(PRODUCT_MODEL),
    brandRefs(locale, secret),
  ]);
  const record = data?.public?.model?.records?.items[0];
  if (!record) return null;
  const read = await readAllVariants(record, async (offset) => {
    const next = await client.queryScoped(
      ProductVariantPageDocument,
      {
        modelSlug: PRODUCT_MODEL,
        filter: { slug },
        locale: locale ?? null,
        offset,
        previewSecret: secret ?? null,
      },
      { retry: retryMode() },
    );
    const item = next?.public?.model?.records?.items[0];
    if (!item) return null;
    return {
      id: item.id,
      variantCount: item.variantCount,
      states: variantStates(item),
      page: item.page,
      head: {
        available: item.available,
        variantPriceRange: item.variantPriceRange,
      },
    };
  });
  if (!read) return null;
  return toProduct(
    {
      ...record,
      ...read.head,
      variantCount: read.variants.length,
      variants: read.variants,
    },
    shop,
    roles,
    brands,
  );
}

function queryProduct(
  slug: string,
  locale: string | undefined,
  secret: string | undefined,
) {
  return client.queryScoped(
    ProductDocument,
    {
      modelSlug: PRODUCT_MODEL,
      filter: { slug },
      locale: locale ?? null,
      previewSecret: secret ?? null,
    },
    { retry: retryMode() },
  );
}

export async function loadBrandFacets(
  categoryId?: string,
  locale?: string,
): Promise<Array<{ brand: BrandRef; count: number }>> {
  const all = await scanProducts(
    productFilter({ categoryId }),
    undefined,
    locale,
    await previewSecret(),
  );

  const facets = new Map<string, { brand: BrandRef; count: number }>();
  for (const product of all) {
    if (!product.brand) continue;
    const facet = facets.get(product.brand.id);
    if (facet) facet.count += 1;
    else facets.set(product.brand.id, { brand: product.brand, count: 1 });
  }

  return [...facets.values()].sort((a, b) =>
    a.brand.name.localeCompare(b.brand.name),
  );
}

const STOCK_STATES: StockState[] = ["in", "low", "out"];
const stockFacetCache =
  ttlCache<Array<{ state: StockState; count: number }>>(SCAN_TTL_MS);

export async function loadStockFacets(
  categoryId?: string,
  brandId?: string,
  locale?: string,
): Promise<Array<{ state: StockState; count: number }>> {
  const filter = productFilter({ categoryId, brandId });
  const secret = await previewSecret();
  const count = async () => {
    const counts = await Promise.all(
      STOCK_STATES.map((state) =>
        queryProducts({
          filter,
          stockState: state,
          locale,
          limit: 1,
          previewSecret: secret,
        }).then((page) => ({ state, count: page.total })),
      ),
    );
    return counts.filter((facet) => facet.count > 0);
  };
  if (secret) return count();
  return stockFacetCache(JSON.stringify([filter, locale ?? ""]), count);
}
