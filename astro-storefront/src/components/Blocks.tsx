import { CmssyBlock, buildBlockMap, buildBlockContext } from "@cmssy/react";
import type { CmssyPageData } from "@cmssy/core";
import { blocks } from "../cmssy/blocks";
import { LocaleProvider, type ShopLocation } from "./shop/locale-ui";

export function Blocks({
  page,
  location,
  blockData,
  blockContent,
}: {
  page: CmssyPageData;
  location: ShopLocation;
  blockData: Record<string, unknown>;
  blockContent: Record<string, Record<string, unknown>>;
}) {
  const { locale, defaultLocale, locales } = location;
  const blockMap = buildBlockMap(blocks);
  const context = buildBlockContext(locale, defaultLocale, locales);

  return (
    <LocaleProvider value={location}>
      {(page.blocks ?? []).map((block) => (
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
      ))}
    </LocaleProvider>
  );
}
