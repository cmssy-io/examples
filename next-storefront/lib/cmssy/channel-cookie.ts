import { cookies } from "next/headers";
import {
  CHANNEL_COOKIE,
  CHANNEL_COOKIE_MAX_AGE,
  findChannel,
  type ShopChannel,
} from "@/lib/channel";
import { sessionCookieOptions } from "@/lib/cmssy/session-crypto";

export async function readChannelCookie(): Promise<ShopChannel | null> {
  const jar = await cookies();
  return findChannel(jar.get(CHANNEL_COOKIE)?.value);
}

export async function clearChannelCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(CHANNEL_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
}

export function channelCookieOptions() {
  return { ...sessionCookieOptions(), maxAge: CHANNEL_COOKIE_MAX_AGE };
}
