import { createCmssyClient } from "@cmssy/remix";
import { cmssy } from "../../cmssy.config";

export const client = createCmssyClient(cmssy);

export function publicQuery<T>(
  document: string,
  variables: Record<string, unknown>,
): Promise<T> {
  return client.query<T>(document, variables, {
    public: true,
    retry: "interactive",
  });
}

export const SITE_CONFIG_QUERY = `query PublicSiteConfig($workspaceSlug: String!) {
  public {
    siteConfig(workspaceSlug: $workspaceSlug) {
      defaultLanguage
      enabledLanguages
      notFoundPageId
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
        displayName
      }
    }
  }
}`;

export const MODEL_RECORDS_QUERY = `query PublicModelRecords($workspaceId: String!, $modelSlug: String!, $filter: JSON, $sort: String, $locale: String, $limit: Int, $offset: Int) {
  public {
    model {
      records(workspaceId: $workspaceId, modelSlug: $modelSlug, filter: $filter, sort: $sort, locale: $locale, limit: $limit, offset: $offset) {
        items { id data }
      }
    }
  }
}`;
