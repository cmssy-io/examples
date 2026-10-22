import { channelRefusal, checkoutErrorReason } from "@cmssy/core";
import type { ShopCopy } from "@/lib/shop-copy";

export type CartReview = "BUYER_CHANGED" | "TAX_TREATMENT_CHANGED";

export interface CartFailure {
  error: string;
  /** The channel refused the visitor's price access - send them to sign in. */
  signIn?: boolean;
  /** The channel cookie names a channel the workspace no longer has. */
  leaveChannel?: boolean;
  /** The cart was re-priced under the visitor - read it again before checkout. */
  review?: CartReview;
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Commerce request failed";
}

export function cartFailure(err: unknown, copy: ShopCopy): CartFailure {
  const refusal = channelRefusal(err);
  if (refusal?.reason === "UNKNOWN_CHANNEL") {
    return { error: copy.channelUnavailable, leaveChannel: true };
  }
  if (refusal?.reason === "MEMBERS_ONLY") {
    return { error: copy.channelSignInToBuy, signIn: true };
  }
  if (refusal?.reason === "COMPANY_MEMBERS_ONLY") {
    return { error: copy.channelCompanyOnly, signIn: true };
  }

  const reason = checkoutErrorReason(err);
  if (reason === "BUYER_CHANGED" || reason === "TAX_TREATMENT_CHANGED") {
    return { error: copy.pricesUpdatedReview, review: reason };
  }

  return { error: errorMessage(err) };
}
