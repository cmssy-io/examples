import { pickLocalized } from "../lib/localized";
import { client, MODEL_RECORDS_QUERY } from "./gateway";

const CATEGORY_MODEL = "category";
const PRODUCT_MODEL = "product";

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
  locale: string | undefined,
  extra: Record<string, unknown> = {},
): Promise<RecordRow[]> {
  const data = await client.queryScoped<{
    public: { model: { records: { items: RecordRow[] } | null } | null } | null;
  }>(MODEL_RECORDS_QUERY, {
    modelSlug,
    locale: locale ?? null,
    limit: 50,
    offset: 0,
    ...extra,
  });
  return data?.public?.model?.records?.items ?? [];
}

function text(value: unknown, locale: string | undefined): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    return locale ? pickLocalized(value as never, locale, locale) : "";
  }
  return "";
}

export async function loadCategories(
  locale?: string,
): Promise<Category[]> {
  const items = await records(CATEGORY_MODEL, locale, { sort: "sortOrder" });
  return items
    .map((item) => ({
      id: item.id,
      name: text(item.data.name, locale),
      slug: String(item.data.slug ?? ""),
      code: item.data.code ? String(item.data.code) : null,
      description: text(item.data.description, locale) || null,
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
  locale: string | undefined,
  options: { categorySlug?: string; sort?: string; limit?: number } = {},
): Promise<Product[]> {
  const limit = options.limit ?? 8;
  const categories = options.categorySlug ? await loadCategories(locale) : [];
  const category = categories.find((c) => c.slug === options.categorySlug);

  const items = await records(PRODUCT_MODEL, locale, {
    sort: options.sort ?? "title",
    limit,
    ...(category ? { filter: { categoryId: category.id } } : {}),
  });

  return items.slice(0, limit).map((item) => ({
    id: item.id,
    title: text(item.data.title, locale),
    slug: String(item.data.slug ?? ""),
    sku: item.data.sku ? String(item.data.sku) : null,
    price: typeof item.data.price === "number" ? item.data.price : null,
    categoryId: item.data.categoryId ? String(item.data.categoryId) : null,
  }));
}
