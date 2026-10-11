import { cookies } from "next/headers";
import { mintCartToken } from "@/lib/cmssy/cart-token";
import { CART_COOKIE, sessionCookieOptions } from "@/lib/cmssy/session-crypto";

export async function readCartToken(): Promise<string> {
  const jar = await cookies();
  return jar.get(CART_COOKIE)?.value ?? "";
}

export async function ensureCartToken(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(CART_COOKIE)?.value;
  if (existing) return existing;
  const minted = mintCartToken();
  jar.set(CART_COOKIE, minted, sessionCookieOptions());
  return minted;
}

export async function clearCartToken(): Promise<void> {
  const jar = await cookies();
  jar.set(CART_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
}
