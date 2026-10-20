import { MEMBER_MODEL_SLUG } from "@/cmssy.config";
import type { AuthTokenResult } from "@/lib/cmssy/access-claims";
import { authRequest } from "@/lib/cmssy/auth-request";
import { memberRequest } from "@/lib/cmssy/member-request";
import type { MemberProfile } from "@/graphql/types";
import type { AuthResult } from "@/services/auth";
import {
  MemberChangePasswordDocument,
  MemberConfirmLoginChangeDocument,
  MemberDeleteAccountDocument,
  MemberRequestLoginChangeDocument,
  MemberUpdateProfileDocument,
  MyProfileDocument,
  SiteMemberForgotPasswordDocument,
  SiteMemberResetPasswordDocument,
  SiteMemberVerifyEmailDocument,
} from "@/graphql/generated/graphql";

const NOT_SIGNED_IN = "Sign in to manage your account.";

function signedIn<R>(data: R | null): R {
  if (!data) throw new Error(NOT_SIGNED_IN);
  return data;
}

export async function getMyProfile(): Promise<MemberProfile | null> {
  const data = await memberRequest(MyProfileDocument, (workspaceId) => ({
    workspaceId,
  }));
  return data?.account.profile ?? null;
}

export async function updateMyProfile(
  fields: Record<string, unknown>,
): Promise<MemberProfile> {
  const data = await memberRequest(MemberUpdateProfileDocument, () => ({
    fields,
  }));
  return signedIn(data).siteMember.updateProfile;
}

export async function changeMyPassword(
  currentPassword: string,
  newPassword: string,
): Promise<AuthTokenResult> {
  const data = await memberRequest(MemberChangePasswordDocument, () => ({
    currentPassword,
    newPassword,
  }));
  return signedIn(data).siteMember.changePassword;
}

export async function requestLoginChange(
  newLogin: string,
  currentPassword: string,
): Promise<AuthResult> {
  const data = await memberRequest(MemberRequestLoginChangeDocument, () => ({
    newLogin,
    currentPassword,
  }));
  return signedIn(data).siteMember.requestLoginChange;
}

export function confirmLoginChange(token: string): Promise<AuthResult> {
  return authRequest(MemberConfirmLoginChangeDocument, { token }).then(
    (data) => data.siteMember.confirmLoginChange,
  );
}

export function verifyEmail(token: string): Promise<AuthResult> {
  return authRequest(SiteMemberVerifyEmailDocument, { token }).then(
    (data) => data.siteMember.verifyEmail,
  );
}

export function forgotPassword(identity: string): Promise<AuthResult> {
  return authRequest(SiteMemberForgotPasswordDocument, {
    modelSlug: MEMBER_MODEL_SLUG,
    identity,
  }).then((data) => data.siteMember.forgotPassword);
}

export function resetPassword(
  token: string,
  newPassword: string,
): Promise<AuthResult> {
  return authRequest(SiteMemberResetPasswordDocument, {
    token,
    newPassword,
  }).then((data) => data.siteMember.resetPassword);
}

export async function deleteMyAccount(
  currentPassword: string,
): Promise<AuthResult> {
  const data = await memberRequest(MemberDeleteAccountDocument, () => ({
    currentPassword,
  }));
  return signedIn(data).siteMember.deleteAccount;
}
