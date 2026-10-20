"use client";

import Link from "next/link";
import { useState } from "react";
import { confirmEmailChangeAction } from "@/lib/actions/account";
import { actionErrorMessage } from "@/lib/action-errors";
import { useShopCopy } from "./locale-ui";
import styles from "./account-settings.module.css";

export function ConfirmEmailChange({
  token,
  accountHref,
}: {
  token: string | null;
  accountHref: string;
}) {
  const copy = useShopCopy();
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<"done" | string | null>(
    token ? null : copy.emailConfirmFailed,
  );

  async function confirm() {
    if (!token) return;
    setPending(true);
    try {
      const result = await confirmEmailChangeAction(token);
      setOutcome(result.ok ? "done" : copy.emailConfirmFailed);
    } catch (cause) {
      setOutcome(actionErrorMessage(cause, copy.emailConfirmFailed));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.section}>
      <h1 className={styles.title}>{copy.emailConfirmTitle}</h1>
      {outcome === "done" ? (
        <p>{copy.emailConfirmed}</p>
      ) : outcome ? (
        <p className="shop-error">{outcome}</p>
      ) : (
        <>
          <p className="shop-muted">{copy.emailConfirmIntro}</p>
          <div className={styles.actions}>
            <button
              type="button"
              className="shop-btn shop-btn-primary"
              disabled={pending}
              onClick={confirm}
            >
              {pending ? copy.accountSaving : copy.confirmEmail}
            </button>
          </div>
        </>
      )}
      <Link href={accountHref}>{copy.backToAccount}</Link>
    </div>
  );
}
