import { cmssy } from "../../cmssy.config";
import type { SiteLocales } from "../lib/locale-path";
import { publicQuery, SITE_CONFIG_QUERY } from "./gateway";

export interface SiteConfigSummary {
  defaultLanguage: string | null;
  enabledLanguages: string[] | null;
  notFoundPageId: string | null;
}

export async function fetchSiteConfig(): Promise<SiteConfigSummary | null> {
  const data = await publicQuery<{
    public: { siteConfig: SiteConfigSummary | null };
  }>(SITE_CONFIG_QUERY, { workspaceSlug: cmssy.workspaceSlug });
  return data.public.siteConfig;
}

export function siteLocalesFrom(config: SiteConfigSummary | null): SiteLocales {
  const defaultLocale = config?.defaultLanguage || "en";
  const enabled = config?.enabledLanguages ?? [];
  return {
    defaultLocale,
    locales: enabled.length > 0 ? enabled : [defaultLocale],
  };
}
