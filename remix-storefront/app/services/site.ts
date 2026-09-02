import type { CmssyLocaleContext } from "@cmssy/core";
import { cmssy } from "../../cmssy.config";
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

// Settings → Languages in the workspace is the only source of these. Nothing
// about languages belongs in cmssy.config.ts, and a `?? "en"` written anywhere
// else would be a second answer to the same question.
export async function resolveSiteLocales(): Promise<
  Omit<CmssyLocaleContext, "current">
> {
  const config = await fetchSiteConfig();
  const defaultLocale = config?.defaultLanguage || "en";
  const enabled = config?.enabledLanguages ?? [];
  return {
    default: defaultLocale,
    enabled: enabled.length > 0 ? enabled : [defaultLocale],
  };
}
