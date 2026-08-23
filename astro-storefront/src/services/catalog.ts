import { pickLocalized } from "../lib/locale-path";
import { client, MODEL_RECORDS_QUERY } from "./gateway";

import { CATEGORY_MODEL, PRODUCT_MODEL } from "./catalog-models";

export interface Category {
  id: string;
  name: string;
  slug: string;
  code: string | null;
  description: string | null;
  sortOrder: number | null;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  sku: string | null;
  price: number | null;
  categoryId: string | null;
}

type RecordRow = { id: string; data: Record<string, unknown> };

async function records(
  modelSlug: string,
  locales: Locales,
  extra: Record<string, unknown> = {},
): Promise<RecordRow[]> {
  const data = await client.queryScoped<{
    public: { model: { records: { items: RecordRow[] } | null } | null } | null;
  }>(MODEL_RECORDS_QUERY, {
    modelSlug,
    locale: locales.current,
    limit: 50,
    offset: 0,
    ...extra,
  });
  return data?.public?.model?.records?.items ?? [];
}

export interface Locales {
  current: string;
  default: string;
}

function text(value: unknown, locales: Locales): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    return pickLocalized(value as never, locales.current, locales.default);
  }
  return "";
}

export async function loadCategories(locales: Locales): Promise<Category[]> {
  const items = await records(CATEGORY_MODEL, locales, { sort: "sortOrder" });
  return items
    .map((item) => ({
      id: item.id,
      name: text(item.data.name, locales),
      slug: String(item.data.slug ?? ""),
      code: item.data.code ? String(item.data.code) : null,
      description: text(item.data.description, locales) || null,
      sortOrder:
        typeof item.data.sortOrder === "number" ? item.data.sortOrder : null,
    }))
    .sort(
      (a, b) =>
        (a.sortOrder ?? Number.MAX_SAFE_INTEGER) -
        (b.sortOrder ?? Number.MAX_SAFE_INTEGER),
    );
}

export async function loadProducts(
  locales: Locales,
  options: { categoryId?: string; sort?: string; limit?: number } = {},
): Promise<Product[]> {
  const limit = options.limit ?? 8;

  const items = await records(PRODUCT_MODEL, locales, {
    sort: options.sort ?? "title",
    limit,
    ...(options.categoryId ? { filter: { category: options.categoryId } } : {}),
  });

  return items.slice(0, limit).map((item) => ({
    id: item.id,
    title: text(item.data.title, locales),
    slug: String(item.data.slug ?? ""),
    sku: item.data.sku ? String(item.data.sku) : null,
    price: typeof item.data.price === "number" ? item.data.price : null,
    categoryId: item.data.category ? String(item.data.category) : null,
  }));
}
