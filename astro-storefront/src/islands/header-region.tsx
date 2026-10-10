import type { CmssyLayoutGroup } from "@cmssy/core";
import { layoutBlocks } from "../cmssy/layout-blocks";
import { Region } from "../components/Region";
import { shopIsland } from "../components/shop/island";
import { useShopLocation } from "../components/shop/locale-ui";

function HeaderRegion({
  groups,
  blockData,
  blockContent,
}: {
  groups: CmssyLayoutGroup[];
  blockData: Record<string, unknown>;
  blockContent: Record<string, Record<string, unknown>>;
}) {
  return (
    <Region
      blocks={layoutBlocks}
      groups={groups}
      region="header"
      location={useShopLocation()}
      blockData={blockData}
      blockContent={blockContent}
    />
  );
}

export const HeaderRegionIsland = shopIsland(HeaderRegion);
