import { createCmssyClient } from "@cmssy/react";
import { cmssy } from "@/cmssy.config";
import { PUBLIC_PAGES_BY_TYPE } from "./posts-query";

// Server-only: imported via dynamic import() inside the block loader, so this
// module (and the GraphQL client) never reaches the browser bundle.
const client = createCmssyClient(cmssy);

// The delivery API returns translatable fields language-keyed (e.g.
// `{ en: "Title" }`); resolve them with `pickLocale` in the component.
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
  const data = await client.queryScoped<{
    public?: {
      page?: { byType?: { items?: Post[]; hasMore?: boolean } | null } | null;
    } | null;
  }>(PUBLIC_PAGES_BY_TYPE, { ...vars, offset: 0 });
  const r = data?.public?.page?.byType;
  return r ? { items: r.items ?? [], hasMore: !!r.hasMore } : null;
}
