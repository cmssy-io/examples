"use server";

import { CmssyGraphqlError } from "@cmssy/core";
import * as accountService from "@/services/account";
import { toSessionPayload } from "@/lib/cmssy/access-claims";
import { clearCartToken } from "@/lib/cmssy/cart-cookie";
import { clearSession, writeSession } from "@/lib/cmssy/session";

export interface AccountActionResult {
  ok: boolean;
  message?: string;
}

async function refused(
  run: () => Promise<AccountActionResult>,
): Promise<AccountActionResult> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof CmssyGraphqlError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}

export async function updateProfileAction(
  fields: Record<string, unknown>,
): Promise<AccountActionResult> {
  return refused(async () => {
    await accountService.updateMyProfile(fields);
    return { ok: true };
  });
}

export async function changePasswordAction(
  currentPassword: string,
  newPassword: string,
): Promise<AccountActionResult> {
  return refused(async () => {
    const result = await accountService.changeMyPassword(
      String(currentPassword),
      String(newPassword),
    );
    const payload = toSessionPayload(result);
    if (!payload) return { ok: false, message: result.message };
    await writeSession(payload);
    return { ok: true };
  });
}

export async function requestLoginChangeAction(
  newLogin: string,
  currentPassword: string,
): Promise<AccountActionResult> {
  return refused(async () => {
    const result = await accountService.requestLoginChange(
      String(newLogin),
      String(currentPassword),
    );
    return { ok: result.success, message: result.message };
  });
}

export async function confirmLoginChangeAction(
  token: string,
): Promise<AccountActionResult> {
  return refused(async () => {
    const result = await accountService.confirmLoginChange(String(token));
    return { ok: result.success, message: result.message };
  });
}

export async function verifyEmailAction(
  token: string,
): Promise<AccountActionResult> {
  return refused(async () => {
    const result = await accountService.verifyEmail(String(token));
    return { ok: result.success, message: result.message };
  });
}

export async function forgotPasswordAction(
  identity: string,
): Promise<AccountActionResult> {
  return refused(async () => {
    const result = await accountService.forgotPassword(String(identity));
    return { ok: result.success, message: result.message };
  });
}

export async function resetPasswordAction(
  token: string,
  newPassword: string,
): Promise<AccountActionResult> {
  return refused(async () => {
    const result = await accountService.resetPassword(
      String(token),
      String(newPassword),
    );
    return { ok: result.success, message: result.message };
  });
}

export async function deleteAccountAction(
  currentPassword: string,
): Promise<AccountActionResult> {
  return refused(async () => {
    const result = await accountService.deleteMyAccount(
      String(currentPassword),
    );
    if (!result.success) return { ok: false, message: result.message };
    await clearSession();
    await clearCartToken();
    return { ok: true };
  });
}
