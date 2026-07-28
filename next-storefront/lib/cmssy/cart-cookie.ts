import { cookies } from "next/headers";
import { CART_COOKIE, sessionCookieOptions } from "@/lib/cmssy/session-crypto";

export async function readCartToken(): Promise<string> {
  const jar = await cookies();
  return jar.get(CART_COOKIE)?.value ?? "";
}

export async function clearCartToken(): Promise<void> {
  const jar = await cookies();
  jar.set(CART_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
}
