import {
  CmssyBlock,
  buildBlockContext,
  buildBlockMap,
  resolveCmssyLayoutSlot,
  resolveEditorBlockData,
  resolveEditorLayoutBlockData,
  type EditorBlockData,
} from "@cmssy/react";
import { createCmssyHeaders, createCmssyLoader } from "@cmssy/remix";
import { data as withStatus } from "react-router";
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
  //
  // A URL with no page behind it inherits nothing, which would leave the 404 the
  // only page on the site with no way off it. The regions of "/" are the site's
  // own, so that is what it gets.
  const layouts = data.page
    ? data.layouts
    : (
        await resolveCmssyLayoutSlot(cmssy, {
          region: "header",
          blocks,
          editMode: false,
          path: [],
          locale: data.locale,
        })
      ).groups;

  const [header, footer] = await Promise.all(
    (["header", "footer"] as const).map((region) =>
      resolveEditorLayoutBlockData({
        groups: layouts,
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

  const payload = {
    ...data,
    layouts,
    blockData: resolved.data,
    blockContent: resolved.content,
    header,
    footer,
    meta: data.page?.slug ? await fetchPageMeta(data.page.slug) : null,
  };

  // A path the workspace has no page for is a 404, not a 200 with "Not found"
  // written on it. A soft 404 gets indexed and keeps a monitor green, and an
  // example that answers this way teaches it. `data` rather than a thrown
  // Response: the page still renders, with the header and footer around it.
  return data.page ? payload : withStatus(payload, { status: 404 });
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
