import type { ReactNode } from "react";
import { CmssyLayoutSlot } from "@cmssy/next/server";
import { cmssy } from "@/cmssy.config";
import { blocks } from "@/cmssy/blocks";
import { EditableLayout } from "@/cmssy/editable-layout";
import { fetchSiteConfig, resolveSiteLocales } from "@/services/site";
import { splitLocaleFromPath } from "@/lib/locale-path";
import "@/styles/globals.css";

// One root layout for both modes now: CmssyLayoutSlot renders the header and
// footer server-side for visitors and through the edit bridge in edit mode, so
// the edit route no longer needs a layout of its own.
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

  const slot = (position: "header" | "footer") => (
    <CmssyLayoutSlot
      config={cmssy}
      blocks={blocks}
      position={position}
      path={path ?? []}
      editMode={false}
      editable={EditableLayout}
    />
  );

  // `lang` must be the language actually rendered - screen readers and the
  // editor smoke test both read it.
  return (
    <html lang={locale}>
      <body>
        {slot("header")}
        <main>{children}</main>
        {slot("footer")}
      </body>
    </html>
  );
}
