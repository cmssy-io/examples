"use server";

import { CmssyGraphqlError } from "@cmssy/core";
import type { ReturnLineInput } from "@/graphql/generated/graphql";
import { requestReturn } from "@/services/orders";
import { shopLocale } from "@/lib/locale";
import { copyFor, type ShopCopy } from "@/lib/shop-copy";

export type ReturnRequestResult = { requested: true } | { error: string };

const REFUSALS: Record<string, keyof ShopCopy> = {
  RETURN_WINDOW_CLOSED: "returnWindowClosed",
  NOT_RETURNABLE: "returnNotReturnable",
  ORDER_CANCELED: "orderCanceled",
};

function refusalReason(error: CmssyGraphqlError): string | undefined {
  for (const entry of error.errors) {
    const reason = (entry.extensions as { reason?: unknown } | undefined)
      ?.reason;
    if (typeof reason === "string") return reason;
  }
  return undefined;
}

export async function requestReturnAction(input: {
  orderId: string;
  accessToken?: string;
  lines: ReturnLineInput[];
  note?: string;
}): Promise<ReturnRequestResult> {
  const { locale } = await shopLocale();
  const copy = copyFor(locale);
  const lines = input.lines.filter((line) => line.quantity > 0);
  if (lines.length === 0) return { error: copy.returnPickItems };
  try {
    await requestReturn({ ...input, lines });
    return { requested: true };
  } catch (error) {
    if (error instanceof CmssyGraphqlError) {
      const key = REFUSALS[refusalReason(error) ?? ""];
      return { error: key ? copy[key] : error.message };
    }
    return { error: copy.returnRequestFailed };
  }
}
