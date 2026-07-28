import { createCmssyClient } from "@cmssy/react";
import { cmssy } from "@/cmssy.config";
import { PublicPagesByTypeDocument } from "@/graphql/generated/graphql";

const client = createCmssyClient(cmssy);

export type Localized = string | Record<string, string> | null | undefined;

export type Post = {
  id: string;
  slug: string;
  fullSlug: string;
  publishedAt?: string | null;
  displayName?: Localized;
  seoTitle?: Localized;
  seoDescription?: Localized;
};

export type PostsResult = { items: Post[]; hasMore: boolean };

export async function loadPosts(vars: {
  parentSlug: string;
  limit: number;
}): Promise<PostsResult | null> {
  if (typeof window !== "undefined") {
    throw new Error("loadPosts is server-only");
  }
  const data = await client.queryScoped(PublicPagesByTypeDocument, {
    ...vars,
    offset: 0,
  });
  const r = data?.public?.page?.byType;
  if (!r) return null;

  const items: Post[] = r.items.map((item) => ({
    id: item.id,
    slug: item.slug,
    fullSlug: item.fullSlug,
    publishedAt: item.publishedAt,
    displayName: item.displayName as Localized,
    seoTitle: item.seoTitle as Localized,
    seoDescription: item.seoDescription as Localized,
  }));
  return { items, hasMore: r.hasMore };
}
