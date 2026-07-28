"use server";

import * as authService from "@/services/auth";
import { toSessionPayload } from "@/lib/cmssy/access-claims";
import {
  clearSession,
  readSession,
  writeSession,
  type SessionUser,
} from "@/lib/cmssy/session";

export interface AuthActionResult {
  ok: boolean;
  message?: string;
  user?: SessionUser;
}

export async function signInAction(
  identity: string,
  password: string,
): Promise<AuthActionResult> {
  const result = await authService.signIn(String(identity), String(password));
  const payload = toSessionPayload(result);
  if (!payload) {
    return { ok: false, message: result.message || "Sign in failed." };
  }
  await writeSession(payload);
  return { ok: true, user: payload.user };
}

export async function registerAction(
  identity: string,
  password: string,
  fields: Record<string, unknown>,
): Promise<AuthActionResult> {
  const result = await authService.register(
    String(identity),
    String(password),
    fields,
  );
  return { ok: result.success, message: result.message };
}

export async function signOutAction(): Promise<{ ok: true }> {
  const session = await readSession();

  await clearSession();
  if (session) await authService.signOut(session.refreshToken);
  return { ok: true };
}
