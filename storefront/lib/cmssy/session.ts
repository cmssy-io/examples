import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  openSession,
  sealSession,
  sessionCookieOptions,
  type SessionPayload,
  type SessionUser,
} from "@/lib/cmssy/session-crypto";

export {
  SESSION_COOKIE,
  CART_COOKIE,
  isAccessExpired,
  openSession,
  sealSession,
  sessionCookieOptions,
  type SessionPayload,
  type SessionUser,
} from "@/lib/cmssy/session-crypto";

export async function readSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  return raw ? openSession(raw) : null;
}

export async function writeSession(payload: SessionPayload): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await sealSession(payload), sessionCookieOptions());
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
}

export async function currentUser(): Promise<SessionUser | null> {
  const session = await readSession();
  return session?.user ?? null;
}
