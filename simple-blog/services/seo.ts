import type { Metadata } from "next";
import { cmssy } from "@/cmssy.config";
import {
  localizedPath,
  pickLocalized,
  splitLocaleFromPath,
} from "@/lib/locale-path";
import { publicQuery, PAGE_META_QUERY } from "@/services/gateway";
import { fetchSiteConfig, resolveSiteLocales } from "@/services/site";

type Localized = Record<string, string> | string | null;

type PageMeta = {
  seoTitle: Localized;
  seoDescription: Localized;
  seoKeywords: string[] | null;
  displayName: Localized;
};

// Your own host. The CMS stores canonical content, never your domain.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";

// A `*.vercel.app` origin is a demo or a staging one, never a site's real home.
// Vercel marks *preview* deployments noindex on its own and leaves production
// ones alone, so a demo published there is as indexable as anything else.
// Whatever is served from one must not compete with a real domain in a search
// index.
export function isDemoOrigin(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

/**
 * SEO is your app's code, not an SDK helper: the canonical host, the title
 * fallback chain and the OG strategy are decisions about your site.
 */
export async function buildPageMetadata(path?: string[]): Promise<Metadata> {
  const [config, locales] = await Promise.all([
    fetchSiteConfig(),
    resolveSiteLocales(),
  ]);
  const { defaultLocale } = locales;
  const { locale, path: rest } = splitLocaleFromPath(path, locales);
  const slug = "/" + (rest ?? []).join("/");

  const meta = await publicQuery<{
    public: { page: { get: PageMeta | null } };
  }>(PAGE_META_QUERY, { workspaceSlug: cmssy.workspaceSlug, slug })
    .then((data) => data.public.page.get)
    .catch(() => null);

  const siteName =
    pickLocalized(config?.siteName, locale, defaultLocale) ||
    config?.branding?.brandName ||
    undefined;

  // Fall back deliberately, so a half-finished page still has a title.
  const title =
    pickLocalized(meta?.seoTitle, locale, defaultLocale) ||
    pickLocalized(meta?.displayName, locale, defaultLocale) ||
    siteName;
  const description =
    pickLocalized(meta?.seoDescription, locale, defaultLocale) || undefined;
  const image = config?.branding?.ogImageUrl ?? undefined;

  return {
    title,
    description,
    keywords: meta?.seoKeywords?.length ? meta.seoKeywords : undefined,
    alternates: SITE_URL
      ? {
          canonical: `${SITE_URL}${localizedPath(slug, locale, defaultLocale)}`,
          languages: Object.fromEntries(
            locales.locales.map((l) => [
              l,
              `${SITE_URL}${localizedPath(slug, l, defaultLocale)}`,
            ]),
          ),
        }
      : undefined,
    openGraph: {
      title,
      description,
      siteName,
      images: image ? [image] : undefined,
    },
  };
}
