import type { CmssyPriceDisplayMode } from "@cmssy/core";

export const CHANNEL_COOKIE = "cmssy-channel";
export const CHANNEL_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

export type ChannelPriceAccess = "PUBLIC" | "MEMBERS" | "COMPANY_MEMBERS";

export interface ShopChannel {
  key: string;
  name: string;
  priceAccess: ChannelPriceAccess;
  displayMode: CmssyPriceDisplayMode;
}

// The sales channels this storefront offers an entry link for. Each key must
// exist as a sales channel in the workspace; the API owns the prices, access
// and display mode, these copies only label the banner and the links.
export const SHOP_CHANNELS: readonly ShopChannel[] = [
  {
    key: "workshop",
    name: "Service & Repair Workshops",
    priceAccess: "MEMBERS",
    displayMode: "net",
  },
  {
    key: "distributor",
    name: "Distributors & Resellers",
    priceAccess: "COMPANY_MEMBERS",
    displayMode: "net",
  },
  {
    key: "plant",
    name: "Plant Maintenance (MRO)",
    priceAccess: "PUBLIC",
    displayMode: "net",
  },
  {
    key: "express",
    name: "Express 24h",
    priceAccess: "PUBLIC",
    displayMode: "gross",
  },
];

export function findChannel(
  key: string | null | undefined,
): ShopChannel | null {
  return SHOP_CHANNELS.find((channel) => channel.key === key) ?? null;
}

export function channelEntryPath(channel: ShopChannel): string {
  return `/channel/${encodeURIComponent(channel.key)}`;
}

export const CHANNEL_EXIT_PATH = "/channel/exit";
