import type { SessionUser } from "../cmssy/session-crypto";

export interface AuthActionResult {
  ok: boolean;
  message?: string;
  user?: SessionUser;
}

async function post(payload: Record<string, unknown>): Promise<AuthActionResult> {
  const response = await fetch("/api/auth", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Auth request failed (${response.status})`);
  return (await response.json()) as AuthActionResult;
}

export function signInAction(
  identity: string,
  password: string,
): Promise<AuthActionResult> {
  return post({ intent: "signIn", identity, password });
}

export function registerAction(
  identity: string,
  password: string,
  fields: Record<string, unknown>,
): Promise<AuthActionResult> {
  return post({ intent: "register", identity, password, fields });
}

export function signOutAction(): Promise<AuthActionResult> {
  return post({ intent: "signOut" });
}
