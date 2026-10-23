"use server";

import { CmssyGraphqlError } from "@cmssy/core";
import { submitForm } from "@/services/forms";

export interface FormActionResult {
  ok: boolean;
  message: string | null;
  redirectUrl: string | null;
}

export async function submitFormAction(
  formId: string,
  data: Record<string, unknown>,
  website: string,
): Promise<FormActionResult> {
  try {
    const result = await submitForm(String(formId), data, String(website));
    return {
      ok: result.success,
      message: result.message || null,
      redirectUrl: result.redirectUrl ?? null,
    };
  } catch (error) {
    if (error instanceof CmssyGraphqlError) {
      return { ok: false, message: error.message, redirectUrl: null };
    }
    throw error;
  }
}
