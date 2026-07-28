import { createCmssyPage } from "@cmssy/next/server";
import { cmssy } from "@/cmssy.config";
import { blocks } from "@/cmssy/blocks";
import { buildPageMetadata } from "@/services/seo";
import { publishedPaths } from "@/services/pages";

type PageProps = { params: Promise<{ path?: string[] }> };

export const revalidate = 3600;
export const dynamicParams = true;

// Without this the catch-all is rendered on demand on every request and the
// `revalidate` above does nothing - the build prints a blank Revalidate column
// and every visit costs a delivery call. `dynamicParams` covers pages published
// after the build: first request renders, then it is cached.
export function generateStaticParams() {
  return publishedPaths();
}

export async function generateMetadata({ params }: PageProps) {
  const { path } = await params;
  // As routed, prefix and all: the prefix IS the language.
  return buildPageMetadata(path);
}

// Public route, statically renderable. A verified editor request is rewritten
// by the middleware onto /cmssy-edit, which mounts createCmssyEditPage.
export default createCmssyPage(cmssy, blocks);
