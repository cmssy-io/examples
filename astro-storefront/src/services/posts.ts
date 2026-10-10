import { PublicPagesByTypeDocument } from "../graphql/generated/graphql";
import { localizedText } from "../lib/localized";
import { client } from "./gateway";

export interface Post {
  id: string;
  slug: string;
  fullSlug: string;
  title: string;
  summary: string;
  publishedAt: string | null;
}

export interface LoadPostsOptions {
  parentSlug: string;
  limit: number;
  locale?: string;
  defaultLocale?: string;
}

export async function loadPosts(options: LoadPostsOptions): Promise<Post[]> {
  const data = await client.queryScoped(PublicPagesByTypeDocument, {
    parentSlug: options.parentSlug,
    limit: options.limit,
    offset: 0,
  });
  const locale = { locale: options.locale, defaultLocale: options.defaultLocale };
  const items = data?.public?.page?.byType?.items ?? [];
  return items.map((item) => ({
    id: item.id,
    slug: item.slug,
    fullSlug: item.fullSlug,
    title:
      localizedText(item.seoTitle, locale) ||
      localizedText(item.displayName, locale),
    summary: localizedText(item.seoDescription, locale),
    publishedAt: item.publishedAt,
  }));
}
