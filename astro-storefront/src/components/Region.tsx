import { CmssyBlock, buildBlockContext, buildBlockMap } from "@cmssy/react";
import type { CmssyLayoutGroup } from "@cmssy/core";
import { blocks } from "../cmssy/blocks";

/**
 * One layout region - the header or the footer - rendered the same way the page
 * body is: React on the server, no client JS.
 *
 * The SDK has an async component that does this in one call, and Astro cannot
 * render it: an async React component is a server-component feature, and this
 * integration renders through react-dom/server. So the data is resolved in the
 * page's frontmatter, exactly as it already is for the page's own blocks, and
 * what arrives here is synchronous.
 */
export function Region({
  groups,
  region,
  locale,
  defaultLocale,
  enabledLocales,
  blockData,
  blockContent,
}: {
  groups: CmssyLayoutGroup[];
  region: string;
  locale: string;
  defaultLocale: string;
  enabledLocales: string[];
  blockData: Record<string, unknown>;
  blockContent: Record<string, Record<string, unknown>>;
}) {
  const group = groups.find((candidate) => candidate.region === region);
  const layoutBlocks = (group?.blocks ?? [])
    .filter((block) => block.isActive !== false)
    .slice()
    .sort((a, b) => a.order - b.order);

  if (layoutBlocks.length === 0) return null;

  const blockMap = buildBlockMap(blocks);
  const context = buildBlockContext(locale, defaultLocale, enabledLocales);

  return (
    <>
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
    </>
  );
}
