import {
  CmssyBlock,
  buildBlockContext,
  buildBlockMap,
  resolveEditorBlockData,
} from "@cmssy/react";
import { createCmssyHeaders, createCmssyLoader } from "@cmssy/remix";
import { cmssy } from "../../cmssy.config";
import { blocks } from "../cmssy/blocks";
import { CmssyEditor } from "../cmssy/editor";
import { pickLocalized } from "../lib/localized";
import { fetchPageMeta } from "../services/seo";
import type { Route } from "./+types/page";

const cmssyLoader = createCmssyLoader(cmssy);

export async function loader(args: Route.LoaderArgs) {
  const data = await cmssyLoader(args);
  const { data: blockData } = await resolveEditorBlockData({
    page: data.page,
    blocks,
    locale: data.locale,
    defaultLocale: data.defaultLocale,
    enabledLocales: data.enabledLocales,
    config: cmssy,
  });

  return {
    ...data,
    blockData,
    meta: data.page?.slug ? await fetchPageMeta(data.page.slug) : null,
  };
}

export function meta({ data }: Route.MetaArgs) {
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

  if (!page)
    return (
      <main>
        <h1>Not found</h1>
      </main>
    );

  const blockMap = buildBlockMap(blocks);
  const context = buildBlockContext(locale, defaultLocale, enabledLocales);

  return (
    <main>
      {(page.blocks ?? []).map((block) => (
        <CmssyBlock
          key={block.id}
          block={block}
          blockMap={blockMap}
          locale={locale}
          defaultLocale={defaultLocale}
          context={context}
          data={blockData[block.id]}
        />
      ))}
    </main>
  );
}
