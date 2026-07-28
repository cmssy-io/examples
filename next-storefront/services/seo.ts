import type { Metadata } from "next";
import { cmssy } from "@/cmssy.config";
import { PublicPageMetaDocument } from "@/graphql/generated/graphql";
import { publicRequest } from "@/services/gateway";
import { fetchSiteConfig } from "@/services/site";

function slugFromPath(path?: string[]): string {
  const joined = (path ?? []).filter(Boolean).join("/");
  return joined ? `/${joined}` : "/";
}

export async function buildPageMetadata(path?: string[]): Promise<Metadata> {
  const [meta, site] = await Promise.all([
    publicRequest(PublicPageMetaDocument, {
      workspaceSlug: cmssy.workspaceSlug,
      slug: slugFromPath(path),
    }),
    fetchSiteConfig(),
  ]);

  const page = meta.public?.page?.get ?? null;

  const seoTitle = page?.seoTitle as string | null | undefined;
  const displayName = page?.displayName as string | null | undefined;
  const seoDescription = page?.seoDescription as string | null | undefined;
  const title = seoTitle || displayName || site?.siteName || undefined;
  const description = seoDescription || undefined;
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
