"use client";

import { useState } from "react";
import { payOrderAction } from "@/lib/actions/cart";
import { actionErrorMessage } from "@/lib/action-errors";
import { useShopCopy } from "./locale-ui";

export function PayOrderButton({
  orderId,
  token,
}: {
  orderId: string;
  token: string;
}) {
  const copy = useShopCopy();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setPending(true);
    setError(null);
    try {
      const result = await payOrderAction(orderId, token);
      if ("error" in result) throw new Error(result.error);
      window.location.assign(result.url);
    } catch (cause) {
      setError(actionErrorMessage(cause, copy.checkoutFailed));
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="shop-btn shop-btn-primary"
        disabled={pending}
        onClick={pay}
      >
        {pending ? copy.redirectingToPayment : copy.payNow}
      </button>
      {error ? <span className="shop-error">{error}</span> : null}
    </>
  );
}
