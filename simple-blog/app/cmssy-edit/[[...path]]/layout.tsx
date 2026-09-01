import type { ReactNode } from "react";
import { splitLocaleFromPath } from "@/lib/locale-path";
import { resolveSiteLocales } from "@/services/site";
import "@/styles/globals.css";

// The edit route is its own segment, so it needs its own root layout - the
// public one below app/[[...path]] does not apply here. Like that one it
// renders no layout regions; the editor still edits the page's body blocks.
export default async function EditLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ path?: string[] }>;
}) {
  const { path } = await params;
  const { locale } = splitLocaleFromPath(path, await resolveSiteLocales());

  return (
    <html lang={locale}>
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
