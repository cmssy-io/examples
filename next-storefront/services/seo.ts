import type { Metadata } from "next";
import { cmssy } from "@/cmssy.config";
import { PublicPageMetaDocument } from "@/graphql/generated/graphql";
import { publicRequest } from "@/services/gateway";
import { fetchSiteConfig } from "@/services/site";
import { shopLocale } from "@/lib/locale";
import { localizedText } from "@/lib/localized";

function slugFromPath(path?: string[]): string {
  const joined = (path ?? []).filter(Boolean).join("/");
  return joined ? `/${joined}` : "/";
}

export async function buildPageMetadata(path?: string[]): Promise<Metadata> {
  const [meta, site, { locale }] = await Promise.all([
    publicRequest(PublicPageMetaDocument, {
      workspaceSlug: cmssy.workspaceSlug,
      slug: slugFromPath(path),
    }),
    fetchSiteConfig(),
    shopLocale(),
  ]);

  const page = meta.public?.page?.get ?? null;

  // These are translatable, and this query takes no locale - the API hands back
  // the whole language map. `undefined`, not "", so an untitled page inherits
  // the layout's metadata instead of blanking it.
  const text = (value: unknown) =>
    localizedText(value, {
      locale,
      defaultLocale: site?.defaultLanguage,
    }) || undefined;

  const title =
    text(page?.seoTitle) ?? text(page?.displayName) ?? text(site?.siteName);
  const description = text(page?.seoDescription);
  const ogImageUrl = site?.branding?.ogImageUrl || undefined;
  const keywords =
    page?.seoKeywords && page.seoKeywords.length > 0
      ? page.seoKeywords
      : undefined;

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
    },
  };
}
