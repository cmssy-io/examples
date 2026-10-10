import {
  CmssyBlock,
  buildBlockContext,
  buildBlockMap,
  type BlockDefinition,
} from "@cmssy/react";
import type { CmssyLayoutGroup } from "@cmssy/core";
import { LocaleProvider, type ShopLocation } from "./shop/locale-ui";

export interface RegionProps {
  blocks: BlockDefinition[];
  groups: CmssyLayoutGroup[];
  region: string;
  location: ShopLocation;
  blockData: Record<string, unknown>;
  blockContent: Record<string, Record<string, unknown>>;
}

export function Region({
  blocks,
  groups,
  region,
  location,
  blockData,
  blockContent,
}: RegionProps) {
  const group = groups.find((candidate) => candidate.region === region);
  const layoutBlocks = (group?.blocks ?? [])
    .filter((block) => block.isActive !== false)
    .slice()
    .sort((a, b) => a.order - b.order);

  if (layoutBlocks.length === 0) return null;

  const { locale, defaultLocale, locales } = location;
  const blockMap = buildBlockMap(blocks);
  const context = buildBlockContext(locale, defaultLocale, locales);

  return (
    <LocaleProvider value={location}>
      {layoutBlocks.map((block) => (
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
