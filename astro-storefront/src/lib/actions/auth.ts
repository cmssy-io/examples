import { actions } from "astro:actions";
import type { SessionUser } from "../cmssy/session-crypto";
import { unwrap } from "./unwrap";

export function signInAction(
  identity: string,
  password: string,
): Promise<SessionUser> {
  return actions.auth
    .signIn({ identity, password })
    .then(unwrap)
    .then((result) => result.user);
}

export async function registerAction(
  identity: string,
  password: string,
  fields: Record<string, unknown>,
): Promise<void> {
  await actions.auth.register({ identity, password, fields }).then(unwrap);
}

export async function signOutAction(): Promise<void> {
  await actions.auth.signOut().then(unwrap);
}
