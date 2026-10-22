import { NextResponse, type NextRequest } from "next/server";
import { CHANNEL_COOKIE, findChannel } from "@/lib/channel";
import { channelCookieOptions } from "@/lib/cmssy/channel-cookie";
import { localePath, shopLocale } from "@/lib/locale";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  const channel = findChannel(key);
  if (!channel) return new NextResponse(null, { status: 404 });

  const { locale, defaultLocale } = await shopLocale();
  const home = new URL(localePath("/", locale, defaultLocale), request.url);
  const response = NextResponse.redirect(home, 303);
  response.cookies.set(CHANNEL_COOKIE, channel.key, channelCookieOptions());
  return response;
}
