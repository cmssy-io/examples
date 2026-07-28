import { cmssy } from "@/cmssy.config";
import type { SiteLocales } from "@/lib/locale-path";
import { publicQuery, SITE_CONFIG_QUERY } from "@/services/gateway";

export type SiteConfig = {
  siteName: Record<string, string> | string | null;
  defaultLanguage: string | null;
  enabledLanguages: string[] | null;
  notFoundPageId: string | null;
  branding: {
    brandName: string | null;
    logoUrl: string | null;
    faviconUrl: string | null;
    ogImageUrl: string | null;
  } | null;
};

// Fetched once per server instance: the workspace settings are the single
// source of truth for languages and branding, and they change rarely.
let cached: Promise<SiteConfig | null> | undefined;

export function fetchSiteConfig(): Promise<SiteConfig | null> {
  // A failed fetch is NOT cached. Caching it would pin the whole process to
  // the fallback locale after one bad request, and nothing would recover it.
  cached ??= publicQuery<{ public: { siteConfig: SiteConfig | null } }>(
    SITE_CONFIG_QUERY,
    { workspaceSlug: cmssy.workspaceSlug },
  )
    .then((data) => data.public.siteConfig)
    .catch(() => {
      cached = undefined;
      return null;
    });
  return cached;
}

/** Never hardcode the locale set - a new language must not need a deploy. */
export async function resolveSiteLocales(): Promise<SiteLocales> {
  const config = await fetchSiteConfig();
  const defaultLocale = config?.defaultLanguage || "en";
  const enabled = config?.enabledLanguages ?? [];
  return {
    defaultLocale,
    locales: enabled.length > 0 ? enabled : [defaultLocale],
  };
}
