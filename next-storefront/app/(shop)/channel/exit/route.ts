import { NextResponse, type NextRequest } from "next/server";
import { CHANNEL_COOKIE } from "@/lib/channel";
import { channelCookieOptions } from "@/lib/cmssy/channel-cookie";
import { localePath, shopLocale } from "@/lib/locale";

export async function GET(request: NextRequest) {
  const { locale, defaultLocale } = await shopLocale();
  const home = new URL(localePath("/", locale, defaultLocale), request.url);
  const response = NextResponse.redirect(home, 303);
  response.cookies.set(CHANNEL_COOKIE, "", {
    ...channelCookieOptions(),
    maxAge: 0,
  });
  return response;
}
