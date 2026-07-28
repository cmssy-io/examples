import type { NextRequest } from "next/server";
import { toSessionPayload } from "@/lib/cmssy/access-claims";
import {
  SESSION_COOKIE,
  isAccessExpired,
  openSession,
  sealSession,
} from "@/lib/cmssy/session-crypto";
import { refreshTokens } from "@/services/auth";

export interface SessionRefresh {
  sealed: string;
}

export async function refreshMemberSession(
  request: NextRequest,
): Promise<SessionRefresh | null> {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const session = await openSession(raw);
  if (!session) return { sealed: "" };
  if (!isAccessExpired(session)) return null;

  let result;
  try {
    result = await refreshTokens(session.refreshToken);
  } catch {

    return null;
  }
  const payload = toSessionPayload(result);
  if (!payload) return { sealed: "" };
  return { sealed: await sealSession(payload) };
}
