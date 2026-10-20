"use client";

import Link from "next/link";
import { useState } from "react";
import {
  confirmLoginChangeAction,
  verifyEmailAction,
} from "@/lib/actions/account";
import { actionErrorMessage } from "@/lib/action-errors";
import type { ShopCopy } from "@/lib/shop-copy";
import { useShopCopy } from "./locale-ui";
import styles from "./account-settings.module.css";

const CONFIRMATIONS = {
  login: {
    run: confirmLoginChangeAction,
    title: "loginConfirmTitle",
    intro: "loginConfirmIntro",
    button: "confirmLogin",
    done: "loginConfirmed",
  },
  verify: {
    run: verifyEmailAction,
    title: "verifyEmailTitle",
    intro: "verifyEmailIntro",
    button: "verifyEmail",
    done: "emailVerified",
  },
} satisfies Record<
  string,
  {
    run: typeof verifyEmailAction;
    title: keyof ShopCopy;
    intro: keyof ShopCopy;
    button: keyof ShopCopy;
    done: keyof ShopCopy;
  }
>;

export type TokenConfirmationKind = keyof typeof CONFIRMATIONS;

export function TokenConfirmation({
  kind,
  token,
  accountHref,
}: {
  kind: TokenConfirmationKind;
  token: string | null;
  accountHref: string;
}) {
  const copy = useShopCopy();
  const confirmation = CONFIRMATIONS[kind];
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<"done" | string | null>(
    token ? null : copy.linkInvalid,
  );

  async function confirm() {
    if (!token) return;
    setPending(true);
    try {
      const result = await confirmation.run(token);
      setOutcome(result.ok ? "done" : result.message || copy.linkInvalid);
    } catch (cause) {
      setOutcome(actionErrorMessage(cause, copy.linkInvalid));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.section}>
      <h1 className={styles.title}>{copy[confirmation.title]}</h1>
      {outcome === "done" ? (
        <p>{copy[confirmation.done]}</p>
      ) : outcome ? (
        <p className="shop-error">{outcome}</p>
      ) : (
        <>
          <p className="shop-muted">{copy[confirmation.intro]}</p>
          <div className={styles.actions}>
            <button
              type="button"
              className="shop-btn shop-btn-primary"
              disabled={pending}
              onClick={confirm}
            >
              {pending ? copy.accountSaving : copy[confirmation.button]}
            </button>
          </div>
        </>
      )}
      <Link href={accountHref}>{copy.backToAccount}</Link>
    </div>
  );
}
