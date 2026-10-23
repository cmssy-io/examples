import {
  loadAllProducts,
  sortProducts,
  type BrandRef,
  type Product,
} from "@/lib/catalog";
import { loadCategories } from "@/lib/catalog-cached";
import { ttlCache } from "@/lib/ttl-cache";

export interface MegaCategory {
  id: string;
  name: string;
  slug: string;
  code: string;
  count: number;
  lines: Array<{ slug: string; title: string }>;
  brands: BrandRef[];
  featured: { slug: string; title: string } | null;
}

const LINES_PER_CATEGORY = 8;
const MAX_BRANDS = 5;
const cachedMenu = ttlCache<MegaCategory[]>(60_000);

async function buildMegaMenu(locale?: string): Promise<MegaCategory[]> {
  const [categories, products] = await Promise.all([
    loadCategories(locale),
    loadAllProducts(locale),
  ]);

  const byCategory = new Map<string, Product[]>();
  for (const product of sortProducts(products, "title")) {
    if (!product.categoryId) continue;
    const list = byCategory.get(product.categoryId) ?? [];
    list.push(product);
    byCategory.set(product.categoryId, list);
  }

  return categories.map((category) => {
    const all = byCategory.get(category.id) ?? [];
    const items = all.slice(0, LINES_PER_CATEGORY);

    const brands: BrandRef[] = [];
    for (const product of items) {
      const brand = product.brand;
      if (brand && !brands.some((known) => known.id === brand.id)) {
        brands.push(brand);
      }
    }

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      code: category.code ?? category.slug.slice(0, 3).toUpperCase(),
      count: all.length,
      lines: items.map((product) => ({
        slug: product.slug,
        title: product.title,
      })),
      brands: brands.slice(0, MAX_BRANDS),
      featured: items[0]
        ? { slug: items[0].slug, title: items[0].title }
        : null,
    };
  });
}

export function loadMegaMenu(locale?: string): Promise<MegaCategory[]> {
  return cachedMenu(locale ?? "", () => buildMegaMenu(locale));
}
