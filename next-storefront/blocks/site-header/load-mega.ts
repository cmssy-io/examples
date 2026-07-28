import { loadCategories, loadProducts } from "@/lib/catalog";

export interface MegaCategory {
  id: string;
  name: string;
  slug: string;
  code: string;

  count: number;

  lines: Array<{ slug: string; title: string }>;
  brands: string[];
  featured: { slug: string; title: string } | null;
}

const LINES_PER_CATEGORY = 8;
const MAX_BRANDS = 5;

export async function loadMegaMenu(locale?: string): Promise<MegaCategory[]> {
  const categories = await loadCategories(locale);

  return Promise.all(
    categories.map(async (category) => {
      const { items, total } = await loadProducts({
        categoryId: category.id,
        locale,
        limit: LINES_PER_CATEGORY,
        sort: "title",
      });

      const brands: string[] = [];
      for (const product of items) {
        if (product.brand && !brands.includes(product.brand)) {
          brands.push(product.brand);
        }
      }

      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        code: category.code ?? category.slug.slice(0, 3).toUpperCase(),
        count: total,
        lines: items.map((product) => ({
          slug: product.slug,
          title: product.title,
        })),
        brands: brands.slice(0, MAX_BRANDS),
        featured: items[0]
          ? { slug: items[0].slug, title: items[0].title }
          : null,
      };
    }),
  );
}
