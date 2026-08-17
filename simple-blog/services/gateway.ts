import { createCmssyClient } from "@cmssy/react";
import { nextRetryMode } from "@cmssy/next";
import { cmssy } from "@/cmssy.config";

// One delivery client for the whole app. Public reads need no token: the API
// only ever returns published content there.
export const client = createCmssyClient(cmssy);

/**
 * Every public read goes through here.
 *
 * `public` routes the request to the org-scoped delivery path. Without it the
 * request lands on the base endpoint, where the workspace is looked up by slug
 * alone - across every organisation. `nextRetryMode()` picks the patient build
 * budget while `next build` prerenders and the short interactive one once a
 * visitor is waiting on the response.
 */
export function publicQuery<T>(
  document: string,
  variables: Record<string, unknown>,
): Promise<T> {
  return client.query<T>(document, variables, {
    public: true,
    retry: nextRetryMode(),
  });
}

export const SITE_CONFIG_QUERY = `query PublicSiteConfig($workspaceSlug: String!) {
  public {
    siteConfig(workspaceSlug: $workspaceSlug) {
      siteName
      defaultLanguage
      enabledLanguages
      notFoundPageId
      branding { brandName logoUrl faviconUrl ogImageUrl }
    }
  }
}`;

export const PAGE_LIST_QUERY = `query PublicPages($workspaceSlug: String!) {
  public {
    page {
      list(workspaceSlug: $workspaceSlug) {
        id
        slug
        updatedAt
        publishedAt
      }
    }
  }
}`;

export const PAGE_META_QUERY = `query PublicPageMeta($workspaceSlug: String!, $slug: String!) {
  public {
    page {
      get(workspaceSlug: $workspaceSlug, slug: $slug) {
        seoTitle
        seoDescription
        seoKeywords
        displayName
      }
    }
  }
}`;
