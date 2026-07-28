import type { SiteLocales } from "../lib/locale-path";
import { cmssy } from "../cmssy.config";
import { publicQuery, SITE_CONFIG_QUERY } from "./gateway";

export interface SiteConfig {
  defaultLanguage: string | null;
  enabledLanguages: string[] | null;
  notFoundPageId: string | null;
}

let cached: Promise<SiteConfig | null> | undefined;

export function fetchSiteConfig(): Promise<SiteConfig | null> {
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

export async function resolveSiteLocales(): Promise<SiteLocales> {
  const config = await fetchSiteConfig();
  const defaultLocale = config?.defaultLanguage || "en";
  const enabled = config?.enabledLanguages ?? [];
  return {
    defaultLocale,
    locales: enabled.length > 0 ? enabled : [defaultLocale],
  };
}
