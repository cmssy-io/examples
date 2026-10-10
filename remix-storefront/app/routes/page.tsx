import {
  CmssyBlock,
  buildBlockContext,
  buildBlockMap,
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
import { CartDrawer } from "../components/shop/cart-drawer";
import { ShopNotFound } from "../components/shop/shop-error";
import { localizedText } from "../lib/localized";
import { fetchPageMeta } from "../services/seo";
import { loadShopChrome } from "../shop/chrome";
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

  const chrome = data.page
    ? null
    : await loadShopChrome(data.locale);
  const layouts = chrome ? chrome.layouts : data.layouts;

  const [header, footer] = chrome
    ? [chrome.header, chrome.footer]
    : await Promise.all(
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
    localizedText(data.meta?.seoTitle, data) ||
    localizedText(data.meta?.displayName, data);
  const description = localizedText(data.meta?.seoDescription, data);

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
    blockDataToken,
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
      <div className="shop-scope">
        <main className="shop-main">
          <CmssyEditor
            page={page}
            locale={locale}
            defaultLocale={defaultLocale}
            enabledLocales={enabledLocales}
            edit={{ editorOrigin, blockDataToken }}
          />
        </main>
      </div>
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
    <div className="shop-scope">
      {region("header")}
      <main className="shop-main">
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
          <ShopNotFound />
        )}
      </main>
      {region("footer")}
      <CartDrawer />
    </div>
  );
}
