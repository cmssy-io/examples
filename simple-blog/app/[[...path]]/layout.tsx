import type { ReactNode } from "react";
import { fetchSiteConfig, resolveSiteLocales } from "@/services/site";
import { splitLocaleFromPath } from "@/lib/locale-path";
import "@/styles/globals.css";

// No layout regions here. The demo workspace's header and footer are the
// storefront's own blocks - a category mega-menu, a cart and a trade sign-in -
// and next-storefront is where they are implemented. This example renders page
// body blocks, which is what a blog has.
export async function generateMetadata() {
  const favicon = (await fetchSiteConfig())?.branding?.faviconUrl;
  return favicon ? { icons: { icon: favicon } } : {};
}

export default async function SiteLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ path?: string[] }>;
}) {
  const { path } = await params;
  const { locale } = splitLocaleFromPath(path, await resolveSiteLocales());

  // `lang` must be the language actually rendered - screen readers and the
  // editor smoke test both read it.
  return (
    <html lang={locale}>
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
