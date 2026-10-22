import { CmssyGraphqlError } from "@cmssy/core";
import { describe, expect, it } from "vitest";
import { cartFailure } from "./cart-errors";
import { copyFor } from "./shop-copy";

const copy = copyFor("en");

function graphqlError(extensions: Record<string, unknown>): CmssyGraphqlError {
  return new CmssyGraphqlError("refused", [{ message: "refused", extensions }]);
}

describe("cartFailure", () => {
  it("leaves a channel the workspace does not have", () => {
    const failure = cartFailure(
      graphqlError({ code: "BAD_USER_INPUT", channel: "plant" }),
      copy,
    );
    expect(failure).toEqual({
      error: copy.channelUnavailable,
      leaveChannel: true,
    });
  });

  it("asks a guest to sign in on a members-only channel", () => {
    const failure = cartFailure(
      graphqlError({
        code: "UNAUTHORIZED",
        reason: "MEMBERS_ONLY",
        channel: "workshop",
      }),
      copy,
    );
    expect(failure).toEqual({ error: copy.channelSignInToBuy, signIn: true });
  });

  it("asks for a company account on a company-only channel", () => {
    const failure = cartFailure(
      graphqlError({
        code: "FORBIDDEN",
        reason: "COMPANY_MEMBERS_ONLY",
        channel: "distributor",
      }),
      copy,
    );
    expect(failure).toEqual({ error: copy.channelCompanyOnly, signIn: true });
  });

  it.each(["BUYER_CHANGED", "TAX_TREATMENT_CHANGED"] as const)(
    "asks the buyer to review the cart on %s",
    (reason) => {
      const failure = cartFailure(
        graphqlError({ code: "CONFLICT", reason }),
        copy,
      );
      expect(failure).toEqual({
        error: copy.pricesUpdatedReview,
        review: reason,
      });
    },
  );

  it("passes other checkout refusals through with their message", () => {
    const failure = cartFailure(
      new CmssyGraphqlError("Cart was repriced", [
        {
          message: "Cart was repriced",
          extensions: { code: "CONFLICT", reason: "CART_REPRICED" },
        },
      ]),
      copy,
    );
    expect(failure).toEqual({ error: "Cart was repriced" });
  });

  it("does not read a bad-input error without a channel as a channel refusal", () => {
    const failure = cartFailure(
      new CmssyGraphqlError("Quantity must be positive", [
        {
          message: "Quantity must be positive",
          extensions: { code: "BAD_USER_INPUT" },
        },
      ]),
      copy,
    );
    expect(failure).toEqual({ error: "Quantity must be positive" });
  });

  it("falls back to a generic message for a non-error throw", () => {
    expect(cartFailure("boom", copy)).toEqual({
      error: "Commerce request failed",
    });
  });
});
