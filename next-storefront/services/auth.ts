import { MEMBER_MODEL_SLUG } from "@/cmssy.config";
import type { AuthTokenResult } from "@/lib/cmssy/access-claims";
import { authRequest } from "@/lib/cmssy/auth-request";
import {
  SiteMemberLoginDocument,
  SiteMemberLogoutDocument,
  SiteMemberRefreshDocument,
  SiteMemberRegisterDocument,
} from "@/graphql/generated/graphql";

export interface AuthResult {
  success: boolean;
  message: string;
}

export function signIn(
  identity: string,
  password: string,
): Promise<AuthTokenResult> {
  return authRequest(
    SiteMemberLoginDocument,
    { input: { modelSlug: MEMBER_MODEL_SLUG, identity, password } },
  ).then((data) => data.siteMember.login);
}

export function register(
  identity: string,
  password: string,
  fields: Record<string, unknown>,
): Promise<AuthResult> {
  return authRequest(
    SiteMemberRegisterDocument,
    { input: { modelSlug: MEMBER_MODEL_SLUG, identity, password, fields } },
  ).then((data) => data.siteMember.register);
}

export function refreshTokens(refreshToken: string): Promise<AuthTokenResult> {
  return authRequest(
    SiteMemberRefreshDocument,
    { refreshToken },
  ).then((data) => data.siteMember.refresh);
}

export async function signOut(refreshToken: string): Promise<void> {
  await authRequest(
    SiteMemberLogoutDocument,
    { refreshToken },
  );
}
