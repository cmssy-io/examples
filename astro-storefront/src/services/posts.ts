import { pickLocalized } from "../lib/locale-path";
import type { Locales } from "./catalog";
import { client, PAGES_BY_TYPE_QUERY } from "./gateway";

export interface Post {
  id: string;
  slug: string;
  fullSlug: string;
  title: string;
  summary: string;
  publishedAt: string | null;
}

// The delivery API returns translatable fields language-keyed
// (e.g. `{ en: "Title" }`), so every one of them goes through `text` below.
type Localized = string | Record<string, string> | null | undefined;

interface PostRow {
  id: string;
  slug: string;
  fullSlug: string;
  publishedAt: string | null;
  displayName: Localized;
  seoTitle: Localized;
  seoDescription: Localized;
}

function text(value: Localized, locales: Locales): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    return pickLocalized(value as never, locales.current, locales.default);
  }
  return "";
}

export async function loadPosts(
  locales: Locales,
  options: { parentSlug: string; limit: number },
): Promise<Post[]> {
  const data = await client.queryScoped<{
    public?: { page?: { byType?: { items?: PostRow[] } | null } | null } | null;
  }>(PAGES_BY_TYPE_QUERY, {
    parentSlug: options.parentSlug,
    limit: options.limit,
    offset: 0,
  });
  const items = data?.public?.page?.byType?.items ?? [];
  return items.map((item) => ({
    id: item.id,
    slug: item.slug,
    fullSlug: item.fullSlug,
    title: text(item.seoTitle, locales) || text(item.displayName, locales),
    summary: text(item.seoDescription, locales),
    publishedAt: item.publishedAt,
  }));
}
