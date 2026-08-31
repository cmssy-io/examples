import type { ReactNode } from "react";
import { CmssyLayoutSlot, isCmssyEditMode } from "@cmssy/next/server";
import { cmssy } from "@/cmssy.config";
import { blocks } from "@/cmssy/blocks";
import { EditableLayout } from "@/cmssy/editable-layout";
import { splitLocaleFromPath } from "@/lib/locale-path";
import { resolveSiteLocales } from "@/services/site";
import "@/styles/globals.css";

// The edit route is its own segment, so it needs its own root layout - the
// public one below app/[[...path]] does not apply here. The slot itself is the
// same call: it renders through the edit bridge once the request is verified.
export default async function EditLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ path?: string[] }>;
}) {
  const { path } = await params;
  const { locale } = splitLocaleFromPath(path, await resolveSiteLocales());

  // Not a hard `true`: this route is reachable directly, and only the proxy's
  // verified rewrite sets the edit header. Hard-coding it would fetch layouts
  // with the draft secret for anyone who typed the URL. Reading the header is
  // free here - this segment is dynamic either way.
  const editMode = await isCmssyEditMode();

  const slot = (region: "header" | "footer") => (
    <CmssyLayoutSlot
      config={cmssy}
      blocks={blocks}
      region={region}
      path={path ?? []}
      editMode={editMode}
      editable={EditableLayout}
    />
  );

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
