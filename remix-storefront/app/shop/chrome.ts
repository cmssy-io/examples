import {
  resolveCmssyLayoutSlot,
  resolveEditorLayoutBlockData,
  type CmssyLayoutSlotResolution,
  type EditorBlockData,
} from "@cmssy/react";
import { cmssy } from "../../cmssy.config";
import { blocks } from "../cmssy/blocks";
import { ttlCache } from "../lib/ttl-cache";

export interface ShopChrome {
  locale: string;
  defaultLocale: string;
  enabledLocales: string[];
  layouts: CmssyLayoutSlotResolution["groups"];
  header: EditorBlockData;
  footer: EditorBlockData;
}

const cachedChrome = ttlCache<ShopChrome>(60_000);

async function buildChrome(locale: string): Promise<ShopChrome> {
  const slot = await resolveCmssyLayoutSlot(cmssy, {
    region: "header",
    blocks,
    editMode: false,
    path: [],
    locale,
    retry: "interactive",
  });
  const [header, footer] = await Promise.all(
    (["header", "footer"] as const).map((region) =>
      resolveEditorLayoutBlockData({
        groups: slot.groups,
        blocks,
        region,
        page: slot.page,
        locale: slot.locale,
        defaultLocale: slot.defaultLocale,
        enabledLocales: slot.enabledLocales,
        config: cmssy,
      }),
    ),
  );
  return {
    locale: slot.locale,
    defaultLocale: slot.defaultLocale,
    enabledLocales: slot.enabledLocales,
    layouts: slot.groups,
    header,
    footer,
  };
}

export function loadShopChrome(locale: string): Promise<ShopChrome> {
  return cachedChrome(locale, () => buildChrome(locale));
}
