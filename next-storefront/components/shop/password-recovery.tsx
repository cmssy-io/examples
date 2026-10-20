"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  forgotPasswordAction,
  resetPasswordAction,
} from "@/lib/actions/account";
import { actionErrorMessage } from "@/lib/action-errors";
import { fill } from "@/lib/shop-copy";
import { useShopCopy } from "./locale-ui";
import styles from "./account-settings.module.css";

export function ForgotPasswordForm({ accountHref }: { accountHref: string }) {
  const copy = useShopCopy();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(
      new FormData(event.currentTarget).get("email") ?? "",
    ).trim();
    setPending(true);
    setError(null);
    try {
      const result = await forgotPasswordAction(email);
      if (!result.ok) throw new Error(result.message);
      setSentTo(email);
    } catch (cause) {
      setError(actionErrorMessage(cause, copy.accountActionFailed));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.section} onSubmit={onSubmit}>
      <h1 className={styles.title}>{copy.forgotPasswordTitle}</h1>
      {sentTo ? (
        <p>{fill(copy.resetLinkSent, { email: sentTo })}</p>
      ) : (
        <>
          <p className="shop-muted">{copy.forgotPasswordLead}</p>
          <label className="shop-label" htmlFor="email">
            {copy.email}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="shop-input"
          />
          {error ? <p className="shop-error">{error}</p> : null}
          <div className={styles.actions}>
            <button
              type="submit"
              className="shop-btn shop-btn-primary"
              disabled={pending}
            >
              {pending ? copy.accountSaving : copy.sendResetLink}
            </button>
          </div>
        </>
      )}
      <Link href={accountHref}>{copy.goToSignIn}</Link>
    </form>
  );
}

export function ResetPasswordForm({
  token,
  accountHref,
}: {
  token: string | null;
  accountHref: string;
}) {
  const copy = useShopCopy();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(
    token ? null : copy.linkInvalid,
  );
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const newPassword = String(
      new FormData(event.currentTarget).get("new-password") ?? "",
    );
    setPending(true);
    setError(null);
    try {
      const result = await resetPasswordAction(token, newPassword);
      if (!result.ok) throw new Error(result.message || copy.linkInvalid);
      setDone(true);
    } catch (cause) {
      setError(actionErrorMessage(cause, copy.linkInvalid));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.section} onSubmit={onSubmit}>
      <h1 className={styles.title}>{copy.resetPasswordTitle}</h1>
      {done ? (
        <p>{copy.passwordReset}</p>
      ) : (
        <>
          <label className="shop-label" htmlFor="new-password">
            {copy.newPassword}
          </label>
          <input
            id="new-password"
            name="new-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="shop-input"
            disabled={!token}
          />
          {error ? <p className="shop-error">{error}</p> : null}
          <div className={styles.actions}>
            <button
              type="submit"
              className="shop-btn shop-btn-primary"
              disabled={pending || !token}
            >
              {pending ? copy.accountSaving : copy.resetPassword}
            </button>
          </div>
        </>
      )}
      <Link href={accountHref}>{copy.goToSignIn}</Link>
    </form>
  );
}
