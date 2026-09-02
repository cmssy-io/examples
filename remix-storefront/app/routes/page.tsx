import {
  CmssyBlock,
  buildBlockContext,
  buildBlockMap,
  resolveEditorBlockData,
  resolveEditorLayoutBlockData,
  type EditorBlockData,
} from "@cmssy/react";
import { createCmssyHeaders, createCmssyLoader } from "@cmssy/remix";
import { cmssy } from "../../cmssy.config";
import { blocks } from "../cmssy/blocks";
import { CmssyEditor } from "../cmssy/editor";
import { Region } from "../cmssy/region";
import { pickLocalized } from "../lib/localized";
import { fetchPageMeta } from "../services/seo";
import type { Route } from "./+types/page";

const cmssyLoader = createCmssyLoader(cmssy);

export async function loader(args: Route.LoaderArgs) {
  const data = await cmssyLoader(args);
  const resolved: EditorBlockData = data.isEdit
    ? { data: {}, content: {} }
    : await resolveEditorBlockData({
        page: data.page,
        blocks,
        locale: data.locale,
        defaultLocale: data.defaultLocale,
        enabledLocales: data.enabledLocales,
        config: cmssy,
      });

  // The header and the footer live in the workspace, on the homepage, and every
  // page inherits them - so they are content, resolved the way the page's own
  // blocks are, not chrome hard-coded into this route.
  const [header, footer] = await Promise.all(
    (["header", "footer"] as const).map((region) =>
      resolveEditorLayoutBlockData({
        groups: data.layouts,
        blocks,
        region,
        page: data.pageContext,
        locale: data.locale,
        defaultLocale: data.defaultLocale,
        enabledLocales: data.enabledLocales,
        config: cmssy,
      }),
    ),
  );

  return {
    ...data,
    blockData: resolved.data,
    blockContent: resolved.content,
    header,
    footer,
    meta: data.page?.slug ? await fetchPageMeta(data.page.slug) : null,
  };
}

export function meta({ loaderData: data }: Route.MetaArgs) {
  if (!data) return [];
  const title =
    pickLocalized(data.meta?.seoTitle, data.locale, data.defaultLocale) ||
    pickLocalized(data.meta?.displayName, data.locale, data.defaultLocale);
  const description = pickLocalized(
    data.meta?.seoDescription,
    data.locale,
    data.defaultLocale,
  );

  return [
    ...(title ? [{ title }] : []),
    ...(description ? [{ name: "description", content: description }] : []),
  ];
}

// Without these the admin cannot frame the site, and the editor shows an empty
// box with no error anywhere.
export const headers = createCmssyHeaders(cmssy);

export default function CmssyPage({ loaderData }: Route.ComponentProps) {
  const {
    page,
    locale,
    defaultLocale,
    enabledLocales,
    isEdit,
    editorOrigin,
    blockData,
    blockContent,
    layouts,
    header,
    footer,
  } = loaderData;

  // A verified editor request renders the same page through the edit bridge.
  // No separate route: a React Router page always sees its query string.
  if (isEdit) {
    return (
      <CmssyEditor
        page={page}
        locale={locale}
        defaultLocale={defaultLocale}
        enabledLocales={enabledLocales}
        edit={{ editorOrigin }}
      />
    );
  }

  const blockMap = buildBlockMap(blocks);
  const context = buildBlockContext(locale, defaultLocale, enabledLocales);
  const region = (name: "header" | "footer") => (
    <Region
      groups={layouts}
      region={name}
      locale={locale}
      defaultLocale={defaultLocale}
      enabledLocales={enabledLocales}
      blockData={(name === "header" ? header : footer).data}
      blockContent={(name === "header" ? header : footer).content}
    />
  );

  // The chrome wraps the missing page too: a 404 on a site with a header and a
  // footer still has them, and a visitor who lands on one needs the navigation
  // more than anyone else does.
  return (
    <>
      {region("header")}
      <main>
        {page ? (
          (page.blocks ?? []).map((block) => (
            <CmssyBlock
              key={block.id}
              block={block}
              blockMap={blockMap}
              locale={locale}
              defaultLocale={defaultLocale}
              context={context}
              resolvedContent={blockContent[block.id]}
              data={blockData[block.id]}
            />
          ))
        ) : (
          <h1>Not found</h1>
        )}
      </main>
      {region("footer")}
    </>
  );
}
