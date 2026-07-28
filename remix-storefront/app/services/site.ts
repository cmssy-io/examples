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
