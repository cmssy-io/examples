"use server";

import { clearChannelCookie } from "@/lib/cmssy/channel-cookie";

export async function leaveChannelAction(): Promise<void> {
  await clearChannelCookie();
}
