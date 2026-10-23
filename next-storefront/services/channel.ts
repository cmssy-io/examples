import { cache } from "react";
import {
  channelRefusal,
  createCmssyClient,
  getPublicPrices,
  type CmssyPriceDisplayMode,
  type CmssyPriceWithheldReason,
} from "@cmssy/core";
import { cmssy } from "@/cmssy.config";
import type { ShopChannel } from "@/lib/channel";
import { readChannelCookie } from "@/lib/cmssy/channel-cookie";
import { retryMode } from "@/lib/cmssy/retry-mode";
import { ttlCache } from "@/lib/ttl-cache";

const client = createCmssyClient(cmssy);

const PROBE_TTL_MS = 60_000;

export type ChannelProbe =
  | { known: false }
  | {
      known: true;
      /** Set only when the channel sells in one of the additional currencies. */
      currency: string | null;
      displayMode: CmssyPriceDisplayMode;
      priceWithheld: CmssyPriceWithheldReason | null;
      nextChangeAt: string | null;
    };

export interface ActiveChannel {
  channel: ShopChannel | null;
  /** The cookie names a channel the workspace no longer has. */
  gone: boolean;
  probe: ChannelProbe | null;
}

const probeCache = ttlCache<ChannelProbe>(PROBE_TTL_MS);

// The anonymous price read with no items: it validates the key and returns the
// channel's anonymous access and dated-list deadline, the same for every
// visitor, so it is safe to share across requests.
function probeChannel(key: string): Promise<ChannelProbe> {
  return probeCache(key, async () => {
    const workspaceId = await client.resolveWorkspaceId({ retry: retryMode() });
    try {
      const result = await getPublicPrices(cmssy, [], {
        workspaceId,
        channel: key,
        retry: retryMode(),
      });
      return {
        known: true,
        currency: result.currency,
        displayMode: result.displayMode,
        priceWithheld: result.priceWithheld,
        nextChangeAt: result.nextChangeAt,
      };
    } catch (error) {
      if (channelRefusal(error)?.reason === "UNKNOWN_CHANNEL") {
        return { known: false };
      }
      throw error;
    }
  });
}

export const activeChannel = cache(async (): Promise<ActiveChannel> => {
  const channel = await readChannelCookie();
  if (!channel) return { channel: null, gone: false, probe: null };
  const probe = await probeChannel(channel.key).catch((error: unknown) => {
    console.error("channel: probe failed", error);
    return null;
  });
  if (probe && !probe.known) return { channel: null, gone: true, probe };
  return { channel, gone: false, probe };
});

export async function activeChannelKey(): Promise<string | null> {
  return (await activeChannel()).channel?.key ?? null;
}
